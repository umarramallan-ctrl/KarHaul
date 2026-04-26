import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useOAuth, useAuth } from "@clerk/clerk-expo";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/ThemeContext";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const { isSignedIn } = useAuth();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [loading, setLoading] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (isSignedIn) router.replace("/(tabs)");
  }, [isSignedIn]);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    try {
      const redirectUrl = Linking.createURL("/auth-callback");
      const { createdSessionId, setActive } = await startOAuthFlow({ redirectUrl });
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch {
      Alert.alert("Sign in failed", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [startOAuthFlow]);

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      {/* Dark navy hero — truck logo + brand name */}
      <View style={[styles.hero, { paddingTop: topPadding + 20 }]}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={22} color="rgba(255,255,255,0.6)" />
        </Pressable>
        <View style={styles.logoWrap}>
          <Feather name="truck" size={52} color="#fff" />
        </View>
        <Text style={styles.heroName}>KarHaul</Text>
        <Text style={styles.heroTagline}>Direct auto transport marketplace</Text>
      </View>

      {/* Scrollable sign-in content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
      >
        <Text style={[styles.title, { color: C.text }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          The direct marketplace for auto transport — no brokers, no middlemen.
        </Text>

        <View style={[styles.featureList, { backgroundColor: C.surface, borderColor: C.border }]}>
          {[
            { icon: "truck", label: "Post loads or browse transport jobs" },
            { icon: "dollar-sign", label: "Negotiate directly with drivers or shippers" },
            { icon: "shield", label: "Verified driver profiles with DOT & insurance" },
            { icon: "star", label: "Ratings and reviews after every delivery" },
          ].map((f, i) => (
            <View
              key={i}
              style={[
                styles.featureItem,
                i > 0 && { borderTopWidth: 1, borderTopColor: C.borderLight },
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: "#EFF6FF" }]}>
                <Feather name={f.icon as any} size={16} color={C.primary} />
              </View>
              <Text style={[styles.featureText, { color: C.text }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.loginBtn, { backgroundColor: C.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="log-in" size={18} color="#fff" />
              <Text style={styles.loginBtnText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <View style={[styles.disclaimer, { backgroundColor: "#F8FAFC", borderColor: C.border }]}>
          <Feather name="info" size={14} color={C.textMuted} />
          <Text style={[styles.disclaimerText, { color: C.textMuted }]}>
            By signing in you agree to our Terms of Service. KarHaul is a marketplace only — all
            transport is arranged directly between shippers and drivers.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: {
    backgroundColor: "#0F172A",
    alignItems: "center",
    paddingBottom: 32,
    gap: 10,
  },
  closeBtn: {
    position: "absolute", top: 16, right: 20, zIndex: 10,
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
  },
  logoWrap: {
    width: 96, height: 96, borderRadius: 24,
    backgroundColor: "rgba(26,86,219,0.25)",
    borderWidth: 1.5, borderColor: "rgba(26,86,219,0.5)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  heroName: {
    fontSize: 36, fontWeight: "700", color: "#fff", letterSpacing: 0.5,
  },
  heroTagline: {
    fontSize: 14, color: "rgba(255,255,255,0.55)", letterSpacing: 0.2,
  },
  content: { paddingHorizontal: 24, paddingTop: 28, gap: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 24, textAlign: "center" },
  subtitle: {
    fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center",
    lineHeight: 22, paddingHorizontal: 10,
  },
  featureList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  featureIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  loginBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 14,
  },
  loginBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  disclaimer: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  disclaimerText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },
});
