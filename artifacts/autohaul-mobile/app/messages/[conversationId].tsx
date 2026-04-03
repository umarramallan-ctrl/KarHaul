import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  Platform, ActivityIndicator, KeyboardAvoidingView
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMessages, sendMessage } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import Colors from "@/constants/colors";

export default function MessagesScreen() {
  const { conversationId, name, recipientId, shipmentId } = useLocalSearchParams<{
    conversationId: string; name?: string; recipientId?: string; shipmentId?: string;
  }>();
  const insets = useSafeAreaInsets();
  const C = Colors.light;
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const flatRef = useRef<FlatList>(null);

  const isNew = conversationId === "new";

  const { data, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => getMessages(conversationId!),
    enabled: !isNew && isAuthenticated,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      sendMessage({
        recipientId: recipientId || data?.messages?.[0]?.senderId || "",
        shipmentId: shipmentId || undefined,
        content,
      }),
    onSuccess: (newMsg) => {
      setText("");
      if (isNew && (newMsg as any).conversationId) {
        router.replace({ pathname: "/messages/[conversationId]", params: { conversationId: (newMsg as any).conversationId, name } });
        return;
      }
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;
  const messages = data?.messages || [];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={C.text} />
        </Pressable>
        <View style={[styles.headerAvatar, { backgroundColor: C.primary }]}>
          <Text style={styles.headerAvatarText}>{(name || "U").charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={[styles.headerName, { color: C.text }]} numberOfLines={1}>{name || "Conversation"}</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : (
        <FlatList
          ref={flatRef}
          data={[...messages].reverse()}
          keyExtractor={(m) => m.id}
          inverted
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          renderItem={({ item }) => {
            const isMe = (item as any).senderId !== (messages.find(m => m.id !== item.id)?.senderId || item.senderId);
            return (
              <View style={[styles.bubbleWrapper, isMe ? styles.myBubble : styles.theirBubble]}>
                <View style={[styles.bubble, isMe ? { backgroundColor: C.primary } : { backgroundColor: "#fff", borderWidth: 1, borderColor: C.border }]}>
                  <Text style={[styles.bubbleText, { color: isMe ? "#fff" : C.text }]}>{item.content}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyMsg}>
              <Text style={[styles.emptyText, { color: C.textSecondary }]}>Send a message to start the conversation</Text>
            </View>
          }
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: bottomPadding + 8, borderTopColor: C.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: "#fff", borderColor: C.border, color: C.text }]}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={C.textMuted}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: text.trim() ? C.primary : C.border }]}
          onPress={() => { if (text.trim()) sendMutation.mutate(text.trim()); }}
          disabled={!text.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="send" size={16} color="#fff" />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", backgroundColor: "#fff" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerAvatarText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  headerName: { fontFamily: "Inter_600SemiBold", fontSize: 17, flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  bubbleWrapper: { marginBottom: 8, maxWidth: "75%" },
  myBubble: { alignSelf: "flex-end" },
  theirBubble: { alignSelf: "flex-start" },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  emptyMsg: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 10, backgroundColor: "#fff", borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontFamily: "Inter_400Regular", fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
