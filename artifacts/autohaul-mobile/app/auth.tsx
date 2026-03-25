import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform, TextInput, Alert, ActivityIndicator
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const { setToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const domain = process.env.EXPO_PUBLIC_DOMAIN;

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLogin = async () => {
    if (!domain) {
      Alert.alert("Not available", "Authentication requires a configured domain. Please use the web app to sign in.");
      return;
    }
    setLoading(true);
    try {
      const replId = process.env.EXPO_PUBLIC_REPL_ID;
      const authUrl = `https://${domain}/api/login`;
      const redirectUri = `autohaul-mobile://auth-callback`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri, {
        showInRecents: true,
      });
      if (result.type === "success") {
        router.back();
      }
    } catch (e) {
      Alert.alert("Login Failed", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={{ paddingBottom: bottomPadding + 24, paddingTop: topPadding + 16 }}
    >
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Feather name="x" size={22} color={C.textSecondary} />
      </Pressable>

      <View style={styles.content}>
        <View style={[styles.logoCircle, { backgroundColor: C.primary }]}>
          <Feather name="truck" size={40} color="#fff" />
        </View>
        <Text style={[styles.title, { color: C.text }]}>EVAUL</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          The direct marketplace for auto transport — no brokers, no middlemen.
        </Text>

        <View style={[styles.featureList, { backgroundColor: "#fff", borderColor: C.border }]}>
          {[
            { icon: "truck", label: "Post loads or browse transport jobs" },
            { icon: "dollar-sign", label: "Negotiate directly with drivers or shippers" },
            { icon: "shield", label: "Verified driver profiles with DOT & insurance" },
            { icon: "star", label: "Ratings and reviews after every delivery" },
          ].map((f, i) => (
            <View key={i} style={[styles.featureItem, i > 0 && { borderTopWidth: 1, borderTopColor: C.borderLight }]}>
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
              <Text style={styles.loginBtnText}>Continue to Sign In</Text>
            </>
          )}
        </Pressable>

        <View style={[styles.disclaimer, { backgroundColor: "#F8FAFC", borderColor: C.border }]}>
          <Feather name="info" size={14} color={C.textMuted} />
          <Text style={[styles.disclaimerText, { color: C.textMuted }]}>
            By signing in you agree to our Terms of Service. EVAUL is a marketplace only — all transport is arranged directly between shippers and drivers.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { position: "absolute", top: 16, right: 20, zIndex: 10, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 24, alignItems: "center", gap: 20 },
  logoCircle: { width: 80, height: 80, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, textAlign: "center" },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 16, textAlign: "center", lineHeight: 24, paddingHorizontal: 10 },
  featureList: { width: "100%", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  featureIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  loginBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 14 },
  loginBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  disclaimer: { width: "100%", flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  disclaimerText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },
});
