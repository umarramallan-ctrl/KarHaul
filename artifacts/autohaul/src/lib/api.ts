const API_ORIGIN = "https://karhaul-production.up.railway.app";

/** Absolute base for all API calls, e.g. `${apiBase}/auth/2fa/status` */
export const apiBase = `${API_ORIGIN}/api`;

/** Returns an Authorization header with the active Clerk Bearer token, or {} if no session */
export async function clerkAuthHeaders(): Promise<HeadersInit> {
  const token = await (window as any).Clerk?.session?.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
