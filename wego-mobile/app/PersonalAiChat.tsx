import { router, useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import { off, onValue, push, ref, set } from "firebase/database";
import { ArrowLeft, Bot, Send, Sparkles } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar
} from "react-native";

import { db } from "@/firebase";

type ChatMessage = {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
  places?: {
    name: string;
    address?: string;
    thumbnail?: string;
    lat?: number;
    lng?: number;
    placeId?: string;
  }[];
};

export default function PersonalAiChat() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const hasScrolledToLatestRef = useRef(false);

  useEffect(() => {
    hasScrolledToLatestRef.current = false;
  }, [groupId]);

  useEffect(() => {
    if (messages.length === 0 || hasScrolledToLatestRef.current) return;

    // Đợi danh sách lịch sử render xong rồi mới nhảy tới tin nhắn mới nhất.
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
      hasScrolledToLatestRef.current = true;
    }, 50);

    return () => clearTimeout(timer);
  }, [messages.length]);

  useEffect(() => {
    const user = getAuth().currentUser;
    if (!user || !groupId) {
      setMessages([]);
      return;
    }

    const messagesRef = ref(
      db,
      `personal_ai_chats/${user.uid}/${groupId}`
    );

    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMessages([]);
        return;
      }

      const loadedMessages = Object.entries(data)
        .map(([id, value]) => ({
          id,
          ...(value as Omit<ChatMessage, "id">),
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      setMessages(loadedMessages);
    });

    return () => off(messagesRef);
  }, [groupId]);

  const saveChatMessage = async (
    message: Omit<ChatMessage, "id">
  ) => {
    const user = getAuth().currentUser;
    if (!user || !groupId) throw new Error("User or group is missing");

    const messagesRef = ref(
      db,
      `personal_ai_chats/${user.uid}/${groupId}`
    );
    const newMessageRef = push(messagesRef);

    // Realtime Database does not accept undefined fields.
    const firebaseMessage = JSON.parse(JSON.stringify(message));
    await set(newMessageRef, firebaseMessage);
  };

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || thinking || !groupId) return;

    setInput("");
    setThinking(true);

    try {
      await saveChatMessage({
        role: "user",
        text: question,
        timestamp: Date.now(),
      });

      const token = await getAuth().currentUser?.getIdToken();
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: question }),
        }
      );

      if (!response.ok) throw new Error("AI request failed");
      const data = await response.json();
      await saveChatMessage({
        role: "ai",
        text: data.message || "I could not find an answer.",
        places: data.places || [],
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn("Could not send AI chat message", error);
      try {
        await saveChatMessage({
          role: "ai",
          text: "Sorry, I couldn't reach WeGo AI. Please try again.",
          timestamp: Date.now(),
        });
      } catch (saveError) {
        console.warn("Could not save AI chat error message", saveError);
      }
    } finally {
      setThinking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <ArrowLeft size={24} color="#172033" />
          </TouchableOpacity>
          <View style={styles.aiAvatar}><Sparkles size={22} color="#FFFFFF" /></View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>WeGo AI</Text>
            <Text style={styles.subtitle}>Your personal travel assistant</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={styles.welcome}>
              <View style={styles.welcomeIcon}><Bot size={34} color="#12C957" /></View>
              <Text style={styles.welcomeTitle}>Where should we go?</Text>
              <Text style={styles.welcomeText}>Ask for places, food, routes, or ideas for your next trip.</Text>
            </View>
          )}

          {messages.map((message) => (
            <View key={message.id} style={[styles.messageRow, message.role === "user" && styles.userRow]}>
              <View style={[styles.bubble, message.role === "user" ? styles.userBubble : styles.aiBubble]}>
                <Text style={message.role === "user" ? styles.userText : styles.aiText}>{message.text}</Text>
                {message.places?.map((place, index) => (
                  <TouchableOpacity
                    key={`${message.id}-${index}`}
                    activeOpacity={0.85}
                    style={styles.placeCard}
                    disabled={place.lat == null || place.lng == null}
                    onPress={() =>
                      router.push({
                        pathname: "/PlaceDetail",
                        params: {
                          placeName: place.name,
                          lat: String(place.lat ?? ""),
                          lng: String(place.lng ?? ""),
                          placeId: place.placeId || "",
                          prevRoute: "/PersonalAiChat",
                          groupId: String(groupId),
                        },
                      })
                    }
                  >
                    {!!place.thumbnail && (
                      <Image source={{ uri: place.thumbnail }} style={styles.placeImage} />
                    )}
                    <View style={styles.placeBody}>
                      <Text style={styles.placeName}>{place.name}</Text>
                      {!!place.address && <Text style={styles.placeAddress}>{place.address}</Text>}
                      {place.lat != null && place.lng != null && (
                        <Text style={styles.placeLink}>Tap to view details →</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {thinking && (
            <View style={styles.thinkingBubble}>
              <ActivityIndicator size="small" color="#12C957" />
              <Text style={styles.thinkingText}>WeGo AI is thinking…</Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.composer, thinking && styles.composerDisabled]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            editable={!thinking}
            placeholder={thinking ? "Please wait for WeGo AI…" : "Ask WeGo AI anything…"}
            placeholderTextColor="#94A3B8"
            style={styles.input}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={thinking || !input.trim()}
            style={[styles.sendButton, (thinking || !input.trim()) && styles.sendDisabled]}
          >
            {thinking ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Send size={20} color="#FFFFFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF", paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EEF2F6" },
  headerButton: { width: 42, height: 42, justifyContent: "center", alignItems: "center" },
  aiAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#1AF364", justifyContent: "center", alignItems: "center", marginLeft: 4 },
  headerCopy: { marginLeft: 12 },
  title: { fontSize: 17, fontWeight: "700", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  chat: { flex: 1, backgroundColor: "#F8FAFC" },
  chatContent: { padding: 16, flexGrow: 1 },
  welcome: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 30 },
  welcomeIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#E8FFF0", justifyContent: "center", alignItems: "center" },
  welcomeTitle: { fontSize: 22, fontWeight: "700", color: "#0F172A", marginTop: 18 },
  welcomeText: { fontSize: 14, lineHeight: 21, color: "#64748B", textAlign: "center", marginTop: 8 },
  messageRow: { flexDirection: "row", marginBottom: 14 },
  userRow: { justifyContent: "flex-end" },
  bubble: { maxWidth: "84%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 },
  userBubble: { backgroundColor: "#1AF364", borderBottomRightRadius: 5 },
  aiBubble: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 5, borderWidth: 1, borderColor: "#E8EDF3" },
  userText: { color: "#083A19", fontSize: 15, lineHeight: 21 },
  aiText: { color: "#1E293B", fontSize: 15, lineHeight: 22 },
  thinkingBubble: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  thinkingText: { color: "#64748B", fontSize: 14 },
  placeCard: { width: 250, marginTop: 12, backgroundColor: "#F1F5F9", borderRadius: 16, overflow: "hidden" },
  placeImage: { width: "100%", height: 120, backgroundColor: "#CBD5E1" },
  placeBody: { padding: 12 },
  placeName: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  placeAddress: { fontSize: 12, lineHeight: 16, color: "#64748B", marginTop: 4 },
  placeLink: { color: "#22C55E", fontWeight: "700", fontSize: 12, marginTop: 6 },
  composer: { flexDirection: "row", alignItems: "flex-end", padding: 12, paddingBottom: Platform.OS === "ios" ? 12 : 18, borderTopWidth: 1, borderTopColor: "#E2E8F0", backgroundColor: "#FFFFFF" },
  composerDisabled: { backgroundColor: "#F8FAFC" },
  input: { flex: 1, maxHeight: 110, minHeight: 44, borderRadius: 22, backgroundColor: "#F1F5F9", color: "#1E293B", fontSize: 15, paddingHorizontal: 16, paddingVertical: 11, marginRight: 9 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#1AF364", justifyContent: "center", alignItems: "center" },
  sendDisabled: { backgroundColor: "#A7EFC0" },
});
