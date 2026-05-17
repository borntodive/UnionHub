import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { chatApi, ChatRoom } from "../../api/chat";
import { QUERY_KEYS } from "../../api/queryKeys";

interface Props {
  navigation: any;
}

export function ChatRoomsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { data: rooms, isLoading } = useQuery({
    queryKey: QUERY_KEYS.chatRooms,
    queryFn: chatApi.getRooms,
  });

  const renderRoom = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={styles.roomItem}
      onPress={() =>
        navigation.navigate("ChatRoom", {
          roomId: item.id,
          roomName: item.name,
        })
      }
    >
      <Text style={styles.roomHash}>#</Text>
      <View style={styles.roomInfo}>
        <Text style={styles.roomName}>{item.name}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Chat Sindacale</Text>
      </View>
      <FlatList
        data={rooms ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1923" },
  center: { justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e2a4a",
  },
  menuIcon: { color: "#fff", fontSize: 20 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  listContent: { paddingVertical: 8 },
  roomItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  roomHash: { color: "#748ffc", fontSize: 20, fontWeight: "700", width: 20 },
  roomInfo: { flex: 1 },
  roomName: { color: "#e9ecef", fontSize: 15, fontWeight: "600" },
  separator: { height: 1, backgroundColor: "#1a2233", marginHorizontal: 16 },
});
