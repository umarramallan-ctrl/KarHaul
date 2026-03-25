import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  Platform, Alert, ActivityIndicator
} from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createShipment } from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const VEHICLE_TYPES = ["sedan", "suv", "truck", "van", "motorcycle", "rv", "exotic", "other"];
const STEPS = ["Vehicle", "Route", "Details"];

export default function CreateShipmentScreen() {
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const qc = useQueryClient();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    vehicleYear: "", vehicleMake: "", vehicleModel: "",
    vehicleType: "sedan", vehicleCondition: "running", vin: "",
    transportType: "open",
    originCity: "", originState: "", originZip: "",
    destinationCity: "", destinationState: "", destinationZip: "",
    pickupDateFrom: "", pickupDateTo: "",
    budgetMin: "", budgetMax: "", notes: "",
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const createMutation = useMutation({
    mutationFn: () => createShipment({
      vehicleYear: parseInt(form.vehicleYear),
      vehicleMake: form.vehicleMake,
      vehicleModel: form.vehicleModel,
      vehicleType: form.vehicleType as any,
      vehicleCondition: form.vehicleCondition as any,
      vin: form.vin || undefined,
      transportType: form.transportType as any,
      originCity: form.originCity,
      originState: form.originState,
      originZip: form.originZip,
      destinationCity: form.destinationCity,
      destinationState: form.destinationState,
      destinationZip: form.destinationZip,
      pickupDateFrom: form.pickupDateFrom || undefined,
      pickupDateTo: form.pickupDateTo || undefined,
      budgetMin: form.budgetMin ? parseFloat(form.budgetMin) : undefined,
      budgetMax: form.budgetMax ? parseFloat(form.budgetMax) : undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["my-shipments"] });
      qc.invalidateQueries({ queryKey: ["shipments"] });
      Alert.alert("Load Posted!", "Your shipment has been listed. Drivers can now bid on it.", [
        { text: "View Load", onPress: () => { router.back(); router.push({ pathname: "/shipment/[id]", params: { id: (data as any).id } }); } },
        { text: "Done", onPress: () => router.back() },
      ]);
    },
    onError: () => Alert.alert("Error", "Could not post shipment. Please check all fields."),
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const validate = () => {
    if (step === 0) {
      if (!form.vehicleYear || !form.vehicleMake || !form.vehicleModel) {
        Alert.alert("Missing Info", "Please fill in year, make, and model."); return false;
      }
      if (isNaN(parseInt(form.vehicleYear))) {
        Alert.alert("Invalid Year", "Please enter a valid year."); return false;
      }
    }
    if (step === 1) {
      if (!form.originCity || !form.originState || !form.originZip) {
        Alert.alert("Missing Info", "Please fill in the origin city, state, and zip."); return false;
      }
      if (!form.destinationCity || !form.destinationState || !form.destinationZip) {
        Alert.alert("Missing Info", "Please fill in the destination city, state, and zip."); return false;
      }
    }
    return true;
  };

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()}><Feather name="x" size={22} color={C.textSecondary} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>Post a Load</Text>
        <Text style={[styles.stepLabel, { color: C.textMuted }]}>{step + 1}/{STEPS.length}</Text>
      </View>

      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.progressStep, { backgroundColor: i <= step ? C.primary : C.border }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 100, paddingTop: 8 }}>
        <Text style={[styles.stepTitle, { color: C.text }]}>{STEPS[step]}</Text>

        {step === 0 && (
          <View style={{ gap: 14 }}>
            <View style={[styles.card, { backgroundColor: "#fff" }]}>
              <F label="Year *" value={form.vehicleYear} onChange={v => set("vehicleYear", v)} placeholder="e.g. 2019" keyboardType="numeric" />
              <F label="Make *" value={form.vehicleMake} onChange={v => set("vehicleMake", v)} placeholder="e.g. Toyota" />
              <F label="Model *" value={form.vehicleModel} onChange={v => set("vehicleModel", v)} placeholder="e.g. Camry" />
              <F label="VIN (optional)" value={form.vin} onChange={v => set("vin", v)} placeholder="17-character VIN" />
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: C.text }]}>Vehicle Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {VEHICLE_TYPES.map(t => (
                  <Pressable
                    key={t}
                    style={[styles.chip, { borderColor: form.vehicleType === t ? C.primary : C.border, backgroundColor: form.vehicleType === t ? C.primary : "#fff" }]}
                    onPress={() => set("vehicleType", t)}
                  >
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: form.vehicleType === t ? "#fff" : C.textSecondary }}>{t}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: C.text }]}>Vehicle Condition</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[{ v: "running", l: "Running" }, { v: "non_running", l: "Non-Running" }].map(({ v, l }) => (
                  <Pressable
                    key={v}
                    style={[styles.conditionBtn, { flex: 1, borderColor: form.vehicleCondition === v ? C.primary : C.border, backgroundColor: form.vehicleCondition === v ? "#EFF6FF" : "#fff" }]}
                    onPress={() => set("vehicleCondition", v)}
                  >
                    <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: form.vehicleCondition === v ? C.primary : C.textSecondary }}>{l}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Text style={[styles.fieldLabel, { color: C.text }]}>Transport Type</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[{ v: "open", l: "Open Carrier", desc: "Standard, lower cost" }, { v: "enclosed", l: "Enclosed Carrier", desc: "Protected, higher cost" }].map(({ v, l, desc }) => (
                  <Pressable
                    key={v}
                    style={[styles.transportCard, { flex: 1, borderColor: form.transportType === v ? C.primary : C.border, backgroundColor: form.transportType === v ? "#EFF6FF" : "#fff" }]}
                    onPress={() => set("transportType", v)}
                  >
                    <Feather name="truck" size={20} color={form.transportType === v ? C.primary : C.textMuted} />
                    <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: form.transportType === v ? C.primary : C.text }}>{l}</Text>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, textAlign: "center" }}>{desc}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: 14 }}>
            <View style={[styles.card, { backgroundColor: "#fff" }]}>
              <Text style={[styles.routeHeader, { color: C.primary }]}>Origin (Pickup)</Text>
              <F label="City *" value={form.originCity} onChange={v => set("originCity", v)} placeholder="e.g. Dallas" />
              <F label="State *" value={form.originState} onChange={v => set("originState", v)} placeholder="e.g. TX" />
              <F label="Zip Code *" value={form.originZip} onChange={v => set("originZip", v)} placeholder="e.g. 75201" keyboardType="numeric" />
            </View>
            <View style={[styles.card, { backgroundColor: "#fff" }]}>
              <Text style={[styles.routeHeader, { color: C.danger }]}>Destination (Delivery)</Text>
              <F label="City *" value={form.destinationCity} onChange={v => set("destinationCity", v)} placeholder="e.g. Houston" />
              <F label="State *" value={form.destinationState} onChange={v => set("destinationState", v)} placeholder="e.g. TX" />
              <F label="Zip Code *" value={form.destinationZip} onChange={v => set("destinationZip", v)} placeholder="e.g. 77001" keyboardType="numeric" />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 14 }}>
            <View style={[styles.card, { backgroundColor: "#fff" }]}>
              <Text style={[styles.routeHeader, { color: C.text }]}>Pickup Window</Text>
              <F label="Earliest Date" value={form.pickupDateFrom} onChange={v => set("pickupDateFrom", v)} placeholder="e.g. 2025-04-15" />
              <F label="Latest Date" value={form.pickupDateTo} onChange={v => set("pickupDateTo", v)} placeholder="e.g. 2025-04-30" />
            </View>
            <View style={[styles.card, { backgroundColor: "#fff" }]}>
              <Text style={[styles.routeHeader, { color: C.text }]}>Budget Range</Text>
              <F label="Minimum ($)" value={form.budgetMin} onChange={v => set("budgetMin", v)} placeholder="e.g. 500" keyboardType="numeric" />
              <F label="Maximum ($)" value={form.budgetMax} onChange={v => set("budgetMax", v)} placeholder="e.g. 900" keyboardType="numeric" />
            </View>
            <View style={[styles.card, { backgroundColor: "#fff" }]}>
              <Text style={[styles.routeHeader, { color: C.text }]}>Additional Notes</Text>
              <TextInput
                style={[styles.textarea, { color: C.text, borderColor: C.borderLight }]}
                value={form.notes}
                onChangeText={v => set("notes", v)}
                placeholder="Special instructions, access details, contact preferences..."
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <View style={[styles.disclaimerBox, { backgroundColor: "#FEF9C3", borderColor: "#FDE68A" }]}>
              <Feather name="info" size={14} color="#A16207" />
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#A16207", flex: 1, lineHeight: 18 }}>
                EVAUL connects you with drivers directly. Arrange payment terms directly with your driver. The platform assumes no liability for transport.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomPadding + 8 }]}>
        {step > 0 && (
          <Pressable style={[styles.backStepBtn, { borderColor: C.border }]} onPress={prev}>
            <Feather name="arrow-left" size={18} color={C.text} />
          </Pressable>
        )}
        {step < STEPS.length - 1 ? (
          <Pressable style={[styles.nextBtn, { backgroundColor: C.primary, flex: step > 0 ? 1 : undefined, width: step === 0 ? "100%" : undefined }]} onPress={next}>
            <Text style={styles.nextBtnText}>Continue</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>
        ) : (
          <Pressable
            style={[styles.nextBtn, { backgroundColor: C.primary, flex: 1, opacity: createMutation.isPending ? 0.7 : 1 }]}
            onPress={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Feather name="check" size={18} color="#fff" />
                <Text style={styles.nextBtnText}>Post Load</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function F({ label, value, onChange, placeholder, keyboardType }: any) {
  const C = Colors.light;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={{ fontFamily: "Inter_400Regular", fontSize: 15, color: C.text, borderBottomWidth: 1, borderBottomColor: C.borderLight, paddingVertical: 8 }}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  stepLabel: { fontFamily: "Inter_500Medium", fontSize: 14 },
  progressRow: { flexDirection: "row", gap: 4, paddingHorizontal: 16, marginBottom: 16 },
  progressStep: { flex: 1, height: 3, borderRadius: 2 },
  stepTitle: { fontFamily: "Inter_700Bold", fontSize: 22, marginBottom: 16 },
  card: { borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  routeHeader: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 12 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 15, marginBottom: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  conditionBtn: { paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: "center" },
  transportCard: { padding: 14, borderRadius: 14, borderWidth: 1.5, alignItems: "center", gap: 6 },
  textarea: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "Inter_400Regular", fontSize: 14, minHeight: 80 },
  disclaimerBox: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 16, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  backStepBtn: { width: 50, height: 50, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  nextBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
