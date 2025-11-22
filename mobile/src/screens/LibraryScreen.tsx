import React, { useEffect, useMemo, useState } from "react";
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

function estimateMinutes(page: PageDTO): number {
  const text = (page.mainText || "").trim();
  if (!text) return 1;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (!words) return 1;
  return Math.max(1, Math.round(words / 220));
}

function dateKeyFromISO(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (!isFinite(d.getTime())) return "";
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  } catch {
    return "";
  }
}

function computeStats(pages: PageDTO[]) {
  if (!pages.length) {
    return { streakDays: 0, totalMinutes: 0, daysRead: 0 };
  }
  const dateSet = new Set<string>();
  let totalMinutes = 0;

  for (const p of pages) {
    totalMinutes += estimateMinutes(p);
    const key = dateKeyFromISO(p.createdAt);
    if (key) dateSet.add(key);
  }

  const dates = Array.from(dateSet).sort(); // ascending
  const daysRead = dates.length;

  let streak = 0;
  if (dates.length) {
    const parseDate = (s: string) => new Date(s + "T00:00:00Z");
    const pad = (n: number) => (n < 10 ? "0" + n : "" + n);

    let current = parseDate(dates[dates.length - 1]);
    streak = 1;

    while (true) {
      const prev = new Date(current);
      prev.setUTCDate(prev.getUTCDate() - 1);
      const prevStr =
        prev.getUTCFullYear() +
        "-" +
        pad(prev.getUTCMonth() + 1) +
        "-" +
        pad(prev.getUTCDate());
      if (dateSet.has(prevStr)) {
        streak += 1;
        current = prev;
      } else {
        break;
      }
    }
  }

  return { streakDays: streak, totalMinutes, daysRead };
}

const LibraryScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const [pages, setPages] = useState<PageDTO[]>([]);

  useEffect(() => {
    const apiKey = ""; // TODO: fill from secure storage
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

  const stats = useMemo(() => computeStats(pages), [pages]);

  return (
    <View style={styles.container}>
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Reading streak</Text>
        <View style={styles.statsRow}>
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>{stats.streakDays}</Text>
            <Text style={styles.statsLabel}>day streak*</Text>
          </View>
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>{stats.daysRead}</Text>
            <Text style={styles.statsLabel}>days read</Text>
          </View>
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>{stats.totalMinutes}</Text>
            <Text style={styles.statsLabel}>est. minutes</Text>
          </View>
        </View>
        <Text style={styles.statsFootnote}>
          *Streak ends on your most recent reading day.
        </Text>
      </View>

      <FlatList
        data={pages}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const minutes = estimateMinutes(item);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => nav.navigate("PageDetail", { pageId: item._id })}
            >
              <Text style={styles.title}>
                {item.title || "(No title)"}
              </Text>
              <Text style={styles.url} numberOfLines={1}>
                {item.url}
              </Text>
              <Text style={styles.readingTime}>
                ≈ {minutes} min read
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {item.tags.map((tag) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        }}
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
  statsCard: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dde2ff",
    backgroundColor: "#f4f6ff"
  },
  statsTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4
  },
  statsItem: { flex: 1, alignItems: "center" },
  statsValue: { fontSize: 18, fontWeight: "700" },
  statsLabel: { fontSize: 11, color: "#555" },
  statsFootnote: { fontSize: 10, color: "#777", marginTop: 2 },
  card: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd"
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  url: { fontSize: 11, color: "#666", marginBottom: 2 },
  readingTime: { fontSize: 11, color: "#444", marginBottom: 4 },
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
