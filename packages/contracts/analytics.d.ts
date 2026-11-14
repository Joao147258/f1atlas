/**
 * Declaração de tipos para o contrato de Analytics (analytics.mjs)
 */

export interface ConsentState {
  readonly DENIED: 'denied';
  readonly GRANTED: 'granted';
}

export declare const CONSENT_STATE: ConsentState;
export declare const FORBIDDEN_PROPERTY_TERMS: RegExp;

export interface AnalyticsClientOptions {
  enabled?: boolean;
  measurementId?: string;
  catalog?: Array<{ name: string; properties?: string[] }>;
  adapter?: {
    sentEvents?: Array<{ name: string; params: Record<string, unknown>; timestamp: number }>;
    send: (name: string, params: Record<string, unknown>) => boolean;
  };
}

export interface AnalyticsClient {
  getConsent: () => string;
  setConsent: (state: string) => void;
  isEnabled: () => boolean;
  trackEvent: (eventName: string, params?: Record<string, unknown>) => { status: string; reason?: string; event?: string; property?: string };
  getDispatchedEvents: () => Array<{ name: string; params: Record<string, unknown>; timestamp: number }>;
}

export declare function createAnalyticsClient(options?: AnalyticsClientOptions): AnalyticsClient;
