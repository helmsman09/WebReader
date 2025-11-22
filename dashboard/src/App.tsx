import React, { useEffect, useMemo, useState } from "react";
import type { Page } from "./types";
import { TagEditor } from "./components/TagEditor";
import { PageContentRenderer } from "./components/PageContentRenderer";
import { UploadModal } from "./components/UploadModal";
import type { TtsVoiceProfile } from "@news-capture/types";

const API_BASE = "http://localhost:4000";

export const App: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiKey = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("API_KEY") || "";
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (tagFilter) params.set("tag", tagFilter);
        const res = await fetch(`${API_BASE}/api/me/pages?${params}`, {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Failed to load pages");
        }
        const data = await res.json();
        setPages(data);
        if (!selectedId && data.length > 0) {
          setSelectedId(data[0]._id);
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to load");
      }
    })();
  }, [apiKey, tagFilter]);

  const selectedPage = useMemo(
    () => pages.find((p) => p._id === selectedId) || null,
    [pages, selectedId]
  );

  const handlePageUpdated = (updated: Page) => {
    setPages((prev) =>
      prev.map((p) => (p._id === updated._id ? updated : p))
    );
  };

  const distinctTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of pages) for (const t of p.tags) set.add(t);
    return Array.from(set).sort();
  }, [pages]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 13,
        color: "#222"
      }}
    >
      <div
        style={{
          width: 280,
          borderRight: "1px solid #ddd",
          padding: 8,
          display: "flex",
          flexDirection: "column"
        }}
      >
        <div style={{ display: "flex", marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>
            Reading log
          </div>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              padding: "2px 8px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: "#f3f3f3",
              fontSize: 12,
              cursor: "pointer"
            }}
          >
            + New
          </button>
        </div>

        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 11, marginBottom: 2 }}>Filter by tag</div>
          <select
            value={tagFilter || ""}
            onChange={(e) =>
              setTagFilter(e.target.value || null)
            }
            style={{ width: "100%", fontSize: 12 }}
          >
            <option value="">All</option>
            {distinctTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 11, color: "#777", marginBottom: 4 }}>
          {pages.length} pages
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {pages.map((page) => (
            <div
              key={page._id}
              onClick={() => setSelectedId(page._id)}
              style={{
                padding: 6,
                marginBottom: 4,
                borderRadius: 6,
                border:
                  page._id === selectedId
                    ? "1px solid #4a6cff"
                    : "1px solid #eee",
                background:
                  page._id === selectedId ? "#eef1ff" : "#fff",
                cursor: "pointer"
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 2
                }}
              >
                {page.title || "(No title)"}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#666",
                  marginBottom: 2
                }}
              >
                {page.meta?.siteName ||
                  new URL(page.url).hostname.replace(/^www\\./, "")}
              </div>
              {page.meta?.metaDescription && (
                <div
                  style={{
                    fontSize: 10,
                    color: "#555",
                    marginBottom: 2
                  }}
                >
                  {page.meta.metaDescription}
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {page.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 10,
                      padding: "1px 4px",
                      borderRadius: 999,
                      border: "1px solid #ddd",
                      marginRight: 2,
                      marginBottom: 2
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        {error && (
          <div style={{ fontSize: 11, color: "#b00", marginTop: 4 }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {selectedPage ? (
          <>
            <div
              style={{
                padding: 10,
                borderBottom: "1px solid #ddd",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {selectedPage.title || "(No title)"}
                </div>
                <div style={{ fontSize: 11, color: "#666" }}>
                  {selectedPage.url}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              <div
                style={{
                  flex: 2,
                  padding: 12,
                  overflowY: "auto",
                  borderRight: "1px solid #f0f0f0"
                }}
              >
                <PageContentRenderer page={selectedPage} />
              </div>
              <div
                style={{
                  flex: 1,
                  padding: 10,
                  overflowY: "auto"
                }}
              >
                <SummaryPanel
                  apiBase={API_BASE}
                  apiKey={apiKey}
                  page={selectedPage}
                  onUpdated={handlePageUpdated}
                />
                <TtsPanel
                  apiBase={API_BASE}
                  apiKey={apiKey}
                  page={selectedPage}
                  onUpdated={handlePageUpdated}
                />
                <TagEditor
                  apiBase={API_BASE}
                  apiKey={apiKey}
                  pageId={selectedPage._id}
                  initialTags={selectedPage.tags}
                  onChange={(tags) =>
                    handlePageUpdated({
                      ...selectedPage,
                      tags
                    } as Page)
                  }
                />
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: "#777"
            }}
          >
            No page selected.
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          apiBase={API_BASE}
          apiKey={apiKey}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
};

type PanelProps = {
  apiBase: string;
  apiKey: string;
  page: Page;
  onUpdated: (page: Page) => void;
};

const SummaryPanel: React.FC<PanelProps> = ({
  apiBase,
  apiKey,
  page,
  onUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [localSummary, setLocalSummary] = useState(page.summary || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalSummary(page.summary || "");
    setError(null);
  }, [page._id, page.summary]);

  const handleResummarize = async () => {
    try {
      setLoading(true);
      setError(null);
      setLocalSummary("");
      const res = await fetch(`${apiBase}/api/pages/${page._id}/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        }
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to queue summary");
      }
      const updated: Page = {
        ...page,
        summary: "",
        summaryProvider: "",
        summaryCreatedAt: ""
      } as any;
      onUpdated(updated);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to queue summary");
    } finally {
      setLoading(false);
    }
  };

  const summaryText = localSummary || page.summary || "";

  return (
    <div
      style={{
        marginBottom: 10,
        padding: 8,
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "#fafbff"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600 }}>Summary</div>
        <button
          onClick={handleResummarize}
          disabled={loading}
          style={{
            borderRadius: 999,
            border: "1px solid #4a6cff",
            background: "#4a6cff",
            color: "#fff",
            fontSize: 11,
            padding: "2px 6px",
            cursor: "pointer"
          }}
        >
          {loading ? "Queuing…" : "Re-summarize"}
        </button>
      </div>
      {summaryText ? (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 12,
            lineHeight: 1.5,
            margin: 0
          }}
        >
          {summaryText}
        </pre>
      ) : (
        <div style={{ fontSize: 12, color: "#777" }}>
          No summary yet. After a few seconds, refresh to see it.
        </div>
      )}
      {page.summaryProvider && page.summaryCreatedAt && (
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: "#888"
          }}
        >
          Provider: {page.summaryProvider} · Updated:{" "}
          {new Date(page.summaryCreatedAt).toLocaleString()}
        </div>
      )}
      {error && (
        <div style={{ fontSize: 11, color: "#b00", marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
};

const TtsPanel: React.FC<PanelProps> = ({
  apiBase,
  apiKey,
  page,
  onUpdated
}) => {
  const [voice, setVoice] = useState<TtsVoiceProfile>(
    (page.tts?.voiceProfile as TtsVoiceProfile) || "man"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (page.tts?.voiceProfile) {
      setVoice(page.tts.voiceProfile as TtsVoiceProfile);
    }
    setError(null);
  }, [page._id, page.tts?.voiceProfile]);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/api/pages/${page._id}/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ voiceProfile: voice })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to queue TTS");
      }
      const updated: Page = {
        ...page,
        tts: page.tts || null
      } as any;
      onUpdated(updated);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to queue TTS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        marginBottom: 10,
        padding: 8,
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "#f8f9ff"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600 }}>
          Text-to-speech
        </div>
      </div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, marginBottom: 2 }}>Voice</div>
        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value as TtsVoiceProfile)}
          style={{ width: "100%", fontSize: 12 }}
        >
          <option value="boy">Boy</option>
          <option value="girl">Girl</option>
          <option value="man">Man</option>
          <option value="woman">Woman</option>
        </select>
      </div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          borderRadius: 6,
          border: "1px solid #4a6cff",
          background: "#4a6cff",
          color: "#fff",
          fontSize: 11,
          padding: "4px 8px",
          cursor: "pointer",
          width: "100%"
        }}
      >
        {loading ? "Queuing TTS…" : "Generate TTS audio"}
      </button>
      {page.tts && (
        <div style={{ marginTop: 6, fontSize: 11 }}>
          <div>
            Latest: {page.tts.voiceProfile} ·{" "}
            {new Date(page.tts.createdAt).toLocaleString()}
          </div>
          <audio
            controls
            src={page.tts.audioUrl}
            style={{ width: "100%", marginTop: 4 }}
          />
        </div>
      )}
      {error && (
        <div style={{ fontSize: 11, color: "#b00", marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
};
