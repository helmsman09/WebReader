import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../../App";

type Mode = "text" | "pdf" | "audio";
type Template = "image-top-text" | "image-flow" | "text-only" | "audio-only";

const API_BASE = "http://localhost:4000";

const AddContentScreen: React.FC = () => {
  const nav =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "AddContent">>();
  const [template, setTemplate] = useState<Template>("text-only");
  const [mode, setMode] = useState<Mode>("text");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [sharingMode, setSharingMode] =
    useState<"private" | "unlisted" | "shared">("private");
  const [body, setBody] = useState("");
  const [file, setFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const parseTags = () =>
    tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  const chooseFile = async (kind: "pdf" | "audio") => {
    const result = await DocumentPicker.getDocumentAsync({
      type: kind === "pdf" ? "application/pdf" : "audio/*",
      copyToCacheDirectory: true
    });
    if (result.type === "success") {
      setFile(result.assets[0]);
    }
  };

  const handleTemplateChange = (tpl: Template) => {
    setTemplate(tpl);
    if (tpl === "audio-only") setMode("audio");
    else if (tpl === "text-only") setMode("text");
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const apiKey = ""; // fill from secure storage
      if (!apiKey) {
        Alert.alert("Missing API key", "Configure your API key first.");
        return;
      }

      if (mode === "text") {
        const res = await fetch(`${API_BASE}/api/uploads/text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            title,
            body,
            tags: parseTags(),
            sharingMode
          })
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Upload failed");
        }
      } else {
        if (!file) {
          Alert.alert("File required", "Please pick a file first.");
          return;
        }
        const form = new FormData();
        const uri = file.uri;
        const name =
          file.name || (mode === "pdf" ? "file.pdf" : "audio-file");
        const mime =
          file.mimeType || (mode === "pdf" ? "application/pdf" : "audio/mpeg");

        // @ts-ignore
        form.append("file", {
          uri,
          name,
          type: mime
        });
        if (title) form.append("title", title);
        if (tags) form.append("tags", tags);
        form.append("sharingMode", sharingMode);

        const endpoint =
          mode === "pdf" ? "/api/uploads/pdf" : "/api/uploads/audio";

        const res = await fetch(`${API_BASE}${endpoint}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: form as any
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Upload failed");
        }
      }

      Alert.alert("Saved", "Your content was added.");
      nav.goBack();
    } catch (e: any) {
      console.log(e);
      Alert.alert("Upload error", e.message || "Failed to upload");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Add content</Text>

      <Text style={styles.label}>Template</Text>
      <View style={styles.row}>
        {(
          [
            { id: "text-only", label: "Text/PDF" },
            { id: "image-top-text", label: "Image top" },
            { id: "image-flow", label: "Image flow" },
            { id: "audio-only", label: "Audio" }
          ] as { id: Template; label: string }[]
        ).map((tpl) => (
          <TouchableOpacity
            key={tpl.id}
            onPress={() => handleTemplateChange(tpl.id)}
            style={[
              styles.chip,
              template === tpl.id && styles.chipActive
            ]}
          >
            <Text style={styles.chipText}>{tpl.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Optional title"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Tags (comma separated)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Indie, Course, PDF"
        value={tags}
        onChangeText={setTags}
      />

      <Text style={styles.label}>Sharing</Text>
      <View style={styles.row}>
        {["private", "unlisted", "shared"].map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() =>
              setSharingMode(m as "private" | "unlisted" | "shared")
            }
            style={[
              styles.chip,
              sharingMode === m && styles.chipActive
            ]}
          >
            <Text style={styles.chipText}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === "text" && (
        <>
          <Text style={styles.label}>Body</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Paste or write your text..."
            value={body}
            onChangeText={setBody}
            multiline
          />
        </>
      )}

      {mode !== "text" && (
        <>
          <Text style={styles.label}>
            {mode === "pdf" ? "PDF file" : "Audio file"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => chooseFile(mode === "pdf" ? "pdf" : "audio")}
              style={styles.pickButton}
            >
              <Text style={{ color: "#fff" }}>
                Choose {mode.toUpperCase()}
              </Text>
            </TouchableOpacity>
            <Text style={{ marginLeft: 8, fontSize: 12 }} numberOfLines={1}>
              {file ? file.name : "No file selected"}
            </Text>
          </View>
        </>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading}
        style={[styles.saveButton, loading && { opacity: 0.7 }]}
      >
        <Text style={{ color: "#fff", fontSize: 15 }}>
          {loading ? "Saving..." : "Save"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AddContentScreen;

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13
  },
  multiline: { height: 160, textAlignVertical: "top" },
  row: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f7f7f7",
    marginRight: 6,
    marginBottom: 6
  },
  chipActive: {
    backgroundColor: "#e1e7ff",
    borderColor: "#a0b0ff"
  },
  chipText: { fontSize: 12 },
  pickButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#4a6cff"
  },
  saveButton: {
    marginTop: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#4a6cff",
    alignItems: "center"
  }
});
