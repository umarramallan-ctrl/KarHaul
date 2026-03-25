const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Absolute base for all API calls, e.g. `${apiBase}/auth/2fa/status` */
export const apiBase = `${BASE}/api`;
