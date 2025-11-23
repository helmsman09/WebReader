import React, { useState, useMemo } from "react";
import { QRCodeSVG as QRCode } from "qrcode.react";

interface ApiKeyPanelProps {
  apiKey: string;
  backendUrl: string;
  dashboardUrl: string;
}

export const ApiKeyPanel: React.FC<ApiKeyPanelProps> = ({
  apiKey,
  backendUrl,
  dashboardUrl
}) => {
  const [visible, setVisible] = useState(false);

  const masked = useMemo(() => {
    if (!apiKey) return "(no key)";
    if (apiKey.length <= 8) return "••••" + apiKey.slice(-4);
    return apiKey.slice(0, 4) + "••••" + apiKey.slice(-4);
  }, [apiKey]);

  const qrPayload = useMemo(
    () =>
      JSON.stringify({
        apiKey,
        backendUrl,
        dashboardUrl
      }),
    [apiKey, backendUrl, dashboardUrl]
  );

  return (
    <div
      style={{
        marginBottom: 10,
        padding: 8,
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "#f8fafc"
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 4
        }}
      >
        Device API key
      </div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>
        <span style={{ fontFamily: "monospace" }}>
          {visible ? apiKey : masked}
        </span>
        <button
          style={{
            marginLeft: 8,
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer"
          }}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>
        Scan this QR from your mobile app to link the same reading profile.
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <QRCode value={qrPayload} size={128} />
      </div>
    </div>
  );
};
