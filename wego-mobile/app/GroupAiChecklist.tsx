import { router, useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import { ArrowLeft, Bot, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ChecklistItem = {
  id: string;
  content: string;
  createdAt: string;
};

export default function GroupAiChecklist() {
  const {
    groupId,
    groupName,
    groupMembers,
    groupPhoto,
  } = useLocalSearchParams<{
    groupId: string;
    groupName: string;
    groupMembers: string;
    groupPhoto: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    loadChecklist();
  }, []);

  const loadChecklist = async () => {
    try {
      setLoading(true);

      const token =
        await getAuth().currentUser?.getIdToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}/ai-checklist`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      setItems(data);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const sendToAi = async () => {

    router.replace({
      pathname: "/GroupChat",
      params: {
        groupId,
        groupName,
        groupMembers,
        groupPhoto,
        runChecklistAi: "true",
      },
    });

  };

  const deleteChecklist = async (checklistId: string) => {

    try {

      const token =
        await getAuth().currentUser?.getIdToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}/ai-checklist/${checklistId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error();
      }

      // cập nhật UI luôn
      setItems(prev =>
        prev.filter(item => item.id !== checklistId)
      );

    } catch (e) {

      console.log(e);

    }

  };

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <View style={styles.headerLeft}>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
          >
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.avatarWrapper}>
            <Image
              source={{
                uri: `${groupPhoto}?q=80&w=120&auto=format&fit=crop`
              }}
              style={styles.groupAvatar}
            />
          </View>

          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>
              AI Checklist
            </Text>

            <Text style={styles.groupSub}>
              {groupName}
            </Text>
          </View>

        </View>

        <View style={styles.headerActions}>
          <View style={styles.headerBtn}>
            <Bot
              size={22}
              color="#2563EB"
            />
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{
              paddingBottom: 140,
            }}
          >
            <ScrollView
              style={styles.body}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 140,
              }}
            >

              <View style={styles.dateTagContainer}>
                <View style={styles.dateTag}>
                  <Text style={styles.dateTagText}>
                    AI GENERATED
                  </Text>
                </View>
              </View>

              <View style={styles.checklistCard}>

                <View style={styles.metaRow}>

                  <View style={styles.tag}>
                    <Text style={styles.tagText}>
                      CHECKLIST
                    </Text>
                  </View>

                  <Text style={styles.requestText}>
                    {items.length} items
                  </Text>

                </View>

                <Text style={styles.title}>
                  Suggested itinerary
                </Text>

                <View style={{ marginTop: 10 }}>

                  {items.map(item => (

                    <View
                      key={item.id}
                      style={styles.checklistItem}
                    >

                      <View style={styles.leftContent}>

                        <View style={styles.bullet} />

                        <Text style={styles.itemText}>
                          {item.content}
                        </Text>

                      </View>

                      <TouchableOpacity
                        onPress={() =>
                          deleteChecklist(item.id)
                        }
                      >

                        <X
                          size={18}
                          color="#EF4444"
                        />

                      </TouchableOpacity>

                    </View>

                  ))}

                </View>

              </View>

            </ScrollView>
          </ScrollView>

          {items.length > 0 && (

            <View style={styles.bottomContainer}>

              <TouchableOpacity
                style={styles.sendAllBtn}
                disabled={sending}
                onPress={sendToAi}
              >

                {sending ? (

                  <ActivityIndicator color="#fff" />

                ) : (

                  <>
                    <Bot
                      size={18}
                      color="#fff"
                    />

                    <Text style={styles.sendBtnText}>
                      Send To AI
                    </Text>
                  </>

                )}

              </TouchableOpacity>

            </View>

          )}
        </>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  backBtn: {
    width: 44,
    height: 44,

    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",

    color: "#111827",

    marginLeft: 8,
  },

  editorContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  editText: {
    marginLeft: 10,
    color: "#64748B",
    fontSize: 14,
  },

  editorTitle: {
    fontSize: 42,
    fontWeight: "700",

    color: "#111827",

    marginBottom: 24,
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    paddingHorizontal: 16,
    paddingVertical: 14,

    backgroundColor: "#fff",

    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",

    flex: 1,
  },

  backButton: {
    marginRight: 12,
  },

  avatarWrapper: {
    marginRight: 12,
  },

  groupAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },

  groupInfo: {
    flex: 1,
  },

  groupName: {
    fontSize: 18,
    fontWeight: "700",

    color: "#0F172A",
  },

  groupSub: {
    fontSize: 13,

    color: "#64748B",

    marginTop: 2,
  },

  headerActions: {
    flexDirection: "row",
  },

  headerBtn: {
    width: 42,

    height: 42,

    borderRadius: 21,

    backgroundColor: "#EFF6FF",

    justifyContent: "center",

    alignItems: "center",
  },

  body: {
    flex: 1,
  },

  dateTagContainer: {
    alignItems: "center",

    marginBottom: 18,
  },

  dateTag: {
    backgroundColor: "#E2E8F0",

    borderRadius: 16,

    paddingHorizontal: 14,

    paddingVertical: 6,
  },

  dateTagText: {
    fontSize: 11,

    fontWeight: "700",

    color: "#475569",
  },

  checklistCard: {
    backgroundColor: "#fff",

    borderRadius: 22,

    padding: 20,

    shadowColor: "#000",

    shadowOpacity: 0.05,

    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  metaRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    marginBottom: 14,
  },

  tag: {
    backgroundColor: "#ddfde7",

    paddingHorizontal: 10,

    paddingVertical: 5,

    borderRadius: 10,
  },

  tagText: {
    color: "#1AF364",

    fontWeight: "700",

    fontSize: 12,
  },

  requestText: {
    color: "#64748B",

    fontSize: 13,
  },

  title: {
    fontSize: 24,

    fontWeight: "700",

    color: "#0F172A",

    marginBottom: 16,
  },

  bottomContainer: {
    position: "absolute",

    bottom: 44,

    left: 20,

    right: 20,
  },

  sendAllBtn: {
    height: 56,

    borderRadius: 28,

    backgroundColor: "#1AF364",

    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",

    gap: 8,
  },

  sendBtnText: {
    color: "#fff",

    fontSize: 16,

    fontWeight: "700",
  },

  card: {
    backgroundColor: "#FFFFFF",

    borderRadius: 20,

    padding: 18,

    marginBottom: 16,

    borderWidth: 1,

    borderColor: "#E2E8F0",

    shadowColor: "#000",

    shadowOpacity: 0.06,

    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },
  checklistItem: {

    flexDirection: "row",
  
    justifyContent: "space-between",
  
    alignItems: "flex-start",
  
    marginBottom: 18,
  
  },
  
  leftContent: {
  
    flex: 1,
  
    flexDirection: "row",
  
    alignItems: "flex-start",
  
    marginRight: 12,
  
  },
  
  bullet: {
  
    width: 8,
  
    height: 8,
  
    borderRadius: 4,
  
    backgroundColor: "#1AF364",
  
    marginTop: 8,
  
    marginRight: 12,
  
  },
  
  itemText: {
  
    flex: 1,
  
    fontSize: 16,
  
    lineHeight: 26,
  
    color: "#334155",
  
  },
});