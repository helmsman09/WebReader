import React, { useState } from "react";
import type { PageTemplate, PageMeta } from "@news-capture/types";

type Props = {
  apiBase: string;
  apiKey: string;
  onClose: () => void;
};

type TemplateChoice = PageTemplate;
type Mode = "text" | "pdf" | "audio" | "blocks";

export const UploadModal: React.FC<Props> = ({ apiBase, apiKey, onClose }) => {
  const [template, setTemplate] = useState<TemplateChoice>("text-only");
  const [mode, setMode] = useState<Mode>("text");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [sharingMode, setSharingMode] =
    useState<"private" | "unlisted" | "shared">("private");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [metaDescription, setMetaDescription] = useState("");
  const [siteName, setSiteName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parseTags = () =>
    tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  const buildMeta = (): PageMeta | undefined => {
    if (!metaDescription && !siteName) return undefined;
    return {
      metaDescription: metaDescription || undefined,
      siteName: siteName || undefined
    };
  };

  const reset = () => {
    setTitle("");
    setTags("");
    setSharingMode("private");
    setBody("");
    setFile(null);
    setBlocks([]);
    setMetaDescription("");
    setSiteName("");
    setError(null);
  };

  const handleTemplateChange = (tpl: TemplateChoice) => {
    setTemplate(tpl);
    if (tpl === "audio-only") setMode("audio");
    else if (tpl === "text-only") setMode("text");
    else setMode("blocks");
  };

  const addBlock = (type: "paragraph" | "image") => {
    if (type === "paragraph") {
      setBlocks((prev) => [
        ...prev,
        { type: "paragraph", id: `p${prev.length + 1}`, text: "" }
      ]);
    } else {
      setBlocks((prev) => [
        ...prev,
        { type: "image", id: `img${prev.length + 1}`, src: "", caption: "" }
      ]);
    }
  };

  const updateBlock = (id: string, patch: any) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b))
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const meta = buildMeta();

      if (mode === "text") {
        const res = await fetch(`${apiBase}/api/uploads/text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            title,
            body,
            tags: parseTags(),
            sharingMode,
            meta
          })
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to upload text");
        }
      } else if (mode === "blocks") {
        const finalBlocks = blocks.length
          ? blocks
          : [{ type: "paragraph", id: "p1", text: body }];

        const res = await fetch(`${apiBase}/api/uploads/page`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            title,
            tags: parseTags(),
            sharingMode,
            layoutTemplate: template,
            sourceType: "uploaded-page",
            blocks: finalBlocks,
            meta
          })
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to upload page");
        }
      } else {
        if (!file) {
          setError("Please choose a file");
          return;
        }
        const form = new FormData();
        form.append("file", file);
        if (title) form.append("title", title);
        if (tags) form.append("tags", tags);
        form.append("sharingMode", sharingMode);
        if (meta) {
          form.append("meta", JSON.stringify(meta));
        }

        const endpoint =
          mode === "pdf" ? "/api/uploads/pdf" : "/api/uploads/audio";

        const res = await fetch(`${apiBase}${endpoint}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: form
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to upload file");
        }
      }

      reset();
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: "95vw",
          background: "#fff",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          fontSize: 13
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8
          }}
        >
          <div style={{ fontWeight: 600 }}>New content</div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer"
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <span style={{ marginRight: 6, fontSize: 12 }}>Template:</span>
          {(
            [
              { id: "text-only", label: "Text/PDF" },
              { id: "image-top-text", label: "Image top" },
              { id: "image-flow", label: "Image flow" },
              { id: "audio-only", label: "Audio" }
            ] as { id: TemplateChoice; label: string }[]
          ).map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleTemplateChange(tpl.id)}
              style={{
                marginRight: 4,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid #ccc",
                background:
                  template === tpl.id ? "#e1e7ff" : "#f7f7f7",
                fontSize: 11
              }}
            >
              {tpl.label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 8 }}>
          <div>Title</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: "100%", padding: 4, fontSize: 13 }}
            placeholder="Optional title"
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <div>Tags (comma separated)</div>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            style={{ width: "100%", padding: 4, fontSize: 13 }}
            placeholder="e.g. Indie, Course, PDF"
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <div>Meta description (optional)</div>
          <input
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            style={{ width: "100%", padding: 4, fontSize: 13 }}
            placeholder="Short description"
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <div>Site name (optional)</div>
          <input
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            style={{ width: "100%", padding: 4, fontSize: 13 }}
            placeholder="e.g. Indie Notes, My Blog"
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <div>Sharing</div>
          <select
            value={sharingMode}
            onChange={(e) =>
              setSharingMode(e.target.value as any)
            }
            style={{ padding: 4, fontSize: 13 }}
          >
            <option value="private">Private (just me)</option>
            <option value="unlisted">Unlisted (shareable link)</option>
            <option value="shared">Shared (specific people)</option>
          </select>
        </div>

        {mode === "text" && (
          <div style={{ marginBottom: 8 }}>
            <div>Body</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{
                width: "100%",
                height: 160,
                padding: 4,
                fontSize: 13,
                fontFamily: "inherit"
              }}
              placeholder="Paste or write your text here..."
            />
          </div>
        )}

        {mode === "blocks" && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ marginBottom: 4 }}>Blocks</div>
            <div style={{ marginBottom: 4 }}>
              <button
                onClick={() => addBlock("paragraph")}
                style={{
                  marginRight: 4,
                  padding: "2px 6px",
                  borderRadius: 999,
                  border: "1px solid #ccc",
                  background: "#f7f7f7",
                  fontSize: 11
                }}
              >
                + Text
              </button>
              <button
                onClick={() => addBlock("image")}
                style={{
                  padding: "2px 6px",
                  borderRadius: 999,
                  border: "1px solid #ccc",
                  background: "#f7f7f7",
                  fontSize: 11
                }}
              >
                + Image (URL)
              </button>
            </div>
            {blocks.length === 0 && (
              <div style={{ fontSize: 12, color: "#777" }}>
                No blocks yet. Add text or image blocks.
              </div>
            )}
            {blocks.map((b) => (
              <div
                key={b.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 6,
                  padding: 6,
                  marginBottom: 4
                }}
              >
                <div style={{ fontSize: 11, marginBottom: 4 }}>
                  {b.type === "paragraph" ? "Paragraph" : "Image"}
                </div>
                {b.type === "paragraph" && (
                  <textarea
                    value={b.text}
                    onChange={(e) =>
                      updateBlock(b.id, { text: e.target.value })
                    }
                    style={{
                      width: "100%",
                      minHeight: 60,
                      fontSize: 12
                    }}
                    placeholder="Text..."
                  />
                )}
                {b.type === "image" && (
                  <>
                    <input
                      value={b.src}
                      onChange={(e) =>
                        updateBlock(b.id, { src: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: 4,
                        fontSize: 12,
                        marginBottom: 4
                      }}
                      placeholder="Image URL"
                    />
                    <input
                      value={b.caption}
                      onChange={(e) =>
                        updateBlock(b.id, { caption: e.target.value })
                      }
                      style={{
                        width: "100%",
                        padding: 4,
                        fontSize: 12
                      }}
                      placeholder="Caption (optional)"
                    />
                  </>
                )}
              </div>
            ))}
            {blocks.length === 0 && (
              <div style={{ marginTop: 4, fontSize: 11 }}>
                Or use the Body field below to create a single text block.
              </div>
            )}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{
                width: "100%",
                height: 80,
                padding: 4,
                fontSize: 13,
                fontFamily: "inherit",
                marginTop: 6
              }}
              placeholder="Optional fallback text block"
            />
          </div>
        )}

        {mode === "pdf" && (
          <div style={{ marginBottom: 8 }}>
            <div>PDF file</div>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
              }}
            />
          </div>
        )}

        {mode === "audio" && (
          <div style={{ marginBottom: 8 }}>
            <div>Audio file</div>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
              }}
            />
          </div>
        )}

        {error && (
          <div
            style={{ color: "#b00", fontSize: 12, marginBottom: 4 }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              marginRight: 8,
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid #ccc",
              background: "#f3f3f3"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid #4a6cff",
              background: "#4a6cff",
              color: "#fff",
              fontSize: 13
            }}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};
