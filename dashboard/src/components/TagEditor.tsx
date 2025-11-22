import React, { useEffect, useMemo, useState } from "react";
import { PRESET_TAGS } from "@news-capture/types";

type TagStat = {
  tag: string;
  count: number;
};

type Props = {
  apiBase: string;
  apiKey: string;
  pageId: string;
  initialTags: string[];
  onChange?: (tags: string[]) => void;
};

export const TagEditor: React.FC<Props> = ({
  apiBase,
  apiKey,
  pageId,
  initialTags,
  onChange
}) => {
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [input, setInput] = useState("");
  const [allTags, setAllTags] = useState<TagStat[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTags(initialTags || []);
  }, [pageId, initialTags]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/me/tags`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        setAllTags(data);
      } catch (e) {
        console.log("load tags error", e);
      }
    })();
  }, [apiBase, apiKey]);

  const normalizedInput = input.trim().toLowerCase();

  const suggestions = useMemo(() => {
    if (!normalizedInput) return [] as string[];

    const userTagNames = allTags.map((t) => t.tag);
    const merged = Array.from(
      new Set<string>([...PRESET_TAGS, ...userTagNames])
    );

    return merged
      .filter(
        (t) =>
          t.toLowerCase().includes(normalizedInput) &&
          !tags.some(
            (existing) => existing.toLowerCase() === t.toLowerCase()
          )
      )
      .slice(0, 8);
  }, [allTags, tags, normalizedInput]);

  const persistTags = async (next: string[]) => {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/pages/${pageId}/tags`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ tags: next })
      });
      if (!res.ok) return;
      const data = await res.json();
      setTags(data.tags || next);
      onChange?.(data.tags || next);
    } catch (e) {
      console.log("update tags error", e);
    } finally {
      setSaving(false);
    }
  };

  const addTag = (raw?: string) => {
    const value = (raw ?? input).trim();
    if (!value) return;
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setInput("");
      return;
    }
    const next = [...tags, value];
    setInput("");
    void persistTags(next);
  };

  const removeTag = (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    void persistTags(next);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
        Tags
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          border: "1px solid #ddd",
          borderRadius: 6,
          padding: 4,
          minHeight: 32
        }}
      >
        {tags.map((tag) => (
          <div
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 6px",
              borderRadius: 999,
              border: "1px solid #ccc",
              marginRight: 4,
              marginBottom: 4
            }}
          >
            <span style={{ fontSize: 11 }}>{tag}</span>
            <button
              onClick={() => removeTag(tag)}
              style={{
                marginLeft: 4,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 11
              }}
            >
              ×
            </button>
          </div>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={tags.length ? "Add tag" : "Add first tag"}
          style={{
            flex: 1,
            minWidth: 80,
            border: "none",
            outline: "none",
            fontSize: 12
          }}
        />
      </div>
      {suggestions.length > 0 && (
        <div
          style={{
            marginTop: 4,
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 6,
            padding: 4,
            fontSize: 11
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => addTag(s)}
              style={{
                marginRight: 4,
                marginBottom: 4,
                padding: "2px 6px",
                borderRadius: 999,
                border: "1px solid #ddd",
                background: "#f7f7f7",
                cursor: "pointer"
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {saving && (
        <div style={{ fontSize: 10, color: "#777", marginTop: 2 }}>
          Saving…
        </div>
      )}
    </div>
  );
};
