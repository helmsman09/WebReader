// mobile/src/components/PageAudioPlayer.tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  Button,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Audio, AVPlaybackStatus } from "expo-av";
import Slider from "@react-native-community/slider";

export interface PageAudioWord {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
  start: number | null;
  end: number | null;
}

export interface PageAudioChunk {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
  start: number | null;
  end: number | null;
  wordIndices: number[];
}

export interface PageAudioData {
  pageId: string;
  audioUrl: string;
  voiceId: string;
  durationSec?: number;
  text: string;
  words: PageAudioWord[];
  chunks: PageAudioChunk[];
}

interface Props {
  data: PageAudioData;
}

export const PageAudioPlayer: React.FC<Props> = ({ data }) => {
  const { audioUrl, words, chunks } = data;

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [positionSec, setPositionSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setIsLoaded(false);
      return;
    }
    setIsLoaded(true);
    setPositionSec(status.positionMillis / 1000);
    setIsPlaying(status.isPlaying);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { sound: s } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false },
          onPlaybackStatusUpdate
        );
        if (!cancelled) {
          setSound(s);
        }
      } catch (e) {
        console.error("Failed to load audio", e);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, onPlaybackStatusUpdate]);

  const togglePlay = async () => {
    if (!sound || !isLoaded) return;
    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  // which chunk is active?
  const currentChunkIndex = useMemo(() => {
    const eps = 0.05;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      if (c.start == null || c.end == null) continue;
      if (
        positionSec + eps >= c.start &&
        positionSec <= c.end + eps
      ) {
        return i;
      }
    }
    return -1;
  }, [positionSec, chunks]);

  const currentChunkWordSet = useMemo(() => {
    if (currentChunkIndex < 0) return null;
    const chunk = chunks[currentChunkIndex];
    return new Set(chunk.wordIndices);
  }, [currentChunkIndex, chunks]);

  // which word is active?
  const currentWordIndex = useMemo(() => {
    const eps = 0.05;
    let current = -1;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (w.start == null || w.end == null) continue;
      if (positionSec + eps >= w.start && positionSec <= w.end + eps) {
        current = i;
      } else if (w.start != null && w.start > positionSec) {
        break;
      }
    }
    return current;
  }, [positionSec, words]);

  const handleWordPress = useCallback(
    async (w: PageAudioWord) => {
      if (!sound || w.start == null) return;
      try {
        await sound.setPositionAsync(w.start * 1000);
        if (!isPlaying) {
          await sound.playAsync();
        }
      } catch (e) {
        console.error("Failed to seek", e);
      }
    },
    [sound, isPlaying]
  );
  const handleChunkPress = useCallback(
    async (chunk: PageAudioChunk) => {
      if (!sound || chunk.start == null) return;
      try {
        await sound.setPositionAsync(chunk.start * 1000);
        if (!isPlaying) {
          await sound.playAsync();
        }

        // naive scroll: scroll to approx position based on chunk index
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            y: chunk.index * 80, // tweak per average chunk height
            animated: true,
          });
        }
      } catch (e) {
        console.error("Failed to seek to chunk", e);
      }
    },
    [sound, isPlaying]
  );

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Button
          title={!isLoaded ? "Loading…" : isPlaying ? "Pause" : "Play"}
          onPress={togglePlay}
          disabled={!isLoaded}
        />
        <Text style={styles.time}>
          {positionSec.toFixed(1)}s
          {data.durationSec ? ` / ${data.durationSec.toFixed(1)}s` : ""}
        </Text>
      </View>
      {/* Scrubber */}
      <View style={styles.scrubberRow}>
        <Slider
          style={{ flex: 1 }}
          minimumValue={0}
          maximumValue={data.durationSec ?? Math.max(positionSec, 1)}
          value={positionSec}
          minimumTrackTintColor="#0984e3"
          maximumTrackTintColor="#dfe6e9"
          thumbTintColor="#0984e3"
          onSlidingComplete={async (value) => {
            if (!sound || !isLoaded) return;
            try {
              await sound.setPositionAsync(value * 1000);
            } catch (e) {
              console.error("Failed to seek via slider", e);
            }
          }}
        />
      </View>
      {/* Chunk bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chunkBar}
      >
        {chunks.map((c, i) => {
          const isActive = i === currentChunkIndex;
          return (
            <TouchableOpacity
              key={c.index}
              onPress={() => handleChunkPress(c)}
              style={[
                styles.chunkPill,
                isActive && styles.chunkPillActive,
              ]}
            >
              <Text
                style={isActive ? styles.chunkPillTextActive : styles.chunkPillText}
              >
                {c.index + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.textContainer}
        ref={scrollRef}
      >
        <Text style={styles.text}>
          {words.map((w, i) => {
            const isCurrentWord = i === currentWordIndex;
            const isInCurrentChunk =
              currentChunkWordSet?.has(w.index) ?? false;

            const styleArray = [
              styles.word,
              isInCurrentChunk && styles.chunkWord,
              isCurrentWord && styles.currentWord,
            ].filter(Boolean);

            return (
              <Text
                key={i}
                style={styleArray}
                onPress={() => handleWordPress(w)} // tap word → seek
              >
                {w.text}
                {" "}
              </Text>
            );
          })}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  time: {
    marginLeft: 12,
    fontSize: 12,
    color: "#666",
  },
  scrubberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  chunkBar: {
    maxHeight: 40,
    marginBottom: 8,
  },
  chunkPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 6,
  },
  chunkPillActive: {
    backgroundColor: "#0984e3",
    borderColor: "#0984e3",
  },
  chunkPillText: {
    fontSize: 12,
    color: "#555",
  },
  chunkPillTextActive: {
    fontSize: 12,
    color: "#fff",
  },
  textContainer: {
    flex: 1,
    marginTop: 8,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  word: {
    color: "#222",
  },
  chunkWord: {
    backgroundColor: "#f1f2f6",
  },
  currentWord: {
    backgroundColor: "#ffeaa7",
    color: "#000",
  },
});
