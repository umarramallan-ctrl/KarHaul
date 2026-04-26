import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getApiBaseUrl } from "@/lib/api";
import { useAuth } from "@clerk/clerk-expo";
import { useTheme } from "@/lib/ThemeContext";

type Message = { role: "user" | "assistant"; content: string };

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Hi! I'm KarHaul's support assistant. Ask me anything about posting loads, bidding, bookings, fees, or how the platform works.",
};

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const C = Colors[colorScheme];
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${getApiBaseUrl()}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", content: data.reply || "Sorry, I couldn't get a response. Please try again." }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={C.text} />
        </Pressable>
        <View style={styles.botAvatar}>
          <Feather name="message-square" size={20} color={C.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.text }]}>KarHaul Support</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>AI assistant · Instant answers</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.messagesList, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m, i) => (
          <View key={i} style={[styles.msgRow, m.role === "user" ? styles.msgRowUser : styles.msgRowAssistant]}>
            <View style={[styles.bubble, m.role === "user" ? { backgroundColor: C.primary } : { backgroundColor: C.borderLight }]}>
              <Text style={[styles.bubbleText, { color: m.role === "user" ? "#fff" : C.text }]}>{m.content}</Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={styles.msgRowAssistant}>
            <View style={[styles.bubble, { backgroundColor: C.borderLight, paddingVertical: 12 }]}>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + 12, borderTopColor: C.borderLight, backgroundColor: C.surface }]}>
        <TextInput
          style={[styles.input, { borderColor: C.border, color: C.text }]}
          value={input}
          onChangeText={setInput}
          placeholder="Ask a question…"
          placeholderTextColor={C.textMuted}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: input.trim() && !loading ? C.primary : C.border }]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Feather name="send" size={16} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: 2 },
  botAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  messagesList: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  msgRow: { maxWidth: "85%" },
  msgRowUser: { alignSelf: "flex-end" },
  msgRowAssistant: { alignSelf: "flex-start" },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  inputRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontFamily: "Inter_400Regular", fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },
});
