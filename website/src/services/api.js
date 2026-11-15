/**
 * Cliente REST hacia el backend en Rust. Toda la logica de prediccion vive en el
 * backend: este modulo solo hace fetch y devuelve JSON, nunca calcula riesgo.
 */
import { API_BASE_URL } from '../config.js';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API ${path} respondio ${res.status}`);
  }
  return res.json();
}

export const api = {
  getConfig: () => request('/api/v1/config'),
  getLayers: () => request('/api/v1/layers'),
  getZones: () => request('/api/v1/zones'),
  getZoneAssessment: (id) => request(`/api/v1/zones/${encodeURIComponent(id)}`),
  predict: (lat, lon, zoneId) =>
    request('/api/v1/predict', {
      method: 'POST',
      body: JSON.stringify({ lat, lon, zone_id: zoneId ?? null }),
    }),
  simulate: (payload) =>
    request('/api/v1/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCitizenAlerts: () => request('/api/v1/alerts/citizen'),
  ingestLive: (packet) =>
    request('/api/v1/ingest/live', {
      method: 'POST',
      body: JSON.stringify(packet),
    }),
};
