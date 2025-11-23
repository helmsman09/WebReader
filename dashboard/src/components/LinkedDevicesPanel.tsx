import React, { useEffect, useState } from "react";

interface DeviceInfo {
  id: string;
  label: string;
  isPrimary: boolean;
  isRevoked: boolean;
  createdAt: string;
  lastSeenAt?: string;
  hasEmail: boolean;
}

interface Props {
  apiBase: string;
  apiKey: string;
}

export const LinkedDevicesPanel: React.FC<Props> = ({
  apiBase,
  apiKey
}) => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/me/devices`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setDevices(data);
    } catch (e: any) {
      setError(e.message || "Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const revokeDevice = async (id: string) => {
    if (!confirm("Revoke this device? It will no longer be able to sync.")) {
      return;
    }
    const res = await fetch(`${apiBase}/api/me/devices/revoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ deviceId: id })
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    void load();
  };

  const rotateKey = async (id: string) => {
    if (!confirm("Rotate API key for this device? Old key will stop working.")) {
      return;
    }
    const res = await fetch(`${apiBase}/api/me/devices/rotate-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ deviceId: id })
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    const data = await res.json();
    alert(`New API key: ${data.apiKey}\n(Show QR or copy to that device.)`);
    void load();
  };

  if (loading && !devices.length) {
    return <div>Loading devices…</div>;
  }
  if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }

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
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
        Linked devices
      </div>
      {devices.length === 0 && (
        <div style={{ fontSize: 12 }}>No devices yet.</div>
      )}
      {devices.map((d) => (
        <div
          key={d.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
            fontSize: 12
          }}
        >
          <div>
            <div>
              {d.label}{" "}
              {d.isPrimary && (
                <span style={{ color: "#2b5b34" }}>(primary)</span>
              )}
              {d.isRevoked && (
                <span style={{ color: "#b00020" }}> [revoked]</span>
              )}
            </div>
            <div style={{ color: "#777", fontSize: 11 }}>
              Created: {new Date(d.createdAt).toLocaleString()}
              {d.lastSeenAt &&
                ` · Last seen: ${new Date(d.lastSeenAt).toLocaleString()}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {!d.isRevoked && !d.isPrimary && (
              <>
                <button
                  style={{ fontSize: 11 }}
                  onClick={() => revokeDevice(d.id)}
                >
                  Revoke
                </button>
                <button
                  style={{ fontSize: 11 }}
                  onClick={() => rotateKey(d.id)}
                >
                  Rotate key
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
