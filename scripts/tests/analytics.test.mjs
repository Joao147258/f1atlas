import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT } from '../lib/workspace.mjs';
import {
  createAnalyticsClient,
  CONSENT_STATE,
  FORBIDDEN_PROPERTY_TERMS
} from '../../packages/contracts/analytics.mjs';

const catalogPath = path.join(PROJECT_ROOT, 'docs/analytics/events.catalog.json');
const catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

describe('Contrato Centralizado de Analytics (SPEC-AN-001)', () => {
  it('inicializa com consentimento negado por padrão (Basic Consent Mode)', () => {
    const client = createAnalyticsClient({
      enabled: true,
      measurementId: 'G-1234567890',
      catalog: catalogData.events
    });

    assert.equal(client.getConsent(), CONSENT_STATE.DENIED);
    assert.equal(client.isEnabled(), true);
  });

  it('rejeita valores inválidos de consentimento', () => {
    const client = createAnalyticsClient({ catalog: catalogData.events });
    assert.throws(() => client.setConsent('maybe'), /Estado de consentimento inválido/);
  });

  it('bloqueia envio se analytics estiver desabilitado', () => {
    const client = createAnalyticsClient({
      enabled: false,
      measurementId: 'G-1234567890',
      catalog: catalogData.events
    });
    client.setConsent(CONSENT_STATE.GRANTED);

    const res = client.trackEvent('season_selected', { season_year: '2025', entry_point: 'calendar' });
    assert.deepEqual(res, { status: 'skipped', reason: 'analytics_disabled' });
  });

  it('bloqueia envio se measurementId estiver ausente ou em formato inválido', () => {
    const clientNoId = createAnalyticsClient({
      enabled: true,
      measurementId: '',
      catalog: catalogData.events
    });
    clientNoId.setConsent(CONSENT_STATE.GRANTED);
    assert.deepEqual(
      clientNoId.trackEvent('season_selected', { season_year: '2025', entry_point: 'calendar' }),
      { status: 'skipped', reason: 'missing_or_invalid_measurement_id' }
    );

    const clientBadId = createAnalyticsClient({
      enabled: true,
      measurementId: 'UA-123456-1', // Formato antigo não GA4
      catalog: catalogData.events
    });
    clientBadId.setConsent(CONSENT_STATE.GRANTED);
    assert.deepEqual(
      clientBadId.trackEvent('season_selected', { season_year: '2025', entry_point: 'calendar' }),
      { status: 'skipped', reason: 'missing_or_invalid_measurement_id' }
    );
  });

  it('bloqueia envio quando consentimento for denied (padrão inicial)', () => {
    const client = createAnalyticsClient({
      enabled: true,
      measurementId: 'G-TEST123456',
      catalog: catalogData.events
    });

    const res = client.trackEvent('grand_prix_viewed', { season_year: '2025', round_number: '01', circuit_id: 'bahrain' });
    assert.deepEqual(res, { status: 'blocked', reason: 'consent_denied' });
    assert.equal(client.getDispatchedEvents().length, 0);
  });

  it('despacha evento com sucesso quando consentimento for granted', () => {
    const customEvents = [];
    const client = createAnalyticsClient({
      enabled: true,
      measurementId: 'G-TEST123456',
      catalog: catalogData.events,
      adapter: {
        send(name, params) {
          customEvents.push({ name, params });
        }
      }
    });

    client.setConsent(CONSENT_STATE.GRANTED);
    const res = client.trackEvent('season_selected', { season_year: '2025', entry_point: 'calendar' });

    assert.deepEqual(res, { status: 'dispatched', event: 'season_selected' });
    assert.equal(customEvents.length, 1);
    assert.equal(customEvents[0].name, 'season_selected');
    assert.equal(customEvents[0].params.season_year, '2025');
    assert.equal(customEvents[0].params.entry_point, 'calendar');
  });

  it('revoga permissão de envio imediatamente ao alterar consentimento para denied', () => {
    const client = createAnalyticsClient({
      enabled: true,
      measurementId: 'G-TEST123456',
      catalog: catalogData.events
    });

    client.setConsent(CONSENT_STATE.GRANTED);
    const res1 = client.trackEvent('season_selected', { season_year: '2025', entry_point: 'home' });
    assert.equal(res1.status, 'dispatched');

    // Revogação
    client.setConsent(CONSENT_STATE.DENIED);
    const res2 = client.trackEvent('season_selected', { season_year: '2025', entry_point: 'home' });
    assert.deepEqual(res2, { status: 'blocked', reason: 'consent_denied' });
  });

  it('rejeita evento não constante do catálogo oficial', () => {
    const client = createAnalyticsClient({
      enabled: true,
      measurementId: 'G-TEST123456',
      catalog: catalogData.events
    });
    client.setConsent(CONSENT_STATE.GRANTED);

    const res = client.trackEvent('unregistered_custom_event', { foo: 'bar' });
    assert.deepEqual(res, {
      status: 'error',
      reason: 'unrecognized_event',
      event: 'unregistered_custom_event'
    });
  });

  it('rejeita propriedade não permitida pelo catálogo para o evento', () => {
    const client = createAnalyticsClient({
      enabled: true,
      measurementId: 'G-TEST123456',
      catalog: catalogData.events
    });
    client.setConsent(CONSENT_STATE.GRANTED);

    // season_selected só aceita season_year e entry_point
    const res = client.trackEvent('season_selected', {
      season_year: '2025',
      entry_point: 'standings',
      unauthorized_prop: 'val'
    });

    assert.deepEqual(res, {
      status: 'error',
      reason: 'unauthorized_property',
      property: 'unauthorized_prop',
      event: 'season_selected'
    });
  });

  it('bloqueia propriedades ou valores contendo dados potencialmente sensíveis (PII)', () => {
    const client = createAnalyticsClient({
      enabled: true,
      measurementId: 'G-TEST123456',
      catalog: catalogData.events
    });
    client.setConsent(CONSENT_STATE.GRANTED);

    // Teste com valor sensível (email no driver_slug)
    const resValue = client.trackEvent('driver_profile_viewed', {
      driver_slug: 'user@example.com',
      season_context: '2025'
    });
    assert.deepEqual(resValue, {
      status: 'error',
      reason: 'sensitive_data_detected',
      property: 'driver_slug',
      event: 'driver_profile_viewed'
    });

    // Teste com chave contendo termo de PII
    const resKey = client.trackEvent('driver_profile_viewed', {
      driver_slug: 'hamilton',
      user_email: 'test@example.com'
    });
    assert.deepEqual(resKey, {
      status: 'error',
      reason: 'sensitive_data_detected',
      property: 'user_email',
      event: 'driver_profile_viewed'
    });
  });

  it('todos os 11 eventos catalogados são válidos e despacháveis com parâmetros mínimos', () => {
    const client = createAnalyticsClient({
      enabled: true,
      measurementId: 'G-TEST123456',
      catalog: catalogData.events
    });
    client.setConsent(CONSENT_STATE.GRANTED);

    const validPayloads = {
      season_selected: { season_year: '2025', entry_point: 'calendar' },
      grand_prix_viewed: { season_year: '2025', round_number: '01', circuit_id: 'monaco' },
      driver_profile_viewed: { driver_slug: 'hamilton', season_context: '2025' },
      team_profile_viewed: { team_slug: 'ferrari', season_context: '2025' },
      standings_filter_changed: { season_year: '2025', filter_type: 'drivers' },
      driver_comparison_started: { driver_a_slug: 'hamilton', driver_b_slug: 'leclerc', comparison_metric: 'lap_times' },
      simulation_completed: { season_year: '2025', scenario_type: 'rain_wet_tyres' },
      story_opened: { story_slug: 'silverstone-1950', topic_category: 'history' },
      story_chapter_viewed: { story_slug: 'silverstone-1950', chapter_number: 'chap-1' },
      historical_event_explored: { story_slug: 'silverstone-1950', event_year: '1950', event_type: 'first-race' },
      story_source_opened: { story_slug: 'silverstone-1950', source_type: 'official_archive' }
    };

    assert.equal(catalogData.events.length, 11);
    for (const eventDef of catalogData.events) {
      const payload = validPayloads[eventDef.name];
      assert.ok(payload, `Payload de teste ausente para evento ${eventDef.name}`);
      const res = client.trackEvent(eventDef.name, payload);
      assert.deepEqual(res, { status: 'dispatched', event: eventDef.name });
    }

    assert.equal(client.getDispatchedEvents().length, 11);
  });
});
