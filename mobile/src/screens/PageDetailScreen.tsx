import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import type { PageDTO } from "@news-capture/types";

type Props = NativeStackScreenProps<RootStackParamList, "PageDetail">;

const API_BASE = "http://localhost:4000";

const PageDetailScreen: React.FC<Props> = ({ route }) => {
  const { pageId } = route.params;
  const [page, setPage] = useState<PageDTO | null>(null);

  useEffect(() => {
    const apiKey = ""; // fill from secure storage
    if (!apiKey) return;
    (async () => {
      const res = await fetch(`${API_BASE}/api/me/pages`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!res.ok) return;
      const data: PageDTO[] = await res.json();
      const found = data.find((p) => p._id === pageId) || null;
      setPage(found);
    })();
  }, [pageId]);

  if (!page) {
    return (
      <View style={styles.container}>
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{page.title || "(No title)"}</Text>
      <Text style={styles.url}>{page.url}</Text>
      {page.summary && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryHeader}>Summary</Text>
          <Text style={styles.summaryText}>{page.summary}</Text>
        </View>
      )}
      <Text style={styles.body}>
        {page.mainText || "(No text content)"}
      </Text>
    </ScrollView>
  );
};

export default PageDetailScreen;

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  url: { fontSize: 12, color: "#666", marginBottom: 12 },
  summaryBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    marginBottom: 12,
    backgroundColor: "#fafbff"
  },
  summaryHeader: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  summaryText: { fontSize: 12, lineHeight: 16 },
  body: { fontSize: 13, lineHeight: 18 }
});
