import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert
} from "react-native";
import { Audio } from "expo-av";
import type { PageDTO, TtsVoiceProfile } from "@news-capture/types";
import type {MiniNav} from "../../App"

const API_BASE = "http://localhost:4000";

type Props = {
  nav: MiniNav;
  pageId?: string;
};

export const PageDetailScreen: React.FC<Props> = ({pageId }) => {
  const [page, setPage] = useState<PageDTO | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [voice, setVoice] = useState<TtsVoiceProfile>("man");

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [audioState, setAudioState] = useState<
    "idle" | "loading" | "playing" | "paused"
  >("idle");

  const apiKey = ""; // TODO: fill from secure storage

  const reload = async () => {
    if (!apiKey) return;
    const res = await fetch(`${API_BASE}/api/me/pages`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) return;
    const data: PageDTO[] = await res.json();
    const found = data.find((p) => p._id === pageId) || null;
    setPage(found || null);
    if (found?.tts?.voiceProfile) {
      setVoice(found.tts.voiceProfile);
    }
  };

  useEffect(() => {
    void reload();
  }, [pageId]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [sound]);

  const handleResummarize = async () => {
    if (!page || !apiKey) return;
    try {
      setSummaryLoading(true);
      const res = await fetch(
        `${API_BASE}/api/pages/${page._id}/summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          }
        }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to queue summary");
      }
      Alert.alert(
        "Summary queued",
        "A new summary will appear after a short while."
      );
      setPage({ ...page, summary: "" });
    } catch (e: any) {
      console.log(e);
      Alert.alert("Error", e.message || "Failed to queue summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleGenerateTts = async () => {
    if (!page || !apiKey) return;
    try {
      setTtsLoading(true);
      const res = await fetch(
        `${API_BASE}/api/pages/${page._id}/tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({ voiceProfile: voice })
        }
      );
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to queue TTS");
      }
      Alert.alert(
        "TTS queued",
        "Audio will be generated in the background."
      );
    } catch (e: any) {
      console.log(e);
      Alert.alert("Error", e.message || "Failed to queue TTS");
    } finally {
      setTtsLoading(false);
    }
  };

  const handleTogglePlay = async () => {
    if (!page?.tts?.audioUrl) {
      Alert.alert("No TTS audio", "Generate TTS first, then try again.");
      return;
    }
    try {
      if (!sound) {
        setAudioState("loading");
        const { sound: newSound } = await Audio.Sound.createAsync({
          uri: page.tts.audioUrl
        });
        setSound(newSound);
        await newSound.playAsync();
        setAudioState("playing");
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            setAudioState("paused");
          }
        });
      } else {
        if (audioState === "playing") {
          await sound.pauseAsync();
          setAudioState("paused");
        } else {
          await sound.playAsync();
          setAudioState("playing");
        }
      }
    } catch (e: any) {
      console.log(e);
      Alert.alert("Playback error", e.message || "Could not play audio");
      setAudioState("idle");
    }
  };

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

      <View style={styles.summaryBox}>
        <View style={styles.summaryHeaderRow}>
          <Text style={styles.summaryHeader}>Summary</Text>
          <TouchableOpacity
            onPress={handleResummarize}
            style={styles.summaryButton}
            disabled={summaryLoading}
          >
            <Text style={styles.summaryButtonText}>
              {summaryLoading ? "Queuing…" : "Re-summarize"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.summaryText}>
          {page.summary
            ? page.summary
            : "No summary yet. Pull-to-refresh later to see if it is ready."}
        </Text>
        {page.summaryProvider && page.summaryCreatedAt && (
          <Text style={styles.summaryMeta}>
            Provider: {page.summaryProvider} ·{" "}
            {new Date(page.summaryCreatedAt).toLocaleString()}
          </Text>
        )}
      </View>

      <View style={styles.ttsBox}>
        <Text style={styles.ttsHeader}>Text-to-speech</Text>
        <View style={styles.ttsVoiceRow}>
          {(["boy", "girl", "man", "woman"] as TtsVoiceProfile[]).map(
            (v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setVoice(v)}
                style={[
                  styles.ttsChip,
                  voice === v && styles.ttsChipActive
                ]}
              >
                <Text
                  style={[
                    styles.ttsChipText,
                    voice === v && styles.ttsChipTextActive
                  ]}
                >
                  {v}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
        <TouchableOpacity
          onPress={handleGenerateTts}
          style={styles.ttsButton}
          disabled={ttsLoading}
        >
          <Text style={styles.ttsButtonText}>
            {ttsLoading ? "Queuing TTS…" : "Generate TTS audio"}
          </Text>
        </TouchableOpacity>
        {page.tts && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.ttsMeta}>
              Latest: {page.tts.voiceProfile} ·{" "}
              {new Date(page.tts.createdAt).toLocaleString()}
            </Text>
            <TouchableOpacity
              onPress={handleTogglePlay}
              style={styles.playButton}
            >
              <Text style={styles.playButtonText}>
                {audioState === "playing"
                  ? "Pause TTS"
                  : audioState === "loading"
                  ? "Loading…"
                  : "Play TTS"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.body}>
        {page.mainText || "(No text content)"}
      </Text>
    </ScrollView>
  );
};

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
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4
  },
  summaryHeader: { fontSize: 13, fontWeight: "600" },
  summaryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4a6cff",
    backgroundColor: "#4a6cff"
  },
  summaryButtonText: { color: "#fff", fontSize: 11 },
  summaryText: { fontSize: 12, lineHeight: 16 },
  summaryMeta: { fontSize: 10, color: "#777", marginTop: 4 },
  ttsBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    marginBottom: 12,
    backgroundColor: "#f8f9ff"
  },
  ttsHeader: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  ttsVoiceRow: { flexDirection: "row", flexWrap: "wrap" },
  ttsChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f7f7f7",
    marginRight: 6,
    marginBottom: 6
  },
  ttsChipActive: {
    backgroundColor: "#4a6cff",
    borderColor: "#4a6cff"
  },
  ttsChipText: { fontSize: 12, color: "#333" },
  ttsChipTextActive: { color: "#fff" },
  ttsButton: {
    marginTop: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#4a6cff",
    alignItems: "center"
  },
  ttsButtonText: { color: "#fff", fontSize: 13 },
  ttsMeta: { fontSize: 11, color: "#555" },
  playButton: {
    marginTop: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#333",
    alignItems: "center"
  },
  playButtonText: { color: "#fff", fontSize: 13 },
  body: { fontSize: 13, lineHeight: 18 }
});
