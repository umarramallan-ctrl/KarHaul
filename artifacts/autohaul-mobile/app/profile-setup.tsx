import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  Platform, Alert, ActivityIndicator
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMyProfile, updateMyProfile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";

const ROLES = [
  { value: "shipper", label: "Shipper", desc: "I need vehicles transported" },
  { value: "driver", label: "Driver", desc: "I transport vehicles" },
  { value: "both", label: "Both", desc: "I do both" },
];

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
    enabled: isAuthenticated,
  });

  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", role: "shipper",
    bio: "", dotNumber: "", mcNumber: "", insuranceProvider: "",
    insurancePolicyNumber: "", truckType: "", termsAccepted: false,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: (profile as any).firstName || "",
        lastName: (profile as any).lastName || "",
        phone: (profile as any).phone || "",
        role: (profile as any).role || "shipper",
        bio: (profile as any).bio || "",
        dotNumber: (profile as any).dotNumber || "",
        mcNumber: (profile as any).mcNumber || "",
        insuranceProvider: (profile as any).insuranceProvider || "",
        insurancePolicyNumber: (profile as any).insurancePolicyNumber || "",
        truckType: (profile as any).truckType || "",
        termsAccepted: (profile as any).termsAccepted || false,
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateMyProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      Alert.alert("Saved!", "Your profile has been updated.");
      router.back();
    },
    onError: () => Alert.alert("Error", "Could not save profile. Please try again."),
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));
  const isDriver = form.role === "driver" || form.role === "both";

  if (isLoading) {
    return <View style={[styles.centered, { backgroundColor: C.background }]}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()}><Feather name="x" size={22} color={C.textSecondary} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>Edit Profile</Text>
        <Pressable onPress={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <ActivityIndicator color={C.primary} size="small" /> : <Text style={[styles.saveBtn, { color: C.primary }]}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 24, gap: 16 }}>
        <View style={[styles.section, { backgroundColor: "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>BASIC INFO</Text>
          <Field label="First Name" value={form.firstName} onChangeText={v => set("firstName", v)} placeholder="John" />
          <Field label="Last Name" value={form.lastName} onChangeText={v => set("lastName", v)} placeholder="Smith" />
          <Field label="Phone" value={form.phone} onChangeText={v => set("phone", v)} placeholder="+1 (555) 000-0000" keyboardType="phone-pad" />
        </View>

        <View>
          <Text style={[styles.roleLabel, { color: C.text }]}>Your Role</Text>
          {ROLES.map(r => (
            <Pressable
              key={r.value}
              style={[styles.roleCard, { borderColor: form.role === r.value ? C.primary : C.border, backgroundColor: form.role === r.value ? "#EFF6FF" : "#fff" }]}
              onPress={() => set("role", r.value)}
            >
              <View style={[styles.radioOuter, { borderColor: form.role === r.value ? C.primary : C.border }]}>
                {form.role === r.value && <View style={[styles.radioInner, { backgroundColor: C.primary }]} />}
              </View>
              <View>
                <Text style={[styles.roleCardTitle, { color: C.text }]}>{r.label}</Text>
                <Text style={[styles.roleCardDesc, { color: C.textSecondary }]}>{r.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {isDriver && (
          <View style={[styles.section, { backgroundColor: "#fff" }]}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>DRIVER CREDENTIALS</Text>
            <Field label="DOT Number" value={form.dotNumber} onChangeText={v => set("dotNumber", v)} placeholder="Required for interstate transport" />
            <Field label="MC Number" value={form.mcNumber} onChangeText={v => set("mcNumber", v)} placeholder="Motor Carrier number" />
            <Field label="Insurance Provider" value={form.insuranceProvider} onChangeText={v => set("insuranceProvider", v)} placeholder="e.g. Progressive Commercial" />
            <Field label="Policy Number" value={form.insurancePolicyNumber} onChangeText={v => set("insurancePolicyNumber", v)} placeholder="Insurance policy number" />
            <Field label="Truck Type" value={form.truckType} onChangeText={v => set("truckType", v)} placeholder="e.g. 7-car open hauler" />
          </View>
        )}

        {!(profile as any)?.termsAccepted && (
          <Pressable
            style={[styles.termsCard, { borderColor: form.termsAccepted ? C.primary : C.border, backgroundColor: "#fff" }]}
            onPress={() => set("termsAccepted", !form.termsAccepted)}
          >
            <View style={[styles.checkbox, { borderColor: form.termsAccepted ? C.primary : C.border, backgroundColor: form.termsAccepted ? C.primary : "transparent" }]}>
              {form.termsAccepted && <Feather name="check" size={12} color="#fff" />}
            </View>
            <Text style={[styles.termsText, { color: C.textSecondary }]}>
              I agree to the <Text style={{ color: C.primary }}>Terms of Service</Text>. I understand Traxion is a marketplace only and assumes no liability for transport, damages, or disputes between shippers and drivers.
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: any) {
  const C = Colors.light;
  return (
    <View style={fStyles.field}>
      <Text style={[fStyles.label, { color: C.textMuted }]}>{label}</Text>
      <TextInput
        style={[fStyles.input, { color: C.text, borderBottomColor: C.borderLight }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const fStyles = StyleSheet.create({
  field: { marginBottom: 4 },
  label: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 4, letterSpacing: 0.3 },
  input: { fontFamily: "Inter_400Regular", fontSize: 15, paddingVertical: 10, borderBottomWidth: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  saveBtn: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  section: { borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 11, marginBottom: 12, letterSpacing: 0.5 },
  roleLabel: { fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 10 },
  roleCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1.5, borderRadius: 14, padding: 16, marginBottom: 10 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  roleCardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  roleCardDesc: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  termsCard: { flexDirection: "row", gap: 12, borderWidth: 1.5, borderRadius: 14, padding: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 2 },
  termsText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, flex: 1 },
});
