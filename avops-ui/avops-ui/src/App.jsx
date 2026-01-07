import { useState } from "react";

const API_BASE = "http://localhost:8000/api/v1";

export default function App() {
  const [task, setTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function runCopilot() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzY3Nzk4OTI1LCJleHAiOjE3Njc4MDYxMjV9.V4YPsmDn9a6OJQw_qGCtJCfxC2YJNTGS3Or8e5kwL5o"; // from login if you have one

      const res = await fetch(`${API_BASE}/copilot/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ task }),
      });

      if (!res.ok) {
        throw new Error("Copilot request failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 32, fontFamily: "Inter, system-ui" }}>
      <h1>🎛️ AV Ops Copilot</h1>
      <p style={{ color: "#666" }}>
        Diagnose AV device issues using telemetry + AI
      </p>

      <textarea
        placeholder="e.g. Diagnose device-001 audio dropouts error E42"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          padding: 12,
          marginTop: 16,
          fontSize: 14,
        }}
      />

      <button
        onClick={runCopilot}
        disabled={!task || loading}
        style={{
          marginTop: 12,
          padding: "10px 16px",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        {loading ? "Running…" : "Run Copilot"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 16 }}>
          Error: {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: 24 }}>
          <h3>Diagnosis</h3>
          <ul>
            {result.output.diagnosis.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>

          <h3>Next Steps</h3>
          <ul>
            {result.output.next_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>

          {result.output.notes && (
            <>
              <h3>Notes</h3>
              <p>{result.output.notes}</p>
            </>
          )}

          <p style={{ marginTop: 16, color: "#777", fontSize: 12 }}>
            Generated at: {result.created_at}
          </p>
        </div>
      )}
    </div>
  );
}
