import { router, useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Markdown from "react-native-markdown-display";

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
    } = useLocalSearchParams<{
        groupId: string;
        groupName: string;
        groupMembers: string;
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
            console.log("LOAD CHECKLIST ERROR", err);
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
                runChecklistAi: "true",
            },
        });

    };

    const renderItem = ({
        item,
    }: {
        item: ChecklistItem;
    }) => (
        <View style={styles.card}>
            <View style={styles.card}>
                <Markdown>
                    {item.content}
                </Markdown>

                <Text style={styles.time}>
                    {new Date(item.createdAt).toLocaleString()}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
      
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() =>
                router.replace({
                  pathname: "/GroupChat",
                  params: {
                    groupId,
                    groupName,
                    groupMembers,
                  },
                })
              }
            >
              <ArrowLeft
                size={24}
                color="#111827"
              />
            </TouchableOpacity>
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
                <View style={styles.editorContainer}>
      
                  <View style={styles.metaRow}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>
                        PROJECTS
                      </Text>
                    </View>
      
                    <Text style={styles.editText}>
                      {items.length} requests
                    </Text>
                  </View>
      
                  <Text style={styles.editorTitle}>
                    AI checklist
                  </Text>
      
                  <Markdown
                    style={{
                      body: {
                        fontSize: 22,
                        lineHeight: 34,
                        color: "#111827",
                      },
      
                      bullet_list: {
                        marginTop: 20,
                      },
      
                      list_item: {
                        marginBottom: 10,
                      },
      
                      bullet_list_icon: {
                        color: "#2563EB",
                      },
                    }}
                  >
                    {items
                      .map(
                        item =>
                          `- ${item.content}`
                      )
                      .join("\n")}
                  </Markdown>
      
                </View>
              </ScrollView>
      
              {items.length > 0 && (
                <TouchableOpacity
                  style={styles.sendAllBtn}
                  disabled={sending}
                  onPress={sendToAi}
                >
                  {sending ? (
                    <ActivityIndicator
                      color="#fff"
                    />
                  ) : (
                    <Text
                      style={styles.sendBtnText}
                    >
                      Send To AI
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}
      
        </SafeAreaView>
      );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
  
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  
    header: {
      flexDirection: "row",
      alignItems: "center",
  
      height: 60,
  
      paddingHorizontal: 16,
      paddingVertical: 10,
  
      backgroundColor: "#FFF",
  
      borderBottomWidth: 1,
      borderBottomColor: "#E5E7EB",
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
  
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
  
      marginBottom: 24,
    },
  
    tag: {
      backgroundColor: "#22C55E",
  
      paddingHorizontal: 12,
      paddingVertical: 4,
  
      borderRadius: 999,
    },
  
    tagText: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: 12,
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
  
    sendAllBtn: {
      position: "absolute",
  
      left: 16,
      right: 16,
      bottom: 40,
  
      backgroundColor: "#22C55E",
  
      borderRadius: 14,
  
      paddingVertical: 15,
  
      alignItems: "center",
  
      elevation: 4,
    },
  
    sendBtnText: {
      color: "#FFF",
  
      fontWeight: "700",
  
      fontSize: 16,
    },
  });