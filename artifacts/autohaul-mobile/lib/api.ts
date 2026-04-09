import Constants from "expo-constants";

const apiUrl: string | undefined =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : undefined);

export function getApiBaseUrl(): string {
  if (apiUrl) return `${apiUrl}/api`;
  return "/api";
}
