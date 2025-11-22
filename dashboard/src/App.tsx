import React, { useEffect, useState } from "react";
import type { Page } from "./types";
import { PRESET_TAGS } from "@news-capture/types";
import { TagEditor } from "./components/TagEditor";
import { PageContentRenderer } from "./components/PageContentRenderer";
import { UploadModal } from "./components/UploadModal";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

type Tab = "pages" | "log";

type TagStat = {
  tag: string;
  count: number;
};

export function App() {
  const [tab, setTab] = useState<Tab>("pages");
  const [pages, setPages] = useState<Page[]>([]);
  const [tags, setTags] = useState<TagStat[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const apiKey = localStorage.getItem("API_KEY") || "";

  const loadTags = async () => {
    if (!apiKey) return;
    const res = await fetch(`${API_BASE}/api/me/tags`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    setTags(data);
  };

  const loadPages = async (tag?: string | null) => {
    if (!apiKey) return;
    const params = new URLSearchParams();
    if (tag) params.set("tag", tag);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/api/me/pages${qs}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    setPages(data);
    if (data.length > 0) {
      setSelectedPage(data[0]);
    } else {
      setSelectedPage(null);
    }
  };

  useEffect(() => {
    if (!apiKey) return;
    void loadTags();
    void loadPages(selectedTag);
  }, [apiKey, selectedTag]);

  if (!apiKey) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Set API key</h2>
        <p>
          Put your API key into <code>localStorage.API_KEY</code> and reload.
        </p>
      </div>
    );
  }

  const userTagNames = tags.map((t) => t.tag);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      <div
        style={{
          width: 360,
          borderRight: "1px solid #eee",
          padding: 12,
          boxSizing: "border-box"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8
          }}
        >
          <div>
            <button
              onClick={() => setTab("pages")}
              style={{
                marginRight: 4,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid #ccc",
                background: tab === "pages" ? "#e1e7ff" : "#f7f7f7"
              }}
            >
              Pages
            </button>
            <button
              onClick={() => setTab("log")}
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid #ccc",
                background: tab === "log" ? "#e1e7ff" : "#f7f7f7"
              }}
            >
              Reading log
            </button>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              padding: "2px 10px",
              borderRadius: 999,
              border: "1px solid #4a6cff",
              background: "#4a6cff",
              color: "#fff",
              fontSize: 12
            }}
          >
            + New
          </button>
        </div>

        {tab === "pages" && (
          <>
            <div style={{ marginBottom: 8, fontSize: 12 }}>
              <span style={{ marginRight: 8 }}>Filter by tag:</span>
              <button
                onClick={() => setSelectedTag(null)}
                style={{
                  marginRight: 4,
                  padding: "2px 6px",
                  borderRadius: 12,
                  border: "1px solid #ccc",
                  background: selectedTag === null ? "#e1e7ff" : "#f7f7f7"
                }}
              >
                All
              </button>
              {PRESET_TAGS.map((tag) => (
                <button
                  key={`preset-${tag}`}
                  onClick={() =>
                    setSelectedTag((prev) => (prev === tag ? null : tag))
                  }
                  style={{
                    marginRight: 4,
                    padding: "2px 6px",
                    borderRadius: 12,
                    border: "1px solid #ccc",
                    background: selectedTag === tag ? "#e1e7ff" : "#f7f7f7"
                  }}
                >
                  {tag}
                </button>
              ))}
              {userTagNames
                .filter(
                  (tag) =>
                    !PRESET_TAGS.some(
                      (preset) =>
                        preset.toLowerCase() === tag.toLowerCase()
                    )
                )
                .map((tag) => (
                  <button
                    key={`user-${tag}`}
                    onClick={() =>
                      setSelectedTag((prev) => (prev === tag ? null : tag))
                    }
                    style={{
                      marginRight: 4,
                      padding: "2px 6px",
                      borderRadius: 12,
                      border: "1px solid #ccc",
                      background: selectedTag === tag ? "#e1e7ff" : "#f7f7f7"
                    }}
                  >
                    {tag}
                  </button>
                ))}
            </div>

            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                overflow: "hidden",
                maxHeight: "calc(100vh - 80px)"
              }}
            >
              <div
                style={{
                  padding: 8,
                  borderBottom: "1px solid #eee",
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                Your pages
              </div>
              <div
                style={{
                  maxHeight: "calc(100vh - 120px)",
                  overflowY: "auto"
                }}
              >
                {pages.map((p) => {
                  let hostname = "";
                  try {
                    hostname = new URL(p.url).hostname.replace(/^www\./, "");
                  } catch {
                    hostname = p.url;
                  }
                  const siteName = p.meta?.siteName || hostname;
                  const description =
                    p.meta?.metaDescription ||
                    p.meta?.ogDescription ||
                    p.meta?.twitterDescription ||
                    "";

                  return (
                    <div
                      key={p._id}
                      onClick={() => setSelectedPage(p)}
                      style={{
                        padding: 8,
                        borderBottom: "1px solid #f2f2f2",
                        cursor: "pointer",
                        background:
                          selectedPage?._id === p._id ? "#f0f4ff" : "#fff",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8
                      }}
                    >
                      {p.meta?.ogImage && (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 6,
                            overflow: "hidden",
                            flexShrink: 0,
                            border: "1px solid #eee",
                            background: "#fafafa"
                          }}
                        >
                          <img
                            src={p.meta.ogImage}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                          />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 2
                          }}
                        >
                          {p.title || p.meta?.ogTitle || "(No title)"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#666",
                            marginBottom: 2
                          }}
                        >
                          {siteName}
                        </div>
                        {description && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#555",
                              marginBottom: 4
                            }}
                          >
                            {description.length > 120
                              ? description.slice(0, 120) + "…"
                              : description}
                          </div>
                        )}
                        {p.tags && p.tags.length > 0 && (
                          <div style={{ fontSize: 10 }}>
                            {p.tags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  display: "inline-block",
                                  marginRight: 4,
                                  padding: "1px 5px",
                                  borderRadius: 999,
                                  border: "1px solid #eee"
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {pages.length === 0 && (
                  <div style={{ padding: 12, fontSize: 12, color: "#777" }}>
                    No pages yet. Capture via extension or click "New".
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "log" && (
          <div style={{ padding: 8, fontSize: 12 }}>
            Reading log view (streaks, daily time) can go here.
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          padding: 16,
          boxSizing: "border-box",
          maxWidth: 900,
          margin: "0 auto"
        }}
      >
        {!selectedPage && (
          <div style={{ fontSize: 14, color: "#777" }}>
            Select a page on the left.
          </div>
        )}
        {selectedPage && (
          <>
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 4
                }}
              >
                {selectedPage.title ||
                  selectedPage.meta?.ogTitle ||
                  "(No title)"}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>
                {selectedPage.url}
              </div>
            </div>

            {/* Summary view */}
            <SummaryPanel
              page={selectedPage}
              apiBase={API_BASE}
              apiKey={apiKey}
              onUpdated={(page) => setSelectedPage(page)}
            />

            <TagEditor
              apiBase={API_BASE}
              apiKey={apiKey}
              pageId={selectedPage._id}
              initialTags={selectedPage.tags}
              onChange={(tags) =>
                setSelectedPage({ ...selectedPage, tags })
              }
            />

            <div style={{ marginTop: 16 }}>
              <PageContentRenderer page={selectedPage} />
            </div>
          </>
        )}
      </div>

      {showUploadModal && (
        <UploadModal
          apiBase={API_BASE}
          apiKey={apiKey}
          onClose={() => {
            setShowUploadModal(false);
            void loadTags();
            void loadPages(selectedTag);
          }}
        />
      )}
    </div>
  );
}

type SummaryPanelProps = {
  page: Page;
  apiBase: string;
  apiKey: string;
  onUpdated: (page: Page) => void;
};

const SummaryPanel: React.FC<SummaryPanelProps> = ({
  page,
  apiBase,
  apiKey,
  onUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerResummarize = async () => {
    try {
      setLoading(true);
      setError(null);
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
      // optimistic UI: clear old summary while new one is generated
      onUpdated({
        ...page,
        summary: "",
        summaryProvider: "",
        summaryCreatedAt: ""
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to queue summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: 8,
        border: "1px solid #eee",
        padding: 10,
        marginBottom: 12,
        background: "#fafbff"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
          alignItems: "center"
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600 }}>Summary</div>
        <button
          onClick={triggerResummarize}
          disabled={loading}
          style={{
            padding: "2px 8px",
            borderRadius: 999,
            border: "1px solid #4a6cff",
            background: "#f0f3ff",
            color: "#1f32a0",
            fontSize: 11,
            cursor: "pointer"
          }}
        >
          {loading ? "Re-summarizing…" : "Re-summarize"}
        </button>
      </div>
      {error && (
        <div style={{ fontSize: 11, color: "#b00020", marginBottom: 4 }}>
          {error}
        </div>
      )}
      {page.summary ? (
        <div
          style={{
            fontSize: 12,
            whiteSpace: "pre-wrap",
            lineHeight: 1.5
          }}
        >
          {page.summary}
          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              color: "#777"
            }}
          >
            {page.summaryProvider && (
              <>Generated by {page.summaryProvider}. </>
            )}
            {page.summaryCreatedAt && (
              <>Last updated: {new Date(page.summaryCreatedAt).toLocaleString()}</>
            )}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#777" }}>
          No summary yet. It will be generated for new captures, or click
          &ldquo;Re-summarize&rdquo;.
        </div>
      )}
    </div>
  );
};
