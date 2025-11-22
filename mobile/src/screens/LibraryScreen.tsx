import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  useNavigation,
  useRoute,
  RouteProp
} from "@react-navigation/native";
import type { RootStackParamList } from "../../App";
import type { PageDTO } from "@news-capture/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "Library">;
type Route = RouteProp<RootStackParamList, "Library">;

const API_BASE = "http://localhost:4000";

function estimateMinutes(page: PageDTO): number {
  const text = (page.mainText || "").trim();
  if (!text) return 1;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (!words) return 1;
  return Math.max(1, Math.round(words / 220));
}

function localDateKeyFromISO(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (!isFinite(d.getTime())) return "";
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
    return `${y}-${pad(m)}-${pad(day)}`;
  } catch {
    return "";
  }
}

function todayLocalKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  return `${y}-${pad(m)}-${pad(day)}`;
}

function computeStats(pages: PageDTO[]) {
  if (!pages.length) {
    return {
      streakDays: 0,
      totalMinutes: 0,
      daysRead: 0,
      todayMinutes: 0
    };
  }

  const dateSet = new Set<string>();
  const todayKey = todayLocalKey();
  let totalMinutes = 0;
  let todayMinutes = 0;

  for (const p of pages) {
    const minutes = estimateMinutes(p);
    totalMinutes += minutes;

    const key = localDateKeyFromISO(p.createdAt);
    if (key) {
      dateSet.add(key);
      if (key === todayKey) {
        todayMinutes += minutes;
      }
    }
  }

  const dates = Array.from(dateSet).sort(); // ascending
  const daysRead = dates.length;

  let streak = 0;
  if (dates.length) {
    const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
    const parseKey = (s: string) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    let current = parseKey(dates[dates.length - 1]);
    streak = 1;

    while (true) {
      const prev = new Date(current);
      prev.setDate(prev.getDate() - 1);
      const prevStr =
        prev.getFullYear() +
        "-" +
        pad(prev.getMonth() + 1) +
        "-" +
        pad(prev.getDate());
      if (dateSet.has(prevStr)) {
        streak += 1;
        current = prev;
      } else {
        break;
      }
    }
  }

  return { streakDays: streak, totalMinutes, daysRead, todayMinutes };
}

const LibraryScreen: React.FC = () => {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();

  const [pages, setPages] = useState<PageDTO[]>([]);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const apiKey = ""; // TODO: fill from secure storage

  const loadPages = async () => {
    if (!apiKey) return;
    try {
      const res = await fetch(`${API_BASE}/api/me/pages`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setPages(data);
    } catch (e) {
      console.log("Error loading pages", e);
    }
  };

  useEffect(() => {
    void loadPages();
  }, []);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPages();
    setRefreshing(false);
  };

  // When navigated back after an upload: show success banner briefly
  useEffect(() => {
    if (route.params?.justUploaded) {
      setShowSuccessBanner(true);
      const t = setTimeout(() => setShowSuccessBanner(false), 2500);
      return () => clearTimeout(t);
    }
  }, [route.params?.justUploaded]);

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
            <Text style={styles.statsLabel}>est. minutes (all time)</Text>
          </View>
        </View>
        <Text style={styles.statsToday}>
          Today: {stats.todayMinutes} min
        </Text>
        <Text style={styles.statsFootnote}>
          *Streak ends on your most recent reading day.
        </Text>
      </View>

      {showSuccessBanner && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Content uploaded successfully
          </Text>
        </View>
      )}

      <FlatList
        data={pages}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const minutes = estimateMinutes(item);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                nav.navigate("PageDetail", { pageId: item._id })
              }
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
        <Text style={{ color: "#fff", fontSize: 28, marginTop: -3 }}>
          +
        </Text>
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
  statsLabel: { fontSize: 11, color: "#555", textAlign: "center" },
  statsToday: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2b5b34",
    marginTop: 4
  },
  statsFootnote: { fontSize: 10, color: "#777", marginTop: 2 },
  banner: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#e0f7e9",
    borderWidth: 1,
    borderColor: "#9ad4b5",
    marginBottom: 8
  },
  bannerText: {
    fontSize: 12,
    color: "#145c32",
    textAlign: "center",
    fontWeight: "500"
  },
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
