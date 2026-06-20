import { GroupResponse } from "@/apis/groupAPI";
import React from "react";
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";

type GroupChooseProps = {
  visible: boolean;
  onClose: () => void;
  groups: GroupResponse[];
  activeGroupId?: string;
  onSelectGroup: (groupId: string) => void;
};

export default function GroupChoose({
  visible,
  onClose,
  groups,
  activeGroupId,
  onSelectGroup,
}: GroupChooseProps) {

  const renderItem = ({ item }: { item: GroupResponse }) => {
    const isSelected = item.id === activeGroupId;

    return (
      <TouchableOpacity
        style={[styles.itemCard, isSelected && styles.itemCardSelected]}
        onPress={() => {
          onSelectGroup(item.id);
          onClose();
        }}
      >
        <View style={styles.avatarPlaceholder}>

          <Image
            source={{
              uri:
                item.groupPhoto ||
                `https://ui-avatars.com/api/?name=${item.title}`,
            }}
            style={styles.groupAvatar}
          />

        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, isSelected && styles.itemTitleSelected]}>
            {item.title}
          </Text>
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {item.description || "Không có mô tả nhóm"}
          </Text>
        </View>
        {isSelected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Vùng mờ bên ngoài - Bấm vào sẽ đóng sheet */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Thanh gờ kéo nhỏ trên đầu Sheet */}
              <View style={styles.dragHandle} />

              <Text style={styles.headerTitle}>Chuyển đổi nhóm hiển thị</Text>

              {groups.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Bạn chưa tham gia nhóm nào.</Text>
                </View>
              ) : (
                <FlatList
                  data={groups}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: "50%", // Chiếm tối đa nửa màn hình để lộ bản đồ phía dưới
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  itemCardSelected: {
    backgroundColor: "#ddfde7",
    borderColor: "#1AF364",
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  itemTitleSelected: {
    color: "#1AF364",
  },
  itemSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  checkmark: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1AF364",
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
  },
  groupAvatar: {
    width: 48,
  
    height: 48,
  
    borderRadius: 14,
  
    marginRight: 14,
  
    backgroundColor: "#E2E8F0",
  },
});