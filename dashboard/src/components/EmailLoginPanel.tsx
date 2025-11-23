import React, { useState } from "react";

interface EmailLoginPanelProps {
  apiBase: string;
  currentApiKey: string | null;
  onLoggedIn: (newApiKey: string) => void;
}

export const EmailLoginPanel: React.FC<EmailLoginPanelProps> = ({
  apiBase,
  currentApiKey,
  onLoggedIn
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !submitting && email.trim().length > 3 && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/auth/login-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          deviceLabel: "Web dashboard",
          mergeFromApiKey: currentApiKey || undefined
        })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Login failed");
      }

      const data = await res.json();
      const newKey = data.apiKey as string;
      if (!newKey) {
        throw new Error("No apiKey returned from server.");
      }

      // Save in localStorage so App picks it up on reload
      localStorage.setItem("nc_api_key", newKey);
      onLoggedIn(newKey);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Login failed");
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
        background: "#f0f7ff"
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 4
        }}
      >
        Already upgraded? Log in via email
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#555",
          marginBottom: 6
        }}
      >
        If you’ve already upgraded to a full account, log in here to attach
        this browser to your main reading profile.
      </div>

      {success ? (
        <div style={{ fontSize: 12, color: "#2b5b34" }}>
          ✅ Logged in. This browser is now linked to your full account.
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
              border: "1px solid #4a6cff",
              background: canSubmit ? "#e0e7ff" : "#f5f5f5",
              cursor: canSubmit ? "pointer" : "default"
            }}
          >
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>
      )}
    </div>
  );
};
