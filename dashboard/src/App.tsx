import React, { useEffect, useMemo, useState } from "react";
import type { Page } from "./types";
import { TagEditor } from "./components/TagEditor";
import { PageContentRenderer } from "./components/PageContentRenderer";
import { UploadModal } from "./components/UploadModal";
import type { TtsVoiceProfile } from "@news-capture/types";
import { ApiKeyPanel } from "./components/ApiKeyPanel";
import { LinkedDevicesPanel } from "./components/LinkedDevicesPanel";
import { UpgradeAccountPanel } from "./components/UpgradeAccountPanel";
import { EmailLoginPanel } from "./components/EmailLoginPanel";
import { getBackendUrl } from "./lib/getBackendUrl";
import { mediaUrl } from './lib/api';
import { PageAudioResponse } from "./types/pageAudio";
import { PageAudioEditor } from "./components/PageAudioEditor"

const BACKEND_URL = getBackendUrl();

type WeeklyDayStat = {
  key: string;
  label: string;
  minutes: number;
};

type StreakStats = {
  currentStreak: number;
  bestStreak: number;
};

type CalendarCell = {
  key: string;
  dayOfMonth: number;
  minutes: number;
  level: 0 | 1 | 2 | 3;
};

function getOrInitApiKey(): string | null {
  // 1) URL param ?apiKey=
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("apiKey");
  if (fromUrl) {
    localStorage.setItem("nc_api_key", fromUrl);
    // optionally, strip query param (not required)
    return fromUrl;
  }

  // 2) Saved in localStorage
  const stored = localStorage.getItem("nc_api_key");
  if (stored) {
    return stored;
  }

  // 3) No key? Let this browser have its own device key
  //    (this case applies when user visits dashboard directly, not from extension)
  return null;
}

function computeStreakStats(pages: Page[]): StreakStats {
  if (!pages.length) return { currentStreak: 0, bestStreak: 0 };

  const dateSet = new Set<string>();
  for (const p of pages) {
    const key = localDateKeyFromISO((p as any).createdAt || "");
    if (key) dateSet.add(key);
  }

  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  const parseKey = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const isNextDay = (a: Date, b: Date) => {
    const next = new Date(a);
    next.setDate(next.getDate() + 1);
    return (
      next.getFullYear() === b.getFullYear() &&
      next.getMonth() === b.getMonth() &&
      next.getDate() === b.getDate()
    );
  };

  const dates = Array.from(dateSet).sort(); // asc

  // best streak
  let best = 0;
  let i = 0;
  while (i < dates.length) {
    let run = 1;
    let current = parseKey(dates[i]);
    let j = i + 1;
    while (j < dates.length && isNextDay(current, parseKey(dates[j]))) {
      run++;
      current = parseKey(dates[j]);
      j++;
    }
    if (run > best) best = run;
    i = j;
  }

  // current streak: from latest backwards
  let currentStreak = 0;
  if (dates.length) {
    let cur = parseKey(dates[dates.length - 1]);
    currentStreak = 1;
    while (true) {
      const prev = new Date(cur);
      prev.setDate(prev.getDate() - 1);
      const prevStr =
        prev.getFullYear() +
        "-" +
        pad(prev.getMonth() + 1) +
        "-" +
        pad(prev.getDate());
      if (dateSet.has(prevStr)) {
        currentStreak++;
        cur = prev;
      } else {
        break;
      }
    }
  }

  return { currentStreak, bestStreak: best };
}

function buildCalendarHeatmap(pages: Page[]): CalendarCell[] {
  const minutesByKey = new Map<string, number>();
  for (const p of pages) {
    const key = localDateKeyFromISO((p as any).createdAt || "");
    if (!key) continue;
    const prev = minutesByKey.get(key) || 0;
    minutesByKey.set(key, prev + estimateMinutes(p));
  }

  const cells: CalendarCell[] = [];
  const today = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);

  // last 30 days (oldest → newest)
  for (let offset = 29; offset >= 0; offset--) {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    const key =
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate());
    const minutes = minutesByKey.get(key) || 0;

    let level: 0 | 1 | 2 | 3 = 0;
    if (minutes > 0 && minutes <= 10) level = 1;
    else if (minutes <= 30) level = 2;
    else if (minutes > 30) level = 3;

    cells.push({
      key,
      dayOfMonth: d.getDate(),
      minutes,
      level
    });
  }

  return cells;
}

function estimateMinutes(page: Page): number {
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

function buildWeeklySeries(pages: Page[]): WeeklyDayStat[] {
  const today = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);

  const dayLabel = (d: Date) => {
    const names = ["S", "M", "T", "W", "T", "F", "S"];
    return names[d.getDay()];
  };

  const minutesByKey = new Map<string, number>();
  for (const p of pages) {
    const key = localDateKeyFromISO((p as any).createdAt || "");
    if (!key) continue;
    const prev = minutesByKey.get(key) || 0;
    minutesByKey.set(key, prev + estimateMinutes(p));
  }

  const series: WeeklyDayStat[] = [];
  const start = new Date(today);
  start.setDate(start.getDate() - 6); // 6 days ago

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key =
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate());
    const minutes = minutesByKey.get(key) || 0;
    series.push({
      key,
      label: dayLabel(d),
      minutes
    });
  }

  return series;
}
const CalendarHeatmapPanel: React.FC<{ cells: CalendarCell[] }> = ({
  cells
}) => {
  if (!cells.length) return null;

  const cols = 7;
  const rows: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += cols) {
    rows.push(cells.slice(i, i + cols));
  }

  const colorForLevel = (level: 0 | 1 | 2 | 3) => {
    switch (level) {
      case 0:
        return "#f4f5fb";
      case 1:
        return "#d8ddff";
      case 2:
        return "#aab5ff";
      case 3:
        return "#4a6cff";
    }
  };

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
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 4
        }}
      >
        Last 30 days
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 3
        }}
      >
        {rows.map((row, idx) => (
          <div
            key={idx}
            style={{ display: "flex", gap: 3, justifyContent: "flex-start" }}
          >
            {row.map((cell) => (
              <div
                key={cell.key}
                title={`${cell.dayOfMonth}: ${cell.minutes} min`}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: colorForLevel(cell.level),
                  border: "1px solid #e0e2f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    color: cell.level >= 2 ? "#fff" : "#555"
                  }}
                >
                  {cell.dayOfMonth}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 4,
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 9,
          color: "#555"
        }}
      >
        <span>Intensity:</span>
        {[0, 1, 2, 3].map((lvl) => (
          <div
            key={lvl}
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: colorForLevel(lvl as 0 | 1 | 2 | 3),
              border: "1px solid #e0e2f5"
            }}
          />
        ))}
      </div>
    </div>
  );
};

const WeeklyChartPanel: React.FC<{ series: WeeklyDayStat[] }> = ({
  series
}) => {
  if (!series.length) return null;
  const max = Math.max(...series.map((d) => d.minutes), 1);

  return (
    <div
      style={{
        marginBottom: 10,
        padding: 8,
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "#f7f8ff"
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 4
        }}
      >
        Weekly minutes
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          height: 60
        }}
      >
        {series.map((day) => {
          const ratio = day.minutes / max;
          const barHeight = Math.max(4, ratio * 100); // percentage of container
          return (
            <div
              key={day.key}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}
              title={`${day.minutes} min`}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-end",
                  width: "100%"
                }}
              >
                <div
                  style={{
                    width: "100%",
                    background: "#dde2ff",
                    borderRadius: 4,
                    overflow: "hidden",
                    height: "100%"
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${barHeight}%`,
                      background: "#4a6cff",
                      borderRadius: 4
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#555",
                  marginTop: 2
                }}
              >
                {day.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(() => getOrInitApiKey());
  const [initializing, setInitializing] = useState(false);

  const [pages, setPages] = useState<Page[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function bootstrapApiKeyFromHash() {
      const hash = window.location.hash.substring(1); // remove '#'
      const params = new URLSearchParams(hash);
      const keyFromHash = params.get("apikey");

      if (keyFromHash) {
        // Store it locally for this origin
        localStorage.setItem("nc_api_key", keyFromHash);

        // Remove key from URL so it doesn't stay in address bar / history
        params.delete("apikey");
        const newHash = params.toString();
        const newUrl =
          window.location.pathname +
          window.location.search +
          (newHash ? "#" + newHash : "");

        window.history.replaceState(null, "", newUrl);
        console.log("Imported apiKey from URL hash");
      }
    }

    if (window.location.hash.startsWith("#")){
      bootstrapApiKeyFromHash();
      const stored = localStorage.getItem("nc_api_key");
      if (stored) {
        setApiKey(stored);
        return;
      }
    }

    const init = async () => {
      if(apiKey) return;
      setInitializing(true);
      try {
        const url = `${BACKEND_URL}/api/auth/device`;
        console.log("web dash createDeviceUser URL", url);  // 👈 add this
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceLabel: "Web dashboard" })
        });
        if (!resp.ok) return;
        const data = await resp.json();
        localStorage.setItem("nc_api_key", data.apiKey);
        setApiKey(data.apiKey);
      } finally {
        setInitializing(false);
      }
    };
    void init();
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey) return;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (tagFilter) params.set("tag", tagFilter);
        const url  = `${BACKEND_URL}/api/me/pages?${params}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` }
        });
        const text = await res.text();
        if (!res.ok) {
          console.error("Backend error", res.status, url, text.slice(0, 200));
          throw new Error(`HTTP ${res.status} for ${url}`);
        }

        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          console.error("Non-JSON from backend at", url, "body:", text.slice(0, 500));
          throw new Error("Expected JSON from backend but got non-JSON");
        }
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

  const weeklySeries = useMemo(() => buildWeeklySeries(pages), [pages]);

  const streakStats = useMemo(
    () => computeStreakStats(pages),
    [pages]
  );
  const calendarCells = useMemo(
    () => buildCalendarHeatmap(pages),
    [pages]
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
                {/* API key + QR */}
                {apiKey && (
                  <>
                    <ApiKeyPanel
                      apiKey={apiKey}
                      backendUrl={BACKEND_URL}
                      dashboardUrl={window.location.origin}
                    />
                    <UpgradeAccountPanel apiBase={BACKEND_URL} apiKey={apiKey} />
                    <EmailLoginPanel
                      apiBase={BACKEND_URL}
                      currentApiKey={apiKey}
                      onLoggedIn={(newKey) => setApiKey(newKey)}
                    />
                    <LinkedDevicesPanel apiBase={BACKEND_URL} apiKey={apiKey} />
                  </>
                )}
                {/* Streak stats + badge */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Streak</div>
                    <div style={{ fontSize: 12 }}>
                      Current: {streakStats.currentStreak} day
                      {streakStats.currentStreak === 1 ? "" : "s"} · Best:{" "}
                      {streakStats.bestStreak} day
                      {streakStats.bestStreak === 1 ? "" : "s"}
                    </div>
                  {streakStats.currentStreak >= 3 &&
                    streakStats.currentStreak === streakStats.bestStreak && (
                    <div
                      style={{
                      fontSize: 11,
                      color: "#d35400",
                      marginTop: 2,
                      fontWeight: 600
                    }}
                    >
                      🔥 New best streak!
                    </div>
                  )}
                </div>
                {/* Weekly bar chart */}
                <WeeklyChartPanel series={weeklySeries} />

                {/* 30-day calendar heatmap */}
                <CalendarHeatmapPanel cells={calendarCells} />

                {/* Existing panels */}
                <SummaryPanel
                  apiBase={BACKEND_URL}
                  apiKey={apiKey}
                  page={selectedPage}
                  onUpdated={handlePageUpdated}
                />
                <TtsPanel
                  apiBase={BACKEND_URL}
                  apiKey={apiKey}
                  page={selectedPage}
                  onUpdated={handlePageUpdated}
                />
                <TagEditor
                  apiBase={BACKEND_URL}
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
          apiBase={BACKEND_URL}
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
  const [audio, setAudio] = useState<PageAudioResponse | null>(null);

  useEffect(() => {
    if (page.tts?.voiceProfile) {
      setVoice(page.tts.voiceProfile as TtsVoiceProfile);
    }
    setError(null);
    // fetch `/api/pages/:id/audio` into `audio`
    (async function fetchTtsAudio () {
      try {
        const res = await fetch(`${apiBase}/api/pages/${page._id}/audio`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          }
        });
        if (!res.ok) {
          const txt = await res.text();
          if(res.statusText === "Not Found"){
            return null;
          } else {
            throw new Error(txt || "Failed to fetch page audio");
          }
        } else {
          const ttsAudio = await res.json();
          setAudio(ttsAudio);
        }
      } catch(error: any){
        if (error.message === "404") {
          // Page has no TTS yet
          return null;
        } else {
          throw new Error(error || "Failed to fetch page audio");
        }
      }
    })()
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
            src={mediaUrl(page.tts.src)}
            style={{ width: "100%", marginTop: 4 }}
          />
        </div>
      )}
      {audio && <PageAudioEditor audio={audio} onSave={chunks => {
        setAudio(prev => prev ? { ...prev, chunks } : prev);
      }} />}
      {error && (
        <div style={{ fontSize: 11, color: "#b00", marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
};
