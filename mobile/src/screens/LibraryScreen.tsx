import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../../App";
import type { PageDTO } from "@news-capture/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Library">;

const API_BASE = "http://localhost:4000";

const LibraryScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const [pages, setPages] = useState<PageDTO[]>([]);

  useEffect(() => {
    const apiKey = ""; // fill from secure storage
    if (!apiKey) return;
    (async () => {
      const res = await fetch(`${API_BASE}/api/me/pages`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setPages(data);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={pages}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate("PageDetail", { pageId: item._id })}
          >
            <Text style={styles.title}>{item.title || "(No title)"}</Text>
            <Text style={styles.url} numberOfLines={1}>
              {item.url}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {item.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        onPress={() => nav.navigate("AddContent")}
        style={styles.fab}
      >
        <Text style={{ color: "#fff", fontSize: 28, marginTop: -3 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LibraryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  card: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  url: { fontSize: 11, color: "#666", marginBottom: 4 },
  tagChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#eee",
    marginRight: 4,
    marginBottom: 4
  },
  tagText: { fontSize: 10 },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4a6cff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4
  }
});
