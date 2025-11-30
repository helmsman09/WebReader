import React, { useState } from "react";
import type { PageAudioResponse, PageAudioChunk } from "../types/pageAudio";

interface Props {
  audio: PageAudioResponse; // from your backend
  onSave?: (updated: PageAudioChunk[]) => void;
}

export const PageAudioEditor: React.FC<Props> = ({ audio, onSave }) => {
  const [chunks, setChunks] = useState<PageAudioChunk[]>(audio.chunks);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (idx: number, field: "start" | "end", value: string) => {
    const num = value === "" ? null : Number(value);
    setChunks(prev =>
      prev.map((c, i) =>
        i === idx ? { ...c, [field]: Number.isNaN(num) ? c[field] : num } : c
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch(
        `/api/pages/${audio.pageId}/audio/${audio.id}`, // include audio.id in response
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chunks }),
        }
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
      }
      if (onSave) onSave(chunks);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
      <h3>Audio Chunk Editor</h3>
      <p style={{ fontSize: 12, color: "#666" }}>
        Adjust start/end times (seconds). This affects paragraph highlighting & navigation.
      </p>

      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Start (s)</th>
            <th>End (s)</th>
            <th>Text snippet</th>
          </tr>
        </thead>
        <tbody>
          {chunks.map((c, i) => (
            <tr key={c.index} style={{ borderTop: "1px solid #eee" }}>
              <td>{c.index + 1}</td>
              <td>
                <input
                  type="number"
                  step="0.05"
                  value={c.start ?? ""}
                  onChange={e => handleFieldChange(i, "start", e.target.value)}
                  style={{ width: 80 }}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.05"
                  value={c.end ?? ""}
                  onChange={e => handleFieldChange(i, "end", e.target.value)}
                  style={{ width: 80 }}
                />
              </td>
              <td>
                <div style={{ maxWidth: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.text}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && (
        <div style={{ color: "red", marginTop: 8 }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ marginTop: 8 }}
      >
        {saving ? "Saving..." : "Save timings"}
      </button>
    </div>
  );
};
