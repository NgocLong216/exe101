import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAuth } from "firebase/auth";
import { ArrowLeft, Plus, Send, Smile } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Định nghĩa kiểu dữ liệu tin nhắn đa dạng (text, map, image)
type Message = {
  id: string;
  senderName?: string;
  senderAvatar?: string;
  isMe: boolean;
  imageUri?: string;

  type:
  | 'text'
  | 'map'
  | 'image'
  | 'ai-text';

  text?: string;

  mapData?: {
    title: string;
    description: string;
    imageUri: string;
    lat?: number;
    lng?: number;
  };

  time: string;
};

export default function GroupChatScreen() {
  const [inputText, setInputText] = useState('');
  const router = useRouter()
  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  const [keyword, setKeyword] = useState("");
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [suggestedPlaces, setSuggestedPlaces] = useState<any[]>([]);
  const { groupId } = useLocalSearchParams();
  console.log("groupId in GroupChatScreen:", groupId);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userText = inputText;

    setInputText("");

    const userMessage: Message = {
      id: Date.now().toString(),
      isMe: true,
      type: "text",
      text: userText,
      time: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMessage]);

    setLoadingSuggest(true);

    try {
      await askAiSuggestPlace(userText);
    } finally {
      setLoadingSuggest(false);
    }
  };

  const askAiSuggestPlace = async (keyword: string) => {
    try {

      const token =
        await getAuth().currentUser?.getIdToken();

      const response = await fetch(
        `${API_URL}/api/groups/${groupId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: keyword,
          }),
        }
      );

      const data = await response.json();

      const aiTextMessage: Message = {
        id: Date.now().toString(),
        senderName: "WEGO AI",
        senderAvatar: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=120&auto=format&fit=crop",
        isMe: false,
        type: "ai-text",
        text: data.message,
        time: new Date().toLocaleTimeString(),
      };

      setMessages(prev => [
        ...prev,
        aiTextMessage,
      ]);

      const placeMessages: Message[] =
        (data.places || []).map((place: any) => ({
          id: Date.now().toString() + Math.random(),

          senderName: "WEGO AI",

          senderAvatar: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=120&auto=format&fit=crop",

          isMe: false,

          type: "map",

          time: new Date().toLocaleTimeString(),

          mapData: {
            title: place.name,
            description: place.address,
            imageUri: place.thumbnail,
            lat: place.lat,
            lng: place.lng,
          },
        }));

      setMessages(prev => [
        ...prev,
        ...placeMessages,
      ]);

    } catch (e) {

      const errorMessage: Message = {
        id: Date.now().toString(),
        senderName: "WEGO AI",
        senderAvatar: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=120&auto=format&fit=crop",
        isMe: false,
        type: "ai-text",
        text: "Sorry, I couldn't find any suitable places.",
        time: new Date().toLocaleTimeString(),
      };

      setMessages(prev => [
        ...prev,
        errorMessage,
      ]);
    }
  };

  // Dữ liệu mock-up chuẩn theo nội dung tin nhắn trong ảnh mẫu


  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push({
              pathname: '/(tabs)/groups/GroupMembers',
            })}
          >
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=120&auto=format&fit=crop' }}
              style={styles.groupAvatar}
            />
            <View style={styles.onlineBadge} />
          </View>

          <View style={styles.groupInfo}>
            <Text style={styles.groupName} numberOfLines={1}>Beach Day Crew</Text>
            <Text style={styles.groupSub}>8 members • 3 online</Text>
          </View>
        </View>
      </View>

      {/* Chat Content Body */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={20}
      >
        <ScrollView style={styles.chatContainer} contentContainerStyle={{ paddingVertical: 16 }}>
          {/* Tag phân tách thời gian ngày hôm nay */}
          <View style={styles.dateTagContainer}>
            <View style={styles.dateTag}>
              <Text style={styles.dateTagText}>TODAY</Text>
            </View>
          </View>

          
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.messageRow, msg.isMe ? styles.myRow : styles.otherRow]}>

              {/* Hiển thị Avatar nếu là người khác gửi */}
              {!msg.isMe && (
                <Image source={{ uri: msg.senderAvatar }} style={styles.senderAvatar} />
              )}

              <View style={[styles.messageContentWrapper, msg.isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                {/* Tên người gửi (chỉ hiển thị nếu không phải chính mình) */}
                {!msg.isMe && msg.senderName && (
                  <Text style={styles.senderNameText}>{msg.senderName}</Text>
                )}

                {/* Khối nội dung tin nhắn dựa vào Type */}
                {(msg.type === 'text' || msg.type === 'ai-text') && (
                  <View
                    style={[
                      styles.bubble,
                      msg.isMe ? styles.myBubble : styles.otherBubble
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        msg.isMe
                          ? styles.myBubbleText
                          : styles.otherBubbleText
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                )}

                {msg.type === 'map' && msg.mapData && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.mapCard}
                    onPress={() =>
                      router.push({
                        pathname: "/PlaceDetail",
                        params: {
                          placeName: msg.mapData?.title,
                          lat: String(msg.mapData?.lat ?? ""),
                          lng: String(msg.mapData?.lng ?? ""),
                          placeId: "",
                          prevRoute: "/GroupChat",
                          groupId: String(groupId),
                        },
                      })
                    }
                  >
                    <Image
                      source={{ uri: msg.mapData.imageUri }}
                      style={styles.mapImage}
                    />

                    <View style={styles.mapInfoBody}>
                      <Text style={styles.mapTitle}>
                        {msg.mapData.title}
                      </Text>

                      <Text style={styles.mapDesc}>
                        {msg.mapData.description}
                      </Text>

                      <Text
                        style={{
                          color: "#22c55e",
                          fontWeight: "700",
                          fontSize: 12,
                          marginTop: 6,
                        }}
                      >
                        Tap to view details →
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {msg.type === 'image' && msg.imageUri && (
                  <Image source={{ uri: msg.imageUri }} style={styles.sharedImage} />
                )}

                {/* Thời gian gửi tin nhắn */}
                <Text style={styles.timeText}>
                  {msg.time} {msg.isMe && '✔'}
                </Text>
              </View>
            </View>
          ))}
          {/* Duyệt mảng để hiển thị danh sách tin nhắn */}
          {loadingSuggest && (
            <View
              style={{
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: "#64748B",
                  fontStyle: "italic",
                }}
              >
                WeGo AI is thinking...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Input Message Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.circleActionButton}>
            <Plus size={22} color="#475569" />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity style={styles.emojiButton}>
              <Smile size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
          >
            <Send size={20} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  // Header Component Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 6,
  },
  avatarWrapper: {
    position: 'relative',
  },
  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  groupInfo: {
    marginLeft: 12,
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  groupSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerBtn: {
    padding: 6,
  },

  // Content Chat Container
  chatContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  dateTagContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dateTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },

  // Message Rows & Alignment
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
    width: '100%',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  myRow: {
    justifyContent: 'flex-end',
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 18, // Đẩy avatar lên song song với bóng chat chính
  },
  messageContentWrapper: {
    maxWidth: '82%',
  },
  senderNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  // Chat Bubbles (Văn bản)
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    lineHeight: 20,
  },
  otherBubble: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 4,
  },
  myBubble: {
    backgroundColor: '#2563EB', // Màu xanh lam chủ đạo theo thiết kế trong hình
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  otherBubbleText: {
    color: '#1E293B',
  },
  myBubbleText: {
    color: '#FFFFFF',
  },

  // Share Map Card UI
  mapCard: {
    width: 250,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    overflow: 'hidden',
  
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  mapImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#CBD5E1',
  },
  mapInfoBody: {
    padding: 12,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  mapDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },

  // Shared Image Message UI
  sharedImage: {
    width: 220,
    height: 220,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },

  // Bottom Input Message Action Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    paddingBottom: 40,
  },
  circleActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 0,
  },
  emojiButton: {
    padding: 2,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D97706', // Gradient/Cam-nâu ấm đặc trưng nút gửi ở góc dưới
    justifyContent: 'center',
    alignItems: 'center',
  },
});