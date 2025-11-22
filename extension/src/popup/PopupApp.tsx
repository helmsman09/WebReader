import React, { useEffect, useState } from "react";
import type { ExtensionSettings } from "../types";

type CaptureStatus =
  | { state: "idle" }
  | { state: "capturing" }
  | { state: "success"; title: string }
  | { state: "error"; message: string };

const defaultSettings: ExtensionSettings = {
  backendUrl: "",
  apiKey: "",
  defaultSharingMode: "private"
};

export const PopupApp: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(defaultSettings);
  const [status, setStatus] = useState<CaptureStatus>({ state: "idle" });

  useEffect(() => {
    chrome.storage.sync.get(
      ["backendUrl", "apiKey", "defaultSharingMode"],
      (res) => {
        setSettings({
          backendUrl: res.backendUrl || "",
          apiKey: res.apiKey || "",
          defaultSharingMode: res.defaultSharingMode || "private"
        });
      }
    );
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
        title: response.pageTitle || "Captured"
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
        {status.state === "idle" && (
          <div style={{ color: "#777" }}>Ready.</div>
        )}
        {status.state === "capturing" && (
          <div style={{ color: "#555" }}>Working…</div>
        )}
      </div>
    </div>
  );
};
