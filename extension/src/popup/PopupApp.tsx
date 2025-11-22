import React, { useEffect, useState } from "react";
import type { ExtensionSettings } from "../types";

type LastCapture = {
  at: number;
  pageUrl: string;
  pageTitle: string;
};

type CaptureStatus =
  | { state: "idle" }
  | { state: "capturing" }
  | { state: "error"; message: string }
  | { state: "success"; title: string; pageId: string };

const defaultSettings: ExtensionSettings = {
  backendUrl: "",
  apiKey: "",
  defaultSharingMode: "private",
  dashboardUrl: ""
};

export const PopupApp: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(defaultSettings);
  const [status, setStatus] = useState<CaptureStatus>({ state: "idle" });
  const [lastCapture, setLastCapture] = useState<LastCapture | null>(null);

  useEffect(() => {
    chrome.storage.sync.get(
      ["backendUrl", "apiKey", "defaultSharingMode", "dashboardUrl"],
      (res) => {
        setSettings({
          backendUrl: res.backendUrl || "",
          apiKey: res.apiKey || "",
          defaultSharingMode: res.defaultSharingMode || "private",
          dashboardUrl: res.dashboardUrl || ""
        });
      }
    );
    chrome.storage.local.get(["lastCapture"], (res) => {
    if (res.lastCapture && typeof res.lastCapture.at === "number") {
      setLastCapture(res.lastCapture as LastCapture);
    }
  });
  }, []);

  const updateSettings = (patch: Partial<ExtensionSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    chrome.storage.sync.set(patch);
  };

  const handleCapture = () => {
    if (!settings.backendUrl || !settings.apiKey) {
      setStatus({
        state: "error",
        message: "Set backend URL and API key first."
      });
      return;
    }
    setStatus({ state: "capturing" });
    chrome.runtime.sendMessage({ type: "POPUP_CAPTURE_PAGE" }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus({
          state: "error",
          message: chrome.runtime.lastError.message || "Capture failed."
        });
        return;
      }
      if (!response || !response.ok) {
        setStatus({
          state: "error",
          message: response?.error || "Capture failed."
        });
        return;
      }
      setStatus({
        state: "success",
        title: response.pageTitle || "Captured",
        pageId: response.pageId   // <—
      });
      // Re-read last capture
      chrome.storage.local.get(["lastCapture"], (res) => {
        if (res.lastCapture && typeof res.lastCapture.at === "number") {
          setLastCapture(res.lastCapture as LastCapture);
        }
      });
    });
  };

  return (
    <div
      style={{
        width: 320,
        padding: 10,
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 13
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>News Capture</div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ marginBottom: 2 }}>Backend URL</div>
        <input
          value={settings.backendUrl}
          onChange={(e) => updateSettings({ backendUrl: e.target.value })}
          placeholder="http://localhost:4000"
          style={{
            width: "100%",
            padding: 4,
            fontSize: 12,
            boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ marginBottom: 2 }}>API key</div>
        <input
          value={settings.apiKey}
          onChange={(e) => updateSettings({ apiKey: e.target.value })}
          placeholder="sk_..."
          style={{
            width: "100%",
            padding: 4,
            fontSize: 12,
            boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ marginBottom: 2 }}>Default sharing</div>
        <select
          value={settings.defaultSharingMode}
          onChange={(e) =>
            updateSettings({
              defaultSharingMode: e.target
                .value as ExtensionSettings["defaultSharingMode"]
            })
          }
          style={{ width: "100%", padding: 4, fontSize: 12 }}
        >
          <option value="private">Private</option>
          <option value="unlisted">Unlisted</option>
          <option value="shared">Shared</option>
        </select>
      </div>
      <div style={{ marginBottom: 4 }}>
        <label style={{ fontSize: 12 }}>Dashboard URL</label>
        <input
          type="text"
          value={settings.dashboardUrl || ""}
          onChange={(e) =>
            updateSettings({dashboardUrl: e.target.value })
          }
          style={{ width: "100%" }}
        />
      </div>

      <button
        onClick={handleCapture}
        style={{
          width: "100%",
          padding: 6,
          borderRadius: 6,
          border: "1px solid #4a6cff",
          background: "#4a6cff",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        {status.state === "capturing" ? "Capturing…" : "Capture this page"}
      </button>

      <div style={{ marginTop: 8, minHeight: 20 }}>
        {status.state === "error" && (
          <div style={{ color: "#b00020" }}>{status.message}</div>
        )}
        {status.state === "success" && (
          <div style={{ color: "#0a7b25" }}>
            Saved: <strong>{status.title}</strong>
          </div>
        )}
        {status.state === "success" && status.pageId && (
          <button
            style={{
              marginTop: 6,
              padding: "6px 10px",
              fontSize: 12,
              borderRadius: 6,
              background: "#4a6cff",
              color: "white",
              border: "none",
              cursor: "pointer"
            }}
            onClick={() => {
              // dashboardUrl must exist in extension settings (sync storage)
              const dash = settings.dashboardUrl || "http://localhost:5174";
              const url = `${dash}/#/page/${status.pageId}`;
              chrome.tabs.create({ url });
            }}
          >
            View in dashboard →
          </button>
        )}
        {status.state === "idle" && (
          <div style={{ color: "#777" }}>Ready.</div>
        )}
        {status.state === "capturing" && (
          <div style={{ color: "#555" }}>Working…</div>
        )}
      </div>
      {lastCapture && (
        <div
          style={{
            marginTop: 8,
            padding: 6,
            borderRadius: 6,
            border: "1px solid #eee",
            background: "#fafafa",
            fontSize: 11
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>
            Last capture
          </div>
          <div
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: 2
            }}
            title={lastCapture.pageTitle}
          >
            {lastCapture.pageTitle || "(untitled page)"}
          </div>
          <div
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: "#666"
            }}
            title={lastCapture.pageUrl}
          >
            {lastCapture.pageUrl}
          </div>
          <div style={{ color: "#999", marginTop: 2 }}>
            {new Date(lastCapture.at).toLocaleString()}
          </div>
        </div>
        )}
    </div>
  );
};
