const domain = process.env.EXPO_PUBLIC_DOMAIN;

export function getApiBaseUrl(): string {
  if (domain) return `https://${domain}/api`;
  return "/api";
}
