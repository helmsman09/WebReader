import React, { useState } from "react";

interface UpgradeAccountPanelProps {
  apiBase: string;
  apiKey: string;
}

export const UpgradeAccountPanel: React.FC<UpgradeAccountPanelProps> = ({
  apiBase,
  apiKey
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !submitting &&
    !success &&
    email.trim().length > 3 &&
    password.length >= 6 &&
    password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/auth/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({ email: email.trim(), password })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Upgrade failed");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Upgrade failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        marginBottom: 10,
        padding: 8,
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "#fffef8"
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 4
        }}
      >
        Upgrade to full account
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#555",
          marginBottom: 6
        }}
      >
        Set an email and password so you can log in from any browser without
        relying on this device’s API key.
      </div>

      {success ? (
        <div style={{ fontSize: 12, color: "#2b5b34" }}>
          ✅ Upgrade complete. You can now log in with this email and password.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 11, display: "block" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", fontSize: 12, padding: 4 }}
              required
            />
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 11, display: "block" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", fontSize: 12, padding: 4 }}
              minLength={6}
              required
            />
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 11, display: "block" }}>
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{ width: "100%", fontSize: 12, padding: 4 }}
              minLength={6}
              required
            />
          </div>
          {password !== confirm && confirm.length > 0 && (
            <div style={{ fontSize: 11, color: "#b00020", marginBottom: 4 }}>
              Passwords do not match.
            </div>
          )}
          {error && (
            <div style={{ fontSize: 11, color: "#b00020", marginBottom: 4 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              marginTop: 4,
              padding: "4px 10px",
              fontSize: 12,
              borderRadius: 6,
              border: "1px solid #f0c36d",
              background: canSubmit ? "#ffe082" : "#f5f5f5",
              cursor: canSubmit ? "pointer" : "default"
            }}
          >
            {submitting ? "Upgrading…" : "Upgrade account"}
          </button>
        </form>
      )}
    </div>
  );
};
