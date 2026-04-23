import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import * as WebBrowser from "expo-web-browser";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { registerForPushNotificationsAsync, savePushTokenToServer } from "@/lib/push-notifications";
import { API_URL } from "@/lib/api";
import { ThemeProvider } from "@/lib/ThemeContext";

WebBrowser.maybeCompleteAuthSession();

const apiUrl = API_URL;
setBaseUrl(apiUrl);

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
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const inAuthGroup = segments[0] === "auth";
    if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, isLoaded, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="auth-callback" />
      <Stack.Screen name="shipment/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="create-shipment" options={{ presentation: "modal" }} />
      <Stack.Screen name="booking/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="messages/[conversationId]" options={{ presentation: "card" }} />
      <Stack.Screen name="profile/[userId]" options={{ presentation: "card" }} />
      <Stack.Screen name="profile-setup" options={{ presentation: "modal" }} />
      <Stack.Screen name="about" options={{ presentation: "card" }} />
      <Stack.Screen name="contact" options={{ presentation: "card" }} />
      <Stack.Screen name="terms" options={{ presentation: "card" }} />
    </Stack>
  );
}

function PushNotificationRegistrar() {
  const { isSignedIn, getToken } = useAuth();
  useEffect(() => {
    if (!isSignedIn || !apiUrl) return;
    registerForPushNotificationsAsync().then(async token => {
      if (token) {
        const authToken = await getToken();
        savePushTokenToServer(token, apiUrl, authToken).catch(() => {});
      }
    }).catch(() => {});
  }, [isSignedIn, getToken]);
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
            <ThemeProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <PushNotificationRegistrar />
                <RootLayoutNav />
              </GestureHandlerRootView>
            </ThemeProvider>
          </QueryClientProvider>
        </ClerkProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
