import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  Platform, Alert, ActivityIndicator, Modal, FlatList,
  type KeyboardTypeOptions,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createShipment } from "@workspace/api-client-react";
import { useAuth } from "@clerk/clerk-expo";
import Colors from "@/constants/colors";
import { useTheme } from "@/lib/ThemeContext";

// ─── Constants ──────────────────────────────────────────────────────────────

const US_STATES = [
  { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" }, { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DC", name: "Washington DC" },
  { abbr: "DE", name: "Delaware" }, { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" }, { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" }, { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" }, { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" }, { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" }, { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" }, { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" }, { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" }, { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" }, { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" }, { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" }, { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" }, { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" }, { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" }, { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" }, { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" }, { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" }, { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" }, { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" }, { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" }, { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
];

const STATE_ITEMS = US_STATES.map(s => ({ label: `${s.abbr} — ${s.name}`, value: s.abbr }));

const VEHICLE_DATA: Record<string, string[]> = {
  Acura:           ["ILX", "Integra", "MDX", "NSX", "RDX", "TLX"],
  "Alfa Romeo":    ["Giulia", "Giulietta", "Stelvio", "Tonale"],
  "Aston Martin":  ["DB11", "DBX", "DBS Superleggera", "V8 Vantage", "Valkyrie"],
  Audi:            ["A3", "A4", "A5", "A6", "A7", "A8", "e-tron", "Q3", "Q5", "Q7", "Q8", "R8", "RS3", "RS5", "RS6", "RS7", "S3", "S4", "S5", "TT"],
  Bentley:         ["Bentayga", "Continental GT", "Flying Spur", "Mulsanne"],
  BMW:             ["2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "8 Series", "i4", "i7", "iX", "M2", "M3", "M4", "M5", "M8", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4"],
  Buick:           ["Enclave", "Encore", "Encore GX", "Envision", "LaCrosse"],
  Cadillac:        ["CT4", "CT5", "Escalade", "Lyriq", "XT4", "XT5", "XT6"],
  Chevrolet:       ["Blazer", "Bolt EUV", "Bolt EV", "Camaro", "Colorado", "Corvette", "Equinox", "Malibu", "Silverado 1500", "Silverado 2500HD", "Silverado 3500HD", "Suburban", "Tahoe", "Trailblazer", "Traverse", "Trax"],
  Chrysler:        ["300", "Pacifica", "Voyager"],
  Dodge:           ["Challenger", "Charger", "Durango", "Hornet", "Viper"],
  Ferrari:         ["296 GTB", "488 GTB", "812 Superfast", "F8 Tributo", "Portofino", "Roma", "SF90 Stradale"],
  Fiat:            ["124 Spider", "500", "500X"],
  Ford:            ["Bronco", "Bronco Sport", "EcoSport", "Edge", "Escape", "Expedition", "Explorer", "F-150", "F-150 Lightning", "F-250 Super Duty", "F-350 Super Duty", "Maverick", "Mustang", "Mustang Mach-E", "Ranger", "Transit"],
  Genesis:         ["G70", "G80", "G90", "GV70", "GV80"],
  GMC:             ["Acadia", "Canyon", "Sierra 1500", "Sierra 2500HD", "Sierra 3500HD", "Terrain", "Yukon", "Yukon XL"],
  Honda:           ["Accord", "Civic", "CR-V", "HR-V", "Insight", "Odyssey", "Passport", "Pilot", "Prologue", "Ridgeline"],
  Hyundai:         ["Elantra", "IONIQ 5", "IONIQ 6", "Kona", "Palisade", "Santa Cruz", "Santa Fe", "Sonata", "Tucson", "Venue"],
  Infiniti:        ["Q50", "Q60", "QX50", "QX55", "QX60", "QX80"],
  Jaguar:          ["E-Pace", "F-Pace", "F-Type", "I-Pace", "XE", "XF"],
  Jeep:            ["Cherokee", "Compass", "Gladiator", "Grand Cherokee", "Grand Wagoneer", "Renegade", "Wagoneer", "Wrangler"],
  Kia:             ["Carnival", "EV6", "Forte", "K5", "Niro", "Seltos", "Soul", "Sorento", "Sportage", "Stinger", "Telluride"],
  Lamborghini:     ["Aventador", "Huracan", "Urus"],
  "Land Rover":    ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
  Lexus:           ["ES", "GS", "GX", "IS", "LC", "LS", "LX", "NX", "RC", "RX", "UX"],
  Lincoln:         ["Aviator", "Corsair", "MKZ", "Nautilus", "Navigator"],
  Lucid:           ["Air"],
  Maserati:        ["Ghibli", "GranTurismo", "Grecale", "Levante", "MC20", "Quattroporte"],
  Mazda:           ["CX-30", "CX-5", "CX-50", "CX-9", "CX-90", "Mazda3", "Mazda6", "MX-5 Miata"],
  McLaren:         ["570S", "600LT", "720S", "765LT", "Artura", "GT", "Senna"],
  "Mercedes-Benz": ["A-Class", "AMG GT", "C-Class", "CLA", "CLE", "E-Class", "EQB", "EQE", "EQS", "G-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "S-Class", "Sprinter"],
  MINI:            ["Clubman", "Convertible", "Cooper", "Countryman"],
  Mitsubishi:      ["Eclipse Cross", "Galant", "Mirage", "Outlander", "Outlander Sport"],
  Nissan:          ["370Z", "Altima", "Armada", "Frontier", "GT-R", "Kicks", "Leaf", "Maxima", "Murano", "Pathfinder", "Rogue", "Rogue Sport", "Sentra", "Titan", "Versa"],
  Porsche:         ["718 Boxster", "718 Cayman", "911", "Cayenne", "Macan", "Panamera", "Taycan"],
  Ram:             ["1500", "2500", "3500", "ProMaster", "ProMaster City"],
  Rivian:          ["R1S", "R1T"],
  "Rolls-Royce":   ["Cullinan", "Dawn", "Ghost", "Phantom", "Spectre", "Wraith"],
  Subaru:          ["Ascent", "BRZ", "Crosstrek", "Forester", "Impreza", "Legacy", "Outback", "Solterra", "WRX"],
  Tesla:           ["Cybertruck", "Model 3", "Model S", "Model X", "Model Y", "Roadster"],
  Toyota:          ["4Runner", "86", "Avalon", "Camry", "C-HR", "Corolla", "Crown", "GR86", "GR Corolla", "Highlander", "Land Cruiser", "Mirai", "Prius", "RAV4", "Sequoia", "Sienna", "Supra", "Tacoma", "Tundra", "Venza"],
  Volkswagen:      ["Arteon", "Atlas", "Atlas Cross Sport", "Golf", "GTI", "ID.4", "Jetta", "Passat", "Taos", "Tiguan"],
  Volvo:           ["C40", "S60", "S90", "V60", "V90", "XC40", "XC60", "XC90"],
};

const VEHICLE_MAKES = Object.keys(VEHICLE_DATA).sort();

const VEHICLE_TYPES = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Truck" },
  { value: "van", label: "Van" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "rv", label: "RV" },
  { value: "exotic", label: "Exotic" },
  { value: "other", label: "Other" },
];

const CONDITIONS = [
  { value: "running", label: "Runs & Drives" },
  { value: "non_running", label: "Inoperable (INOP)" },
];

const TRANSPORT_TYPES = [
  { value: "open", label: "Open Carrier", desc: "Standard. Exposed to elements. Most affordable." },
  { value: "enclosed", label: "Enclosed Carrier", desc: "Fully covered. Classic/luxury vehicles. ~40% more." },
];

const SERVICE_TYPES = [
  { value: "door_to_door", label: "Door to Door", desc: "Pickup & delivery at your addresses." },
  { value: "door_to_port", label: "Door to Port", desc: "Pickup at address, delivery to a port terminal." },
];

const LOCATION_TYPES = [
  { value: "residential", label: "Residential", icon: "home", warning: null },
  { value: "dealer", label: "Auto Dealer", icon: "briefcase", warning: null },
  { value: "auction", label: "Auction House", icon: "layers", warning: "Release paperwork required" },
  { value: "port", label: "Port / Terminal", icon: "anchor", warning: "TWIC card required" },
  { value: "military", label: "Military Base", icon: "shield", warning: "Gov. ID + escort required" },
  { value: "storage", label: "Storage Facility", icon: "package", warning: null },
  { value: "airport", label: "Airport", icon: "send", warning: "Access pre-approval needed" },
  { value: "other", label: "Other", icon: "help-circle", warning: null },
];

const STEPS = ["Vehicle", "Route", "Details"];

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const toYMD = (d: Date) => d.toISOString().split("T")[0];

// ─── AutocompleteInput ───────────────────────────────────────────────────────

interface SuggestItem { label: string; value: string }

function SuggestInput({
  label, value, onChange, placeholder, items, maxLength,
  autoCapitalize = "words", keyboardType = "default",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  items: SuggestItem[]; maxLength?: number;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  keyboardType?: KeyboardTypeOptions;
}) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const [focused, setFocused] = useState(false);
  const [inputText, setInputText] = useState(value);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setInputText(value); }, [value]);

  const handleChange = (text: string) => {
    const out = autoCapitalize === "characters"
      ? text.toUpperCase().slice(0, maxLength ?? 99)
      : text;
    setInputText(out);
    onChange(out);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const q = out.trim().toLowerCase();
      setSuggestions(q.length > 0
        ? items.filter(i => i.label.toLowerCase().includes(q)).slice(0, 6)
        : []);
    }, 180);
  };

  const select = (item: SuggestItem) => {
    setInputText(item.value);
    onChange(item.value);
    setSuggestions([]);
    setFocused(false);
  };

  const showSugg = focused && suggestions.length > 0;

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fLabel, { color: C.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.fInput, { color: C.text, borderBottomColor: focused ? C.primary : C.borderLight }]}
        value={inputText}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 160)}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoCorrect={false}
        autoComplete="off"
      />
      {showSugg && (
        <View style={[styles.suggBox, { backgroundColor: C.surface, borderColor: C.border, shadowColor: C.text }]}>
          {suggestions.map((item, i) => (
            <Pressable
              key={item.value + i}
              style={[styles.suggItem, { borderTopColor: C.borderLight }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth }]}
              onPress={() => select(item)}
            >
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: C.text }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── VehiclePickerModal ──────────────────────────────────────────────────────

function VehiclePickerModal({
  label, value, onChange, items, placeholder, disabled = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  items: string[]; placeholder?: string; disabled?: boolean;
}) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<TextInput>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter(i => i.toLowerCase().includes(q)) : items;
  }, [query, items]);

  const open = () => {
    if (disabled) return;
    setQuery("");
    setVisible(true);
  };

  const select = (item: string) => {
    onChange(item);
    setVisible(false);
  };

  return (
    <>
      <View style={styles.fieldWrap}>
        <Text style={[styles.fLabel, { color: C.textMuted }]}>{label}</Text>
        <Pressable
          onPress={open}
          style={[styles.pickerTrigger, {
            borderBottomColor: value ? C.primary : C.borderLight,
            opacity: disabled ? 0.45 : 1,
          }]}
        >
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, flex: 1, color: value ? C.text : C.textMuted }}>
            {value || placeholder || "Select…"}
          </Text>
          <Feather name={disabled ? "lock" : "chevron-down"} size={16} color={C.textMuted} />
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
        onShow={() => setTimeout(() => searchRef.current?.focus(), 60)}
      >
        <View style={styles.pickerOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setVisible(false)} />
          <View style={[styles.pickerSheet, { backgroundColor: C.surface }]}>
            {/* Header */}
            <View style={[styles.pickerSheetHeader, { borderBottomColor: C.borderLight }]}>
              <Text style={[styles.pickerSheetTitle, { color: C.text }]}>{label}</Text>
              <Pressable hitSlop={12} onPress={() => setVisible(false)}>
                <Feather name="x" size={20} color={C.textSecondary} />
              </Pressable>
            </View>

            {/* Search bar */}
            <View style={[styles.pickerSearchRow, { borderBottomColor: C.borderLight, backgroundColor: C.inputBackground }]}>
              <Feather name="search" size={15} color={C.textMuted} />
              <TextInput
                ref={searchRef}
                style={[styles.pickerSearchInput, { color: C.text }]}
                value={query}
                onChangeText={setQuery}
                placeholder="Search…"
                placeholderTextColor={C.textMuted}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable hitSlop={10} onPress={() => setQuery("")}>
                  <Feather name="x-circle" size={15} color={C.textMuted} />
                </Pressable>
              )}
            </View>

            {/* List */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 36 }}
              renderItem={({ item }) => {
                const active = item === value;
                return (
                  <Pressable
                    onPress={() => select(item)}
                    style={({ pressed }) => [
                      styles.pickerItem,
                      { borderBottomColor: C.borderLight },
                      active && { backgroundColor: C.primary + "12" },
                      pressed && { backgroundColor: C.border },
                    ]}
                  >
                    <Text style={[styles.pickerItemText, { color: active ? C.primary : C.text }]}>
                      {item}
                    </Text>
                    {active && <Feather name="check" size={16} color={C.primary} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingVertical: 36, gap: 8 }}>
                  <Feather name="search" size={28} color={C.textMuted} />
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: C.textMuted }}>
                    No results for "{query}"
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── DateField ───────────────────────────────────────────────────────────────

function DateField({
  label, value, onChange, minimumDate,
}: {
  label: string; value: Date | null; onChange: (d: Date | null) => void; minimumDate?: Date;
}) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = minimumDate ?? today;

  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value ?? today);

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setShow(false);
      if (event.type === "set" && selected) onChange(selected);
    } else {
      if (selected) setTempDate(selected);
    }
  };

  const open = () => { setTempDate(value ?? today); setShow(true); };

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fLabel, { color: C.textMuted }]}>{label}</Text>
      <Pressable
        style={[styles.dateBtn, { backgroundColor: C.inputBackground, borderColor: value ? C.primary : C.border }]}
        onPress={open}
      >
        <Feather name="calendar" size={16} color={value ? C.primary : C.textMuted} />
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 15, flex: 1, color: value ? C.text : C.textMuted }}>
          {value ? fmtDate(value) : "Select date"}
        </Text>
        {value && (
          <Pressable hitSlop={10} onPress={() => onChange(null)}>
            <Feather name="x" size={14} color={C.textMuted} />
          </Pressable>
        )}
      </Pressable>

      {/* Android — native dialog */}
      {Platform.OS === "android" && show && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          minimumDate={minDate}
          onChange={handlePickerChange}
        />
      )}

      {/* iOS — bottom sheet modal */}
      {Platform.OS === "ios" && (
        <Modal transparent visible={show} animationType="slide" onRequestClose={() => setShow(false)}>
          <Pressable style={styles.dateOverlay} onPress={() => setShow(false)}>
            <Pressable style={[styles.dateCard, { backgroundColor: C.surface }]} onPress={() => {}}>
              <View style={[styles.dateHeader, { borderBottomColor: C.borderLight }]}>
                <Pressable onPress={() => setShow(false)}>
                  <Text style={[styles.dateHeaderBtn, { color: C.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.dateHeaderTitle, { color: C.text }]}>{label}</Text>
                <Pressable onPress={() => { onChange(tempDate); setShow(false); }}>
                  <Text style={[styles.dateHeaderBtn, { color: C.primary, fontFamily: "Inter_600SemiBold" }]}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                minimumDate={minDate}
                onChange={handlePickerChange}
                style={{ width: "100%" }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ─── LocationTypePicker ──────────────────────────────────────────────────────

function LocationTypePicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const selected = LOCATION_TYPES.find(lt => lt.value === value);

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fLabel, { color: C.textMuted }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        {LOCATION_TYPES.map(lt => {
          const active = value === lt.value;
          return (
            <Pressable
              key={lt.value}
              style={[styles.locChip, { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.primary : C.surface }]}
              onPress={() => onChange(lt.value)}
            >
              <Feather name={lt.icon as any} size={13} color={active ? "#fff" : C.textSecondary} />
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: active ? "#fff" : C.textSecondary }}>
                {lt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {selected?.warning && (
        <View style={[styles.locWarning, { backgroundColor: "#FEF9C3", borderColor: "#FDE68A" }]}>
          <Feather name="alert-triangle" size={12} color="#A16207" />
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: "#A16207", flex: 1 }}>
            {selected.warning}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Simple labelled text field ───────────────────────────────────────────────

function F({ label, value, onChange, placeholder, keyboardType, maxLength, autoCapitalize = "sentences" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  keyboardType?: KeyboardTypeOptions; maxLength?: number;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
}) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fLabel, { color: C.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.fInput, { color: C.text, borderBottomColor: focused ? C.primary : C.borderLight }]}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
    </View>
  );
}

// ─── Option cards (transport / service type) ─────────────────────────────────

function OptionCards({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string; desc: string }[];
}) {
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.optCard, { flex: 1, borderColor: active ? C.primary : C.border, backgroundColor: active ? "#EFF6FF" : C.surface }]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: active ? C.primary : C.text, marginBottom: 2 }}>{opt.label}</Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: C.textMuted, lineHeight: 15 }}>{opt.desc}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHead({ label, icon, color }: { label: string; icon: string; color: string }) {
  return (
    <View style={styles.sectionHead}>
      <Feather name={icon as any} size={14} color={color} />
      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color }}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CreateShipmentScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const qc = useQueryClient();
  const { getToken } = useAuth();
  const [step, setStep] = useState(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [form, setForm] = useState({
    // Step 0 — Vehicle
    vehicleYear: "", vehicleMake: "", vehicleModel: "",
    vehicleType: "sedan", vehicleCondition: "running", vin: "",
    // Step 1 — Route
    originAddress: "", originCity: "", originState: "", originZip: "",
    pickupLocationType: "residential",
    destinationAddress: "", destinationCity: "", destinationState: "", destinationZip: "",
    deliveryLocationType: "residential",
    // Step 2 — Details
    transportType: "open", serviceType: "door_to_door",
    pickupDateFrom: null as Date | null,
    pickupDateTo: null as Date | null,
    budgetMax: "", notes: "",
    agreeToTerms: false,
  });

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const createMutation = useMutation({
    mutationFn: async () => {
      // ── Confirm auth token is present ──────────────────────────────────────
      const token = await getToken();
      console.log(
        "[PostLoad] Authorization header:",
        token ? `Bearer ${token.slice(0, 16)}…` : "⚠️  MISSING — request will be rejected with 401",
      );

      // ── Build and log the exact payload being sent ─────────────────────────
      // Field names must match the Express handler (src/routes/shipments.ts):
      //   body.vehicleYear, .vehicleMake, .vehicleModel, .vehicleType,
      //   .vehicleCondition, .vin, .transportType, .serviceType,
      //   .originAddress, .originCity, .originState, .originZip,
      //   .destinationAddress, .destinationCity, .destinationState, .destinationZip,
      //   .pickupDateFrom (YYYY-MM-DD), .pickupDateTo (YYYY-MM-DD),
      //   .budgetMax, .notes,
      //   .pickupLocationType, .deliveryLocationType
      const payload = {
        vehicleYear: parseInt(form.vehicleYear, 10),
        vehicleMake: form.vehicleMake,
        vehicleModel: form.vehicleModel,
        vehicleType: form.vehicleType,
        vehicleCondition: form.vehicleCondition,
        vin: form.vin || undefined,
        transportType: form.transportType,
        serviceType: form.serviceType,
        originAddress: form.originAddress || undefined,
        originCity: form.originCity,
        originState: form.originState,
        originZip: form.originZip,
        pickupLocationType: form.pickupLocationType || undefined,
        destinationAddress: form.destinationAddress || undefined,
        destinationCity: form.destinationCity,
        destinationState: form.destinationState,
        destinationZip: form.destinationZip,
        deliveryLocationType: form.deliveryLocationType || undefined,
        pickupDateFrom: form.pickupDateFrom ? toYMD(form.pickupDateFrom) : undefined,
        pickupDateTo: form.pickupDateTo ? toYMD(form.pickupDateTo) : undefined,
        budgetMax: form.budgetMax ? parseFloat(form.budgetMax) : undefined,
        notes: form.notes || undefined,
      };

      console.log("[PostLoad] Payload →", JSON.stringify(payload, null, 2));

      let result;
      try {
        result = await createShipment(payload as any);
      } catch (apiErr: any) {
        console.error("[PostLoad] createShipment threw — status:", apiErr?.status, apiErr?.statusText);
        console.error("[PostLoad] raw response body:", JSON.stringify(apiErr?.data, null, 2));
        console.error("[PostLoad] error.message:", apiErr?.message);
        throw apiErr;
      }
      console.log("[PostLoad] success response:", JSON.stringify(result, null, 2));
      return result;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["my-shipments"] });
      qc.invalidateQueries({ queryKey: ["shipments"] });
      Alert.alert("Load Posted!", "Your shipment is live. Drivers can now bid on it.", [
        { text: "View Load", onPress: () => { router.back(); router.push({ pathname: "/shipment/[id]", params: { id: (data as any).id } }); } },
        { text: "Done", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      // Log full API error detail for debugging
      console.error("[PostLoad] API error →", {
        status: err?.status,
        statusText: err?.statusText,
        message: err?.message,
        responseBody: err?.data,
        url: err?.url,
        raw: err,
      });
      const detail = err?.data?.detail ?? err?.data?.error ?? err?.message ?? "Please check all fields and try again.";
      Alert.alert("Post Failed", `${err?.status ? `[${err.status}] ` : ""}${detail}`);
    },
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const validate = (): boolean => {
    if (step === 0) {
      const yr = parseInt(form.vehicleYear, 10);
      if (!form.vehicleYear || isNaN(yr) || yr < 1900 || yr > new Date().getFullYear() + 1) {
        Alert.alert("Invalid Year", "Please enter a valid 4-digit vehicle year."); return false;
      }
      if (!form.vehicleMake.trim()) { Alert.alert("Make Required", "Please enter the vehicle make."); return false; }
      if (!form.vehicleModel.trim()) { Alert.alert("Model Required", "Please enter the vehicle model."); return false; }
      if (!form.vin.trim()) { Alert.alert("VIN Required", "Please enter the 17-character VIN."); return false; }
      if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(form.vin.trim())) {
        Alert.alert("Invalid VIN", "VIN must be exactly 17 alphanumeric characters (no I, O, or Q)."); return false;
      }
    }
    if (step === 1) {
      if (!form.originAddress.trim()) { Alert.alert("Missing Info", "Please enter the pickup street address."); return false; }
      if (!form.originCity.trim() || !form.originState.trim() || !form.originZip.trim()) {
        Alert.alert("Missing Info", "Please complete the pickup city, state, and ZIP."); return false;
      }
      if (form.originState.trim().length !== 2) { Alert.alert("Invalid State", "Please use the 2-letter state abbreviation (e.g. TX)."); return false; }
      if (!form.destinationAddress.trim()) { Alert.alert("Missing Info", "Please enter the delivery street address."); return false; }
      if (!form.destinationCity.trim() || !form.destinationState.trim() || !form.destinationZip.trim()) {
        Alert.alert("Missing Info", "Please complete the delivery city, state, and ZIP."); return false;
      }
      if (form.destinationState.trim().length !== 2) { Alert.alert("Invalid State", "Please use the 2-letter state abbreviation (e.g. CA)."); return false; }
    }
    if (step === 2) {
      if (!form.agreeToTerms) {
        Alert.alert("Agreement Required", "Please acknowledge the liability disclaimer to post your load."); return false;
      }
    }
    return true;
  };

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const submit = () => {
    if (!validate()) return;
    createMutation.mutate();
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: C.background, borderBottomColor: C.borderLight }]}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Feather name="x" size={22} color={C.textSecondary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Post a Load</Text>
        <Text style={[styles.headerStep, { color: C.textMuted }]}>{step + 1} / {STEPS.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.progressSeg, { backgroundColor: i <= step ? C.primary : C.border }]} />
        ))}
      </View>

      {/* Body */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPadding + 100, paddingTop: 4 }}
      >
        <Text style={[styles.stepTitle, { color: C.text }]}>{STEPS[step]}</Text>

        {/* ── Step 0 — Vehicle ── */}
        {step === 0 && (
          <View style={{ gap: 14 }}>
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <F
                    label="Year *"
                    value={form.vehicleYear}
                    onChange={v => set("vehicleYear", v)}
                    placeholder="2020"
                    keyboardType="numeric"
                    maxLength={4}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <VehiclePickerModal
                label="Make *"
                value={form.vehicleMake}
                onChange={v => { set("vehicleMake", v); set("vehicleModel", ""); }}
                items={VEHICLE_MAKES}
                placeholder="Select make…"
              />
              <VehiclePickerModal
                label="Model *"
                value={form.vehicleModel}
                onChange={v => set("vehicleModel", v)}
                items={form.vehicleMake ? (VEHICLE_DATA[form.vehicleMake] ?? []) : []}
                placeholder={form.vehicleMake ? "Select model…" : "Select make first"}
                disabled={!form.vehicleMake}
              />
              <F
                label="VIN * (17 characters)"
                value={form.vin}
                onChange={v => set("vin", v.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, ""))}
                placeholder="e.g. 1HGBH41JXMN109186"
                maxLength={17}
                autoCapitalize="characters"
              />
            </View>

            <View>
              <Text style={[styles.sectionLabel, { color: C.text }]}>Vehicle Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {VEHICLE_TYPES.map(t => {
                  const active = form.vehicleType === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      style={[styles.chip, { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.primary : C.surface }]}
                      onPress={() => set("vehicleType", t.value)}
                    >
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: active ? "#fff" : C.textSecondary }}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View>
              <Text style={[styles.sectionLabel, { color: C.text }]}>Condition</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {CONDITIONS.map(c => {
                  const active = form.vehicleCondition === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      style={[styles.condBtn, { flex: 1, borderColor: active ? C.primary : C.border, backgroundColor: active ? "#EFF6FF" : C.surface }]}
                      onPress={() => set("vehicleCondition", c.value)}
                    >
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: active ? C.primary : C.textSecondary, textAlign: "center" }}>
                        {c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {form.vehicleCondition === "non_running" && (
                <View style={[styles.infoBox, { backgroundColor: "#FEF9C3", borderColor: "#FDE68A", marginTop: 8 }]}>
                  <Feather name="alert-triangle" size={13} color="#A16207" />
                  <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#A16207", flex: 1 }}>
                    INOP vehicles require special equipment and typically cost more to transport.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Step 1 — Route ── */}
        {step === 1 && (
          <View style={{ gap: 14 }}>
            {/* Origin */}
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <SectionHead label="Pickup Location" icon="map-pin" color={C.primary} />
              <F
                label="Street Address *"
                value={form.originAddress}
                onChange={v => set("originAddress", v)}
                placeholder="123 Main St"
              />
              <F
                label="City *"
                value={form.originCity}
                onChange={v => set("originCity", v)}
                placeholder="e.g. Dallas"
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <SuggestInput
                    label="State *"
                    value={form.originState}
                    onChange={v => set("originState", v)}
                    placeholder="TX"
                    items={STATE_ITEMS}
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <F
                    label="ZIP *"
                    value={form.originZip}
                    onChange={v => set("originZip", v)}
                    placeholder="75201"
                    keyboardType="numeric"
                    maxLength={5}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <LocationTypePicker
                label="Location Type"
                value={form.pickupLocationType}
                onChange={v => set("pickupLocationType", v)}
              />
            </View>

            {/* Divider */}
            <View style={styles.routeDivider}>
              <View style={[styles.routeDividerLine, { backgroundColor: C.borderLight }]} />
              <View style={[styles.routeDividerIcon, { backgroundColor: C.border }]}>
                <Feather name="arrow-down" size={16} color={C.textMuted} />
              </View>
              <View style={[styles.routeDividerLine, { backgroundColor: C.borderLight }]} />
            </View>

            {/* Destination */}
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <SectionHead label="Delivery Location" icon="flag" color="#F59E0B" />
              <F
                label="Street Address *"
                value={form.destinationAddress}
                onChange={v => set("destinationAddress", v)}
                placeholder="456 Oak Ave"
              />
              <F
                label="City *"
                value={form.destinationCity}
                onChange={v => set("destinationCity", v)}
                placeholder="e.g. Houston"
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <SuggestInput
                    label="State *"
                    value={form.destinationState}
                    onChange={v => set("destinationState", v)}
                    placeholder="TX"
                    items={STATE_ITEMS}
                    maxLength={2}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <F
                    label="ZIP *"
                    value={form.destinationZip}
                    onChange={v => set("destinationZip", v)}
                    placeholder="77001"
                    keyboardType="numeric"
                    maxLength={5}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              <LocationTypePicker
                label="Location Type"
                value={form.deliveryLocationType}
                onChange={v => set("deliveryLocationType", v)}
              />
            </View>
          </View>
        )}

        {/* ── Step 2 — Details ── */}
        {step === 2 && (
          <View style={{ gap: 14 }}>
            {/* Transport type */}
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <SectionHead label="Trailer Type" icon="truck" color={C.text} />
              <OptionCards value={form.transportType} onChange={v => set("transportType", v)} options={TRANSPORT_TYPES} />
            </View>

            {/* Service type */}
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <SectionHead label="Service Type" icon="navigation" color={C.text} />
              <OptionCards value={form.serviceType} onChange={v => set("serviceType", v)} options={SERVICE_TYPES} />
            </View>

            {/* Pickup dates */}
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <SectionHead label="Pickup Window" icon="calendar" color={C.text} />
              <DateField
                label="Earliest Pickup Date"
                value={form.pickupDateFrom}
                onChange={d => { set("pickupDateFrom", d); if (form.pickupDateTo && d && d > form.pickupDateTo) set("pickupDateTo", null); }}
                minimumDate={today}
              />
              <DateField
                label="Latest Pickup Date"
                value={form.pickupDateTo}
                onChange={d => set("pickupDateTo", d)}
                minimumDate={form.pickupDateFrom ?? today}
              />
            </View>

            {/* Budget */}
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <SectionHead label="Budget" icon="dollar-sign" color={C.text} />
              <F label="Maximum ($)" value={form.budgetMax} onChange={v => set("budgetMax", v)} placeholder="e.g. 900" keyboardType="numeric" autoCapitalize="none" />
            </View>

            {/* Notes */}
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <SectionHead label="Additional Instructions" icon="file-text" color={C.text} />
              <TextInput
                style={[styles.textarea, { color: C.text, borderColor: C.borderLight, backgroundColor: C.inputBackground }]}
                value={form.notes}
                onChangeText={v => set("notes", v)}
                placeholder="Gate codes, contact names, special requirements, vehicle modifications…"
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Fee info */}
            <View style={[styles.card, { backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", gap: 8 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Feather name="info" size={13} color={C.primary} />
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 11, color: C.primary, letterSpacing: 0.6, textTransform: "uppercase" }}>
                  How KarHaul Fees Work
                </Text>
              </View>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#1E40AF", lineHeight: 18 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold" }}>Your fee: </Text>
                A 5% platform fee on the final agreed bid is held in escrow at booking confirmation.
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#1E40AF", lineHeight: 18 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", color: "#D97706" }}>Cancellation: </Text>
                You have a 2-hour window to cancel penalty-free. After that, your escrow fee is forfeited.
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#1E40AF", lineHeight: 18 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", color: "#D97706" }}>No-show: </Text>
                If your vehicle is not accessible at the agreed pickup location and time, your escrow fee is forfeited.
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#1E40AF", lineHeight: 18, paddingTop: 4, borderTopWidth: 1, borderTopColor: "#BFDBFE" }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", color: "#64748B" }}>Payments: </Text>
                KarHaul does not process transport payments. Pay your driver directly — cash, Zelle, Venmo, etc.
              </Text>
            </View>

            {/* Agree to terms */}
            <Pressable
              style={[styles.termsRow, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}
              onPress={() => set("agreeToTerms", !form.agreeToTerms)}
            >
              <View style={[styles.checkbox, { borderColor: form.agreeToTerms ? C.primary : C.border, backgroundColor: form.agreeToTerms ? C.primary : "transparent" }]}>
                {form.agreeToTerms && <Feather name="check" size={12} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#C2410C", marginBottom: 2 }}>
                  Legal Disclaimer & Liability Waiver
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#EA580C", lineHeight: 17 }}>
                  I acknowledge that KarHaul assumes ZERO LIABILITY for vehicle damage, delays, or payment disputes. All contracts are between shipper and carrier.
                </Text>
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View style={[styles.bottomBar, { paddingBottom: bottomPadding + 8, backgroundColor: C.surface, borderTopColor: C.borderLight }]}>
        {step > 0 && (
          <Pressable style={[styles.backBtn, { borderColor: C.border }]} onPress={prev}>
            <Feather name="arrow-left" size={18} color={C.text} />
          </Pressable>
        )}
        {step < STEPS.length - 1 ? (
          <Pressable
            style={[styles.nextBtn, { backgroundColor: C.primary, flex: step > 0 ? 1 : undefined, width: step === 0 ? "100%" : undefined }]}
            onPress={next}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>
        ) : (
          <Pressable
            style={[styles.nextBtn, { backgroundColor: C.primary, flex: 1, opacity: createMutation.isPending ? 0.7 : 1 }]}
            onPress={submit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  headerStep: { fontFamily: "Inter_500Medium", fontSize: 14 },

  progressRow: { flexDirection: "row", gap: 4, paddingHorizontal: 16, paddingVertical: 10 },
  progressSeg: { flex: 1, height: 3, borderRadius: 2 },

  stepTitle: { fontFamily: "Inter_700Bold", fontSize: 22, marginBottom: 16 },

  card: {
    borderRadius: 16, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },

  sectionLabel: { fontFamily: "Inter_500Medium", fontSize: 15, marginBottom: 10 },

  sectionHead: {
    flexDirection: "row", alignItems: "center", gap: 7,
    marginBottom: 14,
  },

  // Field
  fieldWrap: { marginBottom: 14 },
  fLabel: { fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 5, letterSpacing: 0.3 },
  fInput: {
    fontFamily: "Inter_400Regular", fontSize: 15,
    borderBottomWidth: 1, paddingVertical: 8,
  },

  // Suggestion dropdown
  suggBox: {
    marginTop: 2, borderRadius: 10, borderWidth: 1,
    overflow: "hidden", zIndex: 100,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 8,
  },
  suggItem: { paddingHorizontal: 12, paddingVertical: 11 },

  // Date picker
  dateBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  dateOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  dateCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  dateHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateHeaderBtn: { fontFamily: "Inter_500Medium", fontSize: 15 },
  dateHeaderTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },

  // Location type chips
  locChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  locWarning: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    marginTop: 8, padding: 8, borderRadius: 8, borderWidth: 1,
  },

  // Option cards
  optCard: { padding: 14, borderRadius: 14, borderWidth: 1.5 },

  // Condition buttons
  condBtn: { paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: "center" },

  // Chips (vehicle type)
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },

  // Info / warning boxes
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },

  // Terms checkbox
  termsRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },

  // Notes textarea
  textarea: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: "Inter_400Regular", fontSize: 14, minHeight: 90,
  },

  // Route step divider
  routeDivider: { flexDirection: "row", alignItems: "center" },
  routeDividerLine: { flex: 1, height: 1 },
  routeDividerIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginHorizontal: 12,
  },

  // Bottom bar
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", gap: 12, paddingHorizontal: 16,
    paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 50, height: 50, borderRadius: 14, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 14,
  },
  nextBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },

  // Vehicle picker modal
  pickerTrigger: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderBottomWidth: 1, paddingVertical: 8,
  },
  pickerOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end",
  },
  pickerSheet: {
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: "78%", overflow: "hidden",
  },
  pickerSheetHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerSheetTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  pickerSearchRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerSearchInput: {
    flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, paddingVertical: 4,
  },
  pickerItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemText: { fontFamily: "Inter_400Regular", fontSize: 15 },
});
