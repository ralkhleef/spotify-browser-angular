const host = window.location.hostname;

export const API_BASE = host === '127.0.0.1'
  ? 'http://127.0.0.1:8888'
  : 'http://localhost:8888';

export const SPA_ORIGIN = window.location.origin;
