import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { API_URL } from "@/lib/api";

const C = Colors.light;

function InfoRow({ icon, label, value, onPress }: { icon: string; label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.infoRow} onPress={onPress}>
      <View style={styles.infoIcon}>
        <Feather name={icon as any} size={18} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: C.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: onPress ? C.primary : C.text }]}>{value}</Text>
      </View>
      {onPress && <Feather name="external-link" size={14} color={C.textMuted} />}
    </Pressable>
  );
}

export default function ContactScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!form.name || !form.email || !form.message) {
      Alert.alert("Missing fields", "Please fill in your name, email, and message.");
      return;
    }
    setLoading(true);
    try {
      await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSubmitted(true);
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Contact Us</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>

        {/* Contact info */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Get in touch</Text>
          <InfoRow
            icon="map-pin"
            label="Address"
            value={"185 Stockwood Dr Ste 13045\nWoodstock, GA 30188"}
          />
          <InfoRow
            icon="phone"
            label="Phone"
            value="+1 (770) 675-9117"
            onPress={() => Linking.openURL("tel:+17706759117")}
          />
          <InfoRow
            icon="mail"
            label="Email"
            value="admin@karhaul.com"
            onPress={() => Linking.openURL("mailto:admin@karhaul.com")}
          />
        </View>

        <View style={[styles.card, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
          <Text style={[styles.cardTitle, { color: C.primary }]}>Business hours</Text>
          <Text style={[styles.hoursText, { color: "#1E40AF" }]}>Mon – Fri: 9 AM – 6 PM ET</Text>
          <Text style={[styles.hoursText, { color: "#1E40AF" }]}>Saturday: 10 AM – 3 PM ET</Text>
          <Text style={[styles.hoursText, { color: "#1E40AF" }]}>Sunday: Closed</Text>
        </View>

        {/* Contact form */}
        {submitted ? (
          <View style={[styles.card, { alignItems: "center", paddingVertical: 40 }]}>
            <Feather name="check-circle" size={48} color="#22C55E" />
            <Text style={[styles.cardTitle, { color: C.text, marginTop: 12, textAlign: "center" }]}>Message sent!</Text>
            <Text style={[styles.hoursText, { color: C.textSecondary, textAlign: "center", marginTop: 6 }]}>
              We'll get back to you within one business day.
            </Text>
            <Pressable
              style={[styles.submitBtn, { marginTop: 20, backgroundColor: "#E2E8F0" }]}
              onPress={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
            >
              <Text style={[styles.submitBtnText, { color: C.text }]}>Send another message</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { color: C.text }]}>Send us a message</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Name *</Text>
              <TextInput
                style={[styles.input, { color: C.text, borderColor: "#E2E8F0" }]}
                placeholder="John Smith"
                placeholderTextColor={C.textMuted}
                value={form.name}
                onChangeText={t => setForm(p => ({ ...p, name: t }))}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Email *</Text>
              <TextInput
                style={[styles.input, { color: C.text, borderColor: "#E2E8F0" }]}
                placeholder="john@example.com"
                placeholderTextColor={C.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={t => setForm(p => ({ ...p, email: t }))}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Subject</Text>
              <TextInput
                style={[styles.input, { color: C.text, borderColor: "#E2E8F0" }]}
                placeholder="How can we help?"
                placeholderTextColor={C.textMuted}
                value={form.subject}
                onChangeText={t => setForm(p => ({ ...p, subject: t }))}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Message *</Text>
              <TextInput
                style={[styles.input, styles.textarea, { color: C.text, borderColor: "#E2E8F0" }]}
                placeholder="Tell us what's on your mind…"
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={form.message}
                onChangeText={t => setForm(p => ({ ...p, message: t }))}
              />
            </View>

            <Pressable
              style={[styles.submitBtn, { backgroundColor: loading ? "#93C5FD" : C.primary }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Feather name="send" size={16} color="#fff" />
              <Text style={styles.submitBtnText}>{loading ? "Sending…" : "Send Message"}</Text>
            </Pressable>
          </View>
        )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16, marginBottom: 4 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontFamily: "Inter_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 2, lineHeight: 20 },
  hoursText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  input: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
  },
  textarea: { minHeight: 100, paddingTop: 10 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  submitBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
