import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/AuthGuard";
import { useListConversations } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatRelative } from "@/lib/format";
import { MessageSquare, Send, Shield, Phone, MessageCircle, AlertCircle, Loader2, Info, Zap, Flag } from "lucide-react";
import { ReportModal } from "@/components/ReportModal";
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetMyProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { apiBase } from "@/lib/api";

const DRIVER_REPLIES = [
  "I'm interested in this load — when is the pickup window?",
  "Is the vehicle running and can it be driven onto the trailer?",
  "I have capacity on that route. What's your target price?",
  "Vehicle picked up successfully and is on the way!",
  "Delivered safely — please confirm receipt and leave a review.",
  "I'll be on-site by [time] — please have the release docs ready.",
  "Can you confirm the gate code or contact at pickup?",
  "I need to adjust my ETA — please let me know if that works.",
];

const SHIPPER_REPLIES = [
  "Please send your MC and DOT number before arrival.",
  "Vehicle is ready for pickup at the address listed.",
  "Can you provide your estimated arrival time?",
  "Thank you — delivery confirmed! Leaving you a review now.",
  "Can you pick up any earlier? I'm flexible on dates.",
  "Please photograph the vehicle before loading.",
  "Any issues or damage noted on the vehicle at pickup?",
  "I'm comparing a few bids — can you adjust your price at all?",
];

async function fetchMessages(conversationId: string) {
  const res = await fetch(`${apiBase}/messages/${conversationId}`, { credentials: "include" });
  return res.json();
}

async function sendMessage(data: { recipientId: string; conversationId?: string; content: string; shipmentId?: string }) {
  const res = await fetch(`${apiBase}/messages`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw { message: json.error, code: json.code };
  return json;
}

function MessageBubble({ msg, isOwn }: { msg: any; isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
        {!isOwn && <p className="text-xs font-semibold mb-1 opacity-70">{msg.senderName}</p>}
        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    </div>
  );
}

function ChatWindow({ conv, currentUserId, userRole }: { conv: any; currentUserId: string | undefined; userRole?: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [blockedError, setBlockedError] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const quickReplies = userRole === "driver" ? DRIVER_REPLIES : userRole === "shipper" ? SHIPPER_REPLIES : [...DRIVER_REPLIES.slice(0, 4), ...SHIPPER_REPLIES.slice(0, 4)];

  const { data, isLoading } = useQuery({
    queryKey: ["messages", conv.id],
    queryFn: () => fetchMessages(conv.id),
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: () => {
      setText("");
      setBlockedError(null);
      qc.invalidateQueries({ queryKey: ["messages", conv.id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: any) => {
      if (e.code === "CONTENT_BLOCKED") setBlockedError(e.message);
      else toast({ title: "Message failed", description: e.message, variant: "destructive" });
    },
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data]);

  const handleSend = () => {
    if (!text.trim()) return;
    setBlockedError(null);
    sendMutation.mutate({ recipientId: conv.otherUserId, content: text.trim(), conversationId: conv.id });
  };

  const handleCall = async () => {
    setCalling(true);
    try {
      await fetch(`${apiBase}/messages/call-notify`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: conv.otherUserId }),
      });
    } catch {}
    setTimeout(() => { setCalling(false); toast({ title: "Call initiated", description: `Connecting you with ${conv.otherUserName}. Both parties notified.` }); }, 1500);
  };

  const messages = data?.messages || [];

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border">
            <AvatarImage src={conv.otherUserAvatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{conv.otherUserName?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{conv.otherUserName}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3 text-emerald-500" /><span>Direct connection · No brokers</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {conv.otherUserPhone ? (
            <>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700" asChild>
                <a href={`tel:${conv.otherUserPhone}`}>
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700" asChild>
                <a href={`sms:${conv.otherUserPhone}`}>
                  <MessageCircle className="h-3.5 w-3.5" /> Text
                </a>
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700" onClick={handleCall} disabled={calling}>
              {calling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
              {calling ? "Connecting..." : "Call"}
            </Button>
          )}
          <ReportModal
            reportedUserId={conv.otherUserId}
            reportedUserName={conv.otherUserName || "this user"}
            trigger={
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title="Report user" asChild>
                <span><Flag className="h-3.5 w-3.5" /></span>
              </Button>
            }
          />
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="mx-4 mt-3 mb-1 flex items-start gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl px-3 py-2">
        <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-400">To protect both parties, phone numbers and personal contact info are not permitted in messages. Use the <strong>Call</strong> button above to connect by voice.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Start the conversation below.</div>
        ) : (
          messages.map((msg: any) => <MessageBubble key={msg.id} msg={msg} isOwn={msg.senderId === currentUserId} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 space-y-2">
        {blockedError && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-400">{blockedError}</p>
          </div>
        )}

        {/* Quick reply tray */}
        {showQuickReplies && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {quickReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => { setText(reply); setShowQuickReplies(false); }}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 transition-colors font-medium whitespace-nowrap"
              >
                {reply.length > 48 ? reply.slice(0, 47) + "…" : reply}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <button
            onClick={() => setShowQuickReplies(v => !v)}
            title="Quick replies"
            className={`h-11 w-11 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${showQuickReplies ? "bg-primary text-white border-primary" : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"}`}
          >
            <Zap className="h-4 w-4" />
          </button>
          <Textarea
            placeholder="Type a message..."
            className="resize-none min-h-[44px] max-h-28 text-sm"
            value={text}
            onChange={e => { setText(e.target.value); setBlockedError(null); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={1}
          />
          <Button size="icon" className="h-11 w-11 shrink-0" onClick={handleSend} disabled={!text.trim() || sendMutation.isPending}>
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">⚡ Quick replies — tap to fill, edit before sending</p>
      </div>
    </div>
  );
}

export default function Messages() {
  const { data, isLoading, refetch: refetchConversations } = useListConversations();
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const { data: profile } = useGetMyProfile();
  const currentUserId = profile?.id;
  const userRole = profile?.role as string | undefined;
  const [location] = useLocation();

  const conversations = data?.conversations || [];

  // Auto-open or create conversation from ?to= query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toUserId = params.get("to");
    if (!toUserId || selectedConv) return;
    const existing = conversations.find((c: any) => c.otherUserId === toUserId);
    if (existing) { setSelectedConv(existing); return; }
    // No existing conversation — create one then open it
    if (isLoading) return; // wait for conversations to load first
    fetch(`${apiBase}/conversations`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: toUserId }),
    }).then(r => r.json()).then(conv => {
      if (conv?.id) { setSelectedConv(conv); refetchConversations(); }
    }).catch(() => {});
  }, [conversations, location, isLoading]);

  return (
    <AuthGuard>
      <MainLayout>
        <div className="container max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-4.5rem)] flex flex-col">
          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3 -ml-1 group shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <div className="flex-1 flex rounded-2xl border overflow-hidden shadow-sm min-h-0">
            {/* Sidebar */}
            <div className="w-80 shrink-0 border-r flex flex-col bg-background">
              <div className="p-4 border-b">
                <h1 className="text-xl font-display font-bold">Messages</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Direct communication · No brokers</p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-48">
                    <MessageSquare className="h-8 w-8 mb-3 opacity-20" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : conversations.map((conv: any) => (
                  <button key={conv.id} onClick={() => setSelectedConv(conv)}
                    className={`w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-start gap-3 ${selectedConv?.id === conv.id ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                  >
                    <Avatar className="h-10 w-10 border shrink-0">
                      <AvatarImage src={conv.otherUserAvatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{conv.otherUserName?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-sm truncate">{conv.otherUserName}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatRelative(conv.lastMessageAt)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage || "No messages yet"}</p>
                      {conv.unreadCount > 0 && <Badge className="mt-1 h-4 text-[10px] bg-primary">{conv.unreadCount}</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-background min-w-0">
              {selectedConv ? (
                <ChatWindow conv={selectedConv} currentUserId={currentUserId} userRole={userRole} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Select a conversation</h3>
                  <p className="text-sm max-w-xs">Choose a conversation from the left to send a message or request a call directly with your driver or shipper.</p>
                  <div className="mt-6 flex items-center gap-2 text-xs bg-muted px-3 py-2 rounded-full">
                    <Shield className="h-3.5 w-3.5 text-emerald-500" /> All messages are private and on-platform only
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    </AuthGuard>
  );
}
