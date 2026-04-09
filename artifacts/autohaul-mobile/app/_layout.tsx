import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { registerForPushNotificationsAsync, savePushTokenToServer } from "@/lib/push-notifications";
import Constants from "expo-constants";

// Prefer the Railway API URL baked into app.json extra, fall back to the dev-time domain.
const apiUrl: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "");
if (apiUrl) setBaseUrl(apiUrl);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
  async clearToken(key: string) {
    return SecureStore.deleteItemAsync(key);
  },
};

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="shipment/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="create-shipment" options={{ presentation: "modal" }} />
      <Stack.Screen name="booking/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="messages/[conversationId]" options={{ presentation: "card" }} />
      <Stack.Screen name="profile/[userId]" options={{ presentation: "card" }} />
      <Stack.Screen name="profile-setup" options={{ presentation: "modal" }} />
    </Stack>
  );
}

function PushNotificationRegistrar() {
  const { isSignedIn } = useAuth();
  useEffect(() => {
    if (!isSignedIn || !apiUrl) return;
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        savePushTokenToServer(token, apiUrl).catch(() => {});
      }
    }).catch(() => {});
  }, [isSignedIn]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ClerkProvider
          publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
          tokenCache={tokenCache}
        >
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <PushNotificationRegistrar />
              <RootLayoutNav />
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ClerkProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
