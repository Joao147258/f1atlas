/**
 * Contrato de Instrumentação e Desacoplamento de Analytics — F1Atlas
 * Não depende de gtag() global nem realiza chamadas de rede.
 */

export const CONSENT_STATE = Object.freeze({
  DENIED: 'denied',
  GRANTED: 'granted'
});

export const FORBIDDEN_PROPERTY_TERMS = /(?:email|phone|ip_address|cpf|password|token|secret|api_key|access_key|birthdate|@|bearer\s)/i;

/**
 * Cria o cliente centralizado de telemetria analítica desacoplado.
 * @param {Object} options
 * @param {boolean} options.enabled - Flag global de habilitação
 * @param {string} options.measurementId - ID do GA4 (G-XXXXXXXXXX)
 * @param {Array} options.catalog - Lista de eventos oficiais do events.catalog.json
 * @param {Object} [options.adapter] - Adaptador de destino (mock, GA4, console)
 */
export function createAnalyticsClient({
  enabled = false,
  measurementId = '',
  catalog = [],
  adapter = null
} = {}) {
  let currentConsent = CONSENT_STATE.DENIED;
  const eventMap = new Map((catalog || []).map(e => [e.name, e]));

  const clientAdapter = adapter || {
    sentEvents: [],
    send(name, params) {
      this.sentEvents.push({ name, params, timestamp: Date.now() });
      return true;
    }
  };

  return {
    getConsent() {
      return currentConsent;
    },

    setConsent(state) {
      if (state !== CONSENT_STATE.GRANTED && state !== CONSENT_STATE.DENIED) {
        throw new Error(`Estado de consentimento inválido: ${state}`);
      }
      currentConsent = state;
    },

    isEnabled() {
      return enabled === true && Boolean(measurementId);
    },

    trackEvent(eventName, params = {}) {
      // 1. Verificação de flag global
      if (!enabled) {
        return { status: 'skipped', reason: 'analytics_disabled' };
      }

      // 2. Verificação de Measurement ID
      if (!measurementId || !/^G-[A-Z0-9]{4,15}$/.test(measurementId)) {
        return { status: 'skipped', reason: 'missing_or_invalid_measurement_id' };
      }

      // 3. Verificação de Consentimento estrito (Basic Consent Mode)
      if (currentConsent !== CONSENT_STATE.GRANTED) {
        return { status: 'blocked', reason: 'consent_denied' };
      }

      // 4. Validação de catálogo de eventos
      const catalogEntry = eventMap.get(eventName);
      if (!catalogEntry) {
        return { status: 'error', reason: 'unrecognized_event', event: eventName };
      }

      // 5. Validação de privacidade e propriedades permitidas
      const allowedProperties = new Set(catalogEntry.properties || []);
      for (const [key, val] of Object.entries(params)) {
        if (FORBIDDEN_PROPERTY_TERMS.test(key) || FORBIDDEN_PROPERTY_TERMS.test(String(val))) {
          return { status: 'error', reason: 'sensitive_data_detected', property: key, event: eventName };
        }
        if (!allowedProperties.has(key)) {
          return { status: 'error', reason: 'unauthorized_property', property: key, event: eventName };
        }
      }

      // 6. Despacho desacoplado para o adapter
      clientAdapter.send(eventName, params);
      return { status: 'dispatched', event: eventName };
    },

    getDispatchedEvents() {
      return clientAdapter.sentEvents ? [...clientAdapter.sentEvents] : [];
    }
  };
}
