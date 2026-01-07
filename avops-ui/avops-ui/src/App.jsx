import { useEffect, useMemo, useRef, useState } from "react";

/**
 * ✅ IMPORTANT:
 * Your backend has BOTH:
 *   /health (root)
 *   /api/v1/... (versioned)
 *
 * So base must be ROOT, not /api/v1, otherwise /health breaks.
 */
const DEFAULT_BASE = "http://localhost:8000";

const STATIC_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNzY3Nzk4OTI1LCJleHAiOjE3Njc4MDYxMjV9.V4YPsmDn9a6OJQw_qGCtJCfxC2YJNTGS3Or8e5kwL5o";

/**
 * ✅ Endpoints EXACTLY matching your pasted OpenAPI.
 * Notes:
 * - Login is x-www-form-urlencoded
 * - device/reset expects query param device_id (NOT body)
 * - telemetry/events endpoints require auth
 * - copilot endpoints require auth
 */
const DEFAULT_ENDPOINTS = [
  // Health (root + v1)
  { group: "Health", method: "GET", path: "/health", name: "Health (root)", hint: "Quick ping" },
  { group: "Health", method: "GET", path: "/", name: "Root", hint: "Root endpoint" },
  { group: "Health", method: "GET", path: "/api/v1/health", name: "Health (v1)", hint: "Versioned ping" },

  // Auth
  {
    group: "Auth",
    method: "POST",
    path: "/api/v1/auth/register",
    name: "Register",
    hint: "JSON body",
    body: { email: "test@example.com", password: "Password123!" },
  },
  {
    group: "Auth",
    method: "POST",
    path: "/api/v1/auth/login",
    name: "Login (form)",
    hint: "x-www-form-urlencoded (username/password). Auto-saves token on success.",
    body: { username: "test@example.com", password: "Password123!" },
    meta: { contentType: "application/x-www-form-urlencoded" },
  },

  // Telemetry
  {
    group: "Telemetry",
    method: "POST",
    path: "/api/v1/telemetry/ingest",
    name: "Ingest Telemetry",
    hint: "JSON body (TelemetryPayload)",
    body: { device_id: "001", temperature: 42.5, packet_loss: 1.2, audio_dropouts: 3, error_code: "E42" },
  },
  {
    group: "Telemetry",
    method: "GET",
    path: "/api/v1/telemetry/latest",
    name: "Latest Telemetry (all)",
    hint: "Latest records for all devices",
  },
  {
    group: "Telemetry",
    method: "GET",
    path: "/api/v1/telemetry/latest/{device_id}",
    name: "Latest Telemetry (device)",
    hint: "Replace {device_id}",
    params: { device_id: "001" },
  },
  {
    group: "Telemetry",
    method: "GET",
    path: "/api/v1/telemetry/events",
    name: "List Events (auth)",
    hint: "Query: device_id (optional), limit (<=200), offset. Requires token.",
  },
  {
    group: "Telemetry",
    method: "GET",
    path: "/api/v1/telemetry/events/{event_id}",
    name: "Get Event (auth)",
    hint: "Replace {event_id}. Requires token.",
    params: { event_id: 1 },
  },

  // Predict
  {
    group: "Predict",
    method: "POST",
    path: "/api/v1/predict/risk",
    name: "Predict Risk",
    hint: "JSON body (TelemetryPayload)",
    body: { device_id: "001", temperature: 42.5, packet_loss: 1.2, audio_dropouts: 3, error_code: "E42" },
  },

  // Device
  {
    group: "Device",
    method: "POST",
    path: "/api/v1/device/reset",
    name: "Reset Device (auth)",
    hint: "Requires query param: device_id=001 (no body). Requires token.",
  },

  // Copilot
  {
    group: "Copilot",
    method: "POST",
    path: "/api/v1/copilot/run",
    name: "Copilot Run (auth)",
    hint: "JSON body { task }. Requires token.",
    body: { task: "Diagnose device 001 audio dropouts error E42" },
  },
  {
    group: "Copilot",
    method: "GET",
    path: "/api/v1/copilot/runs",
    name: "List Copilot Runs (auth)",
    hint: "Query: limit (<=100), offset. Requires token.",
  },
  {
    group: "Copilot",
    method: "GET",
    path: "/api/v1/copilot/runs/{run_id}",
    name: "Get Copilot Run (auth)",
    hint: "Replace {run_id}. Requires token.",
    params: { run_id: 1 },
  },
];

function cls(...xs) {
  return xs.filter(Boolean).join(" ");
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: text };
  }
}

function pretty(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function nowIso() {
  const d = new Date();
  return d.toISOString();
}

function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function buildCurl({ baseUrl, method, urlPath, token, headers, body }) {
  const fullUrl = `${baseUrl}${urlPath}`;
  const lines = [`curl -X ${method} "${fullUrl}"`];
  const mergedHeaders = { ...headers };
  if (token) mergedHeaders["Authorization"] = `Bearer ${token}`;

  Object.entries(mergedHeaders).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    lines.push(`  -H "${k}: ${String(v).replaceAll('"', '\\"')}"`);
  });

  if (body && method !== "GET") {
    lines.push(`  --data '${String(body).replaceAll("'", "\\'")}'`);
  }
  return lines.join(" \\\n");
}

function substituteParams(path, params) {
  if (!params) return path;
  return path.replace(/\{([^}]+)\}/g, (_, key) => encodeURIComponent(params[key] ?? `{${key}}`));
}

function humanMs(ms) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE);
  const [token, setToken] = useState(STATIC_TOKEN);
  const [tokenVisible, setTokenVisible] = useState(false);

  const [endpoints] = useState(DEFAULT_ENDPOINTS);

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of endpoints) {
      const g = e.group ?? "Other";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(e);
    }
    return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
  }, [endpoints]);

  const [selectedKey, setSelectedKey] = useState(() => {
    const first = DEFAULT_ENDPOINTS.find((e) => e.path === "/api/v1/copilot/run") || DEFAULT_ENDPOINTS[0];
    return `${first.method} ${first.path}`;
  });

  const selected = useMemo(() => {
    const found = endpoints.find((e) => `${e.method} ${e.path}` === selectedKey);
    return found || endpoints[0];
  }, [endpoints, selectedKey]);

  // request editor
  const [method, setMethod] = useState(selected.method);
  const [path, setPath] = useState(selected.path);
  const [params, setParams] = useState(selected.params || {});
  const [query, setQuery] = useState({});
  const [headers, setHeaders] = useState({ "Content-Type": "application/json" });
  const [bodyText, setBodyText] = useState(selected.body ? pretty(selected.body) : "");

  // response
  const [busy, setBusy] = useState(false);
  const [resp, setResp] = useState(null);
  const [err, setErr] = useState(null);

  const [history, setHistory] = useState([]);
  const historyRef = useRef(null);

  // copilot runner quick panel
  const [task, setTask] = useState("");
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [copilotError, setCopilotError] = useState(null);
  const [copilotResult, setCopilotResult] = useState(null);

  // sync editor when switching endpoint
  useEffect(() => {
    setMethod(selected.method);
    setPath(selected.path);
    setParams(selected.params || {});
    setQuery({});
    setHeaders({ "Content-Type": selected?.meta?.contentType || "application/json" });
    setBodyText(selected.body ? pretty(selected.body) : "");
    setResp(null);
    setErr(null);

    if (selected.path === "/api/v1/copilot/run") {
      const maybeBody = selected.body || {};
      if (typeof maybeBody.task === "string") setTask(maybeBody.task);
    }
  }, [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function upsertQueryParam(k, v) {
    setQuery((q) => {
      const next = { ...q };
      if (v === "") delete next[k];
      else next[k] = v;
      return next;
    });
  }

  function buildUrlPath() {
    const substituted = substituteParams(path, params);
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || String(v).trim() === "") return;
      qs.set(k, String(v));
    });
    const s = qs.toString();
    return s ? `${substituted}?${s}` : substituted;
  }

  async function callApi({ overrideMethod, overridePath, overrideBodyText, nameOverride } = {}) {
    const m = (overrideMethod || method || "GET").toUpperCase();
    const p = overridePath || buildUrlPath();
    const url = `${baseUrl}${p}`;

    setBusy(true);
    setErr(null);
    setResp(null);

    const start = performance.now();

    const hasBody = !["GET", "HEAD"].includes(m);
    const txt = overrideBodyText ?? bodyText;

    const contentType =
      selected?.meta?.contentType || headers["Content-Type"] || "application/json";

    const finalHeaders = {
      ...headers,
      "Content-Type": contentType,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    // build request body (supports JSON and x-www-form-urlencoded)
    let reqBody = undefined;
    if (hasBody) {
      if (contentType === "application/x-www-form-urlencoded") {
        const parsed = safeJsonParse(txt);
        const obj = parsed.ok ? parsed.value : {};
        const form = new URLSearchParams();
        Object.entries(obj).forEach(([k, v]) => form.set(k, String(v)));
        reqBody = form.toString();
      } else if (txt?.trim()) {
        const parsed = safeJsonParse(txt);
        reqBody = parsed.ok ? JSON.stringify(parsed.value) : txt;
      }
    }

    try {
      const res = await fetch(url, {
        method: m,
        headers: finalHeaders,
        body: hasBody ? reqBody : undefined,
      });

      const timeMs = Math.round(performance.now() - start);

      const resHeaders = {};
      res.headers.forEach((v, k) => (resHeaders[k] = v));

      const rawText = await res.text();
      const parsed = safeJsonParse(rawText);

      const result = {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        timeMs,
        headers: resHeaders,
        data: parsed.ok ? parsed.value : null,
        raw: parsed.ok ? null : parsed.value,
        at: nowIso(),
        request: {
          name: nameOverride || selected?.name || `${m} ${p}`,
          method: m,
          path: p,
          url,
          body: hasBody ? (reqBody ?? "") : "",
        },
      };

      setResp(result);

      setHistory((h) => [result, ...h].slice(0, 30));

      setTimeout(() => {
        if (historyRef.current) historyRef.current.scrollTop = 0;
      }, 0);

      // ✅ Auto-save token after successful login
      if (res.ok && selected?.path === "/api/v1/auth/login" && result.data?.access_token) {
        setToken(result.data.access_token);
      }

      if (!res.ok) setErr(`Request failed (${res.status} ${res.statusText})`);
    } catch (e) {
      setErr(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  }

  async function runCopilot() {
    setCopilotBusy(true);
    setCopilotError(null);
    setCopilotResult(null);

    try {
      // ✅ correct path from OpenAPI
      const res = await fetch(`${baseUrl}/api/v1/copilot/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ task }),
      });

      const raw = await res.text();
      const parsed = safeJsonParse(raw);

      if (!res.ok) {
        setCopilotError(
          parsed.ok
            ? `Copilot failed (${res.status}): ${pretty(parsed.value)}`
            : `Copilot failed (${res.status}): ${raw}`
        );
        return;
      }

      setCopilotResult(parsed.ok ? parsed.value : raw);

      setHistory((h) =>
        [
          {
            ok: true,
            status: res.status,
            statusText: res.statusText,
            timeMs: 0,
            headers: {},
            data: parsed.ok ? parsed.value : null,
            raw: parsed.ok ? null : parsed.value,
            at: nowIso(),
            request: {
              name: "Copilot Runner",
              method: "POST",
              path: "/api/v1/copilot/run",
              url: `${baseUrl}/api/v1/copilot/run`,
              body: JSON.stringify({ task }),
            },
          },
          ...h,
        ].slice(0, 30)
      );
    } catch (e) {
      setCopilotError(e?.message || "Network error");
    } finally {
      setCopilotBusy(false);
    }
  }

  function Badge({ children, tone = "neutral" }) {
    const tones = {
      neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
      good: "bg-emerald-50 text-emerald-700 border-emerald-200",
      bad: "bg-rose-50 text-rose-700 border-rose-200",
      warn: "bg-amber-50 text-amber-800 border-amber-200",
      info: "bg-blue-50 text-blue-700 border-blue-200",
    };
    return (
      <span style={styles.badge} className={cls("badge", tones[tone])}>
        {children}
      </span>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgGlow} />

      <header style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={styles.logo}>AV</div>
          <div>
            <div style={styles.title}>AV Ops Copilot Console</div>
            <div style={styles.subtitle}>One place to run Copilot + test every backend endpoint</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.kv}>
            <div style={styles.kvLabel}>API Base</div>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              style={styles.input}
              placeholder="http://localhost:8000"
            />
          </div>

          <div style={styles.kv}>
            <div style={styles.kvLabel}>Token</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={tokenVisible ? token : token ? `${token.slice(0, 18)}…${token.slice(-10)}` : ""}
                readOnly={!tokenVisible}
                onChange={(e) => setToken(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={() => setTokenVisible((v) => !v)}
                style={styles.btnSecondary}
                title="Show/hide token"
              >
                {tokenVisible ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
            <button
              onClick={() => callApi({ overrideMethod: "GET", overridePath: "/health", nameOverride: "Quick Health" })}
              style={styles.btn}
            >
              Quick Ping
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <aside style={styles.sidebar}>
          <div style={styles.sidebarTop}>
            <div style={styles.sectionTitle}>Endpoints</div>
            <div style={styles.smallHint}>Click any endpoint. Edit params/body. Hit <b>Send</b>.</div>
          </div>

          <div style={styles.endpointList}>
            {groups.map(({ group, items }) => (
              <div key={group} style={{ marginBottom: 14 }}>
                <div style={styles.groupTitle}>{group}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map((e) => {
                    const key = `${e.method} ${e.path}`;
                    const active = key === selectedKey;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedKey(key)}
                        style={clsBtn(styles.endpointBtn, active && styles.endpointBtnActive)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={methodPill(e.method)}>{e.method}</span>
                            <span style={styles.endpointName}>{e.name}</span>
                          </div>
                        </div>
                        <div style={styles.endpointPath}>{e.path}</div>
                        {e.hint ? <div style={styles.endpointHint}>{e.hint}</div> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.sidebarFooter}>
            <div style={styles.sectionTitle}>History</div>
            <div style={styles.history} ref={historyRef}>
              {history.length === 0 ? (
                <div style={styles.muted}>No calls yet.</div>
              ) : (
                history.map((h, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setMethod(h.request.method);
                      setPath(h.request.path.split("?")[0]);
                      setBodyText(h.request.body || "");
                      setResp(h);
                      setErr(h.ok ? null : `Request failed (${h.status})`);
                    }}
                    style={styles.historyItem}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>
                        {h.request.method}{" "}
                        <span style={{ fontWeight: 500, color: "#6b7280" }}>{h.request.path}</span>
                      </div>
                      <div>
                        <Badge tone={h.ok ? "good" : "bad"}>{h.status}</Badge>
                      </div>
                    </div>
                    <div style={styles.historyMeta}>
                      {new Date(h.at).toLocaleString()} • {h.timeMs ? humanMs(h.timeMs) : "—"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section style={styles.content}>
          <div style={styles.grid2}>
            {/* Copilot Runner */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.cardTitle}>Copilot Runner</div>
                  <div style={styles.cardSub}>Fast lane for <code>/api/v1/copilot/run</code></div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      setTask("Diagnose device 001 audio dropouts error E42");
                      setCopilotResult(null);
                      setCopilotError(null);
                    }}
                    style={styles.btnSecondary}
                  >
                    Example
                  </button>
                  <button onClick={runCopilot} disabled={!task.trim() || copilotBusy} style={styles.btn}>
                    {copilotBusy ? "Running…" : "Run"}
                  </button>
                </div>
              </div>

              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="e.g. Diagnose device 001 audio dropouts error E42"
                style={styles.textarea}
                rows={4}
              />

              {copilotError ? (
                <div style={styles.alertBad}>
                  <div style={{ fontWeight: 700 }}>Copilot Error</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{copilotError}</div>
                </div>
              ) : null}

              {copilotResult ? (
                <div style={styles.resultBox}>
                  <div style={styles.resultHeader}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Badge tone="info">Result</Badge>
                      <div style={styles.mutedSmall}>
                        {copilotResult?.created_at ? `Created: ${copilotResult.created_at}` : ""}
                      </div>
                    </div>

                    <button style={styles.btnSecondary} onClick={() => copyToClipboard(pretty(copilotResult))}>
                      Copy JSON
                    </button>
                  </div>

                  {copilotResult?.output?.diagnosis ? (
                    <div style={styles.copilotGrid}>
                      <div style={styles.panel}>
                        <div style={styles.panelTitle}>Diagnosis</div>
                        <ul style={styles.ul}>
                          {copilotResult.output.diagnosis.map((d, i) => (
                            <li key={i} style={styles.li}>{d}</li>
                          ))}
                        </ul>
                      </div>

                      <div style={styles.panel}>
                        <div style={styles.panelTitle}>Next Steps</div>
                        <ul style={styles.ul}>
                          {copilotResult.output.next_steps?.map((s, i) => (
                            <li key={i} style={styles.li}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      {copilotResult.output.notes ? (
                        <div style={styles.panelWide}>
                          <div style={styles.panelTitle}>Notes</div>
                          <div style={{ color: "#111827", whiteSpace: "pre-wrap" }}>
                            {copilotResult.output.notes}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <pre style={styles.pre}>{pretty(copilotResult)}</pre>
                  )}
                </div>
              ) : (
                <div style={styles.mutedSmall}>
                  Tip: Copilot + Events endpoints require a valid token.
                </div>
              )}
            </div>

            {/* API Tester */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.cardTitle}>API Tester</div>
                  <div style={styles.cardSub}>Build requests, test any endpoint, inspect responses</div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => {
                      setMethod(selected.method);
                      setPath(selected.path);
                      setParams(selected.params || {});
                      setQuery({});
                      setHeaders({ "Content-Type": selected?.meta?.contentType || "application/json" });
                      setBodyText(selected.body ? pretty(selected.body) : "");
                      setResp(null);
                      setErr(null);
                    }}
                    style={styles.btnSecondary}
                  >
                    Reset
                  </button>

                  <button
                    onClick={() => {
                      const urlPath = buildUrlPath();
                      const curl = buildCurl({
                        baseUrl,
                        method,
                        urlPath,
                        token,
                        headers: { ...headers, "Content-Type": selected?.meta?.contentType || headers["Content-Type"] },
                        body: bodyText?.trim() ? bodyText : "",
                      });
                      copyToClipboard(curl);
                    }}
                    style={styles.btnSecondary}
                  >
                    Copy cURL
                  </button>

                  <button onClick={() => callApi()} disabled={busy} style={styles.btn}>
                    {busy ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>

              <div style={styles.reqRow}>
                <select value={method} onChange={(e) => setMethod(e.target.value)} style={styles.select}>
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  style={styles.inputMono}
                  placeholder="/api/v1/telemetry/latest/{device_id}"
                />
              </div>

              {/\{[^}]+\}/.test(path) ? (
                <div style={styles.block}>
                  <div style={styles.blockTitle}>Path Params</div>
                  <div style={styles.kvGrid}>
                    {Array.from(path.matchAll(/\{([^}]+)\}/g)).map((m) => {
                      const key = m[1];
                      return (
                        <div key={key} style={styles.kvRow}>
                          <div style={styles.kvKey}>{key}</div>
                          <input
                            value={params[key] ?? ""}
                            onChange={(e) => setParams((p) => ({ ...p, [key]: e.target.value }))}
                            style={styles.input}
                            placeholder={`Value for ${key}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div style={styles.block}>
                <div style={styles.blockHeader}>
                  <div style={styles.blockTitle}>Query Params</div>
                  <button
                    style={styles.btnLink}
                    onClick={() => {
                      const k = prompt("Query key?");
                      if (!k) return;
                      upsertQueryParam(k, "");
                    }}
                  >
                    + Add
                  </button>
                </div>

                {Object.keys(query).length === 0 ? (
                  <div style={styles.mutedSmall}>No query params</div>
                ) : (
                  <div style={styles.kvGrid}>
                    {Object.entries(query).map(([k, v]) => (
                      <div key={k} style={styles.kvRow}>
                        <div style={styles.kvKey}>{k}</div>
                        <input
                          value={v}
                          onChange={(e) => upsertQueryParam(k, e.target.value)}
                          style={styles.input}
                          placeholder="value"
                        />
                        <button
                          style={styles.iconBtn}
                          onClick={() =>
                            setQuery((q) => {
                              const next = { ...q };
                              delete next[k];
                              return next;
                            })
                          }
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.block}>
                <div style={styles.blockHeader}>
                  <div style={styles.blockTitle}>Headers</div>
                  <button
                    style={styles.btnLink}
                    onClick={() => {
                      const k = prompt("Header key?");
                      if (!k) return;
                      setHeaders((h) => ({ ...h, [k]: "" }));
                    }}
                  >
                    + Add
                  </button>
                </div>

                <div style={styles.kvGrid}>
                  {Object.entries(headers).map(([k, v]) => (
                    <div key={k} style={styles.kvRow}>
                      <div style={styles.kvKey}>{k}</div>
                      <input
                        value={v}
                        onChange={(e) => setHeaders((h) => ({ ...h, [k]: e.target.value }))}
                        style={styles.input}
                        placeholder="value"
                      />
                      <button
                        style={styles.iconBtn}
                        onClick={() =>
                          setHeaders((h) => {
                            const next = { ...h };
                            delete next[k];
                            return next;
                          })
                        }
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.block}>
                <div style={styles.blockHeader}>
                  <div style={styles.blockTitle}>Body</div>
                  <div style={styles.mutedSmall}>
                    JSON preferred • Login uses <b>x-www-form-urlencoded</b>
                  </div>
                </div>

                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  style={styles.textareaMono}
                  rows={7}
                  placeholder='{"task":"..."}'
                />
              </div>

              <div style={styles.block}>
                <div style={styles.blockHeader}>
                  <div style={styles.blockTitle}>Response</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {resp ? (
                      <>
                        <Badge tone={resp.ok ? "good" : "bad"}>{resp.status} {resp.statusText}</Badge>
                        <Badge tone="neutral">{humanMs(resp.timeMs || 0)}</Badge>
                      </>
                    ) : (
                      <Badge tone="neutral">No response yet</Badge>
                    )}

                    {resp ? (
                      <button
                        style={styles.btnSecondary}
                        onClick={() => copyToClipboard(resp.data ? pretty(resp.data) : String(resp.raw ?? ""))}
                      >
                        Copy
                      </button>
                    ) : null}
                  </div>
                </div>

                {err ? (
                  <div style={styles.alertBad}>
                    <div style={{ fontWeight: 700 }}>Error</div>
                    <div>{err}</div>
                  </div>
                ) : null}

                {resp ? (
                  <div style={styles.responseGrid}>
                    <div style={styles.panel}>
                      <div style={styles.panelTitle}>Preview</div>
                      <pre style={styles.pre}>{resp.data ? pretty(resp.data) : String(resp.raw ?? "")}</pre>
                    </div>
                    <div style={styles.panel}>
                      <div style={styles.panelTitle}>Headers</div>
                      <pre style={styles.preSmall}>{pretty(resp.headers || {})}</pre>
                    </div>
                  </div>
                ) : (
                  <div style={styles.mutedSmall}>Choose an endpoint and hit <b>Send</b>.</div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerLeft}>
          <span style={styles.footerDot} />
          <span style={styles.mutedSmall}>
            API Console • Base: <code>{baseUrl}</code>
          </span>
        </div>
        <div style={styles.mutedSmall}>
          Your endpoints are now synced to OpenAPI.
        </div>
      </footer>
    </div>
  );
}

/* ---------------- styles (no tailwind needed) ---------------- */

function clsBtn(base, active) {
  return { ...base, ...(active || {}) };
}

function methodPill(method) {
  const m = (method || "").toUpperCase();
  const map = {
    GET: { bg: "#eff6ff", fg: "#1d4ed8", bd: "#bfdbfe" },
    POST: { bg: "#ecfdf5", fg: "#047857", bd: "#a7f3d0" },
    PUT: { bg: "#fff7ed", fg: "#c2410c", bd: "#fed7aa" },
    PATCH: { bg: "#fdf4ff", fg: "#a21caf", bd: "#f5d0fe" },
    DELETE: { bg: "#fef2f2", fg: "#b91c1c", bd: "#fecaca" },
  };
  const t = map[m] || { bg: "#f3f4f6", fg: "#374151", bd: "#e5e7eb" };
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.2,
    border: `1px solid ${t.bd}`,
    background: t.bg,
    color: t.fg,
    minWidth: 56,
  };
}

const styles = {
  page: {
    minHeight: "100vh",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif',
    color: "#0f172a",
    background: "linear-gradient(180deg, #0b1220 0%, #0b1220 40%, #070b14 100%)",
    position: "relative",
    overflowX: "hidden",
  },
  bgGlow: {
    position: "absolute",
    inset: -200,
    background:
      "radial-gradient(closest-side at 15% 20%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(closest-side at 80% 30%, rgba(168,85,247,0.16), transparent 60%), radial-gradient(closest-side at 40% 85%, rgba(34,197,94,0.12), transparent 60%)",
    filter: "blur(20px)",
    pointerEvents: "none",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    padding: "18px 20px",
    borderBottom: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.6)",
    backdropFilter: "blur(10px)",
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(135deg, rgba(56,189,248,0.95), rgba(168,85,247,0.9))",
    color: "white",
    fontWeight: 900,
    letterSpacing: 0.5,
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  },
  title: {
    fontSize: 16,
    fontWeight: 900,
    color: "rgba(255,255,255,0.92)",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(226,232,240,0.75)",
    marginTop: 2,
  },
  headerRight: {
    display: "grid",
    gridTemplateColumns: "1fr 1.2fr auto",
    gap: 12,
    alignItems: "end",
    maxWidth: 780,
    width: "100%",
  },
  kv: { display: "flex", flexDirection: "column", gap: 6, minWidth: 240 },
  kvLabel: { fontSize: 11, color: "rgba(226,232,240,0.72)", fontWeight: 700 },
  input: {
    height: 38,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.55)",
    color: "rgba(255,255,255,0.9)",
    padding: "0 12px",
    outline: "none",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "340px 1fr",
    gap: 16,
    padding: 16,
  },
  sidebar: {
    border: "1px solid rgba(148,163,184,0.16)",
    borderRadius: 18,
    background: "rgba(2,6,23,0.55)",
    backdropFilter: "blur(10px)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    minHeight: "calc(100vh - 110px)",
  },
  sidebarTop: { padding: 14, borderBottom: "1px solid rgba(148,163,184,0.14)" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 900,
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.2,
  },
  smallHint: {
    marginTop: 6,
    fontSize: 12,
    color: "rgba(226,232,240,0.68)",
    lineHeight: 1.35,
  },
  endpointList: {
    padding: 12,
    overflow: "auto",
    flex: 1,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: 900,
    color: "rgba(226,232,240,0.55)",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
    paddingLeft: 4,
  },
  endpointBtn: {
    textAlign: "left",
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.35)",
    padding: "10px 10px",
    color: "rgba(255,255,255,0.88)",
    cursor: "pointer",
    transition: "transform 120ms ease, background 120ms ease, border 120ms ease",
  },
  endpointBtnActive: {
    border: "1px solid rgba(56,189,248,0.4)",
    background:
      "linear-gradient(180deg, rgba(56,189,248,0.16), rgba(168,85,247,0.10))",
    transform: "translateY(-1px)",
  },
  endpointName: { fontSize: 12, fontWeight: 800 },
  endpointPath: {
    marginTop: 6,
    fontSize: 12,
    color: "rgba(226,232,240,0.72)",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  endpointHint: {
    marginTop: 6,
    fontSize: 11,
    color: "rgba(226,232,240,0.55)",
    lineHeight: 1.3,
  },
  sidebarFooter: {
    borderTop: "1px solid rgba(148,163,184,0.14)",
    padding: 12,
  },
  history: { maxHeight: 260, overflow: "auto", display: "flex", flexDirection: "column", gap: 10, marginTop: 10 },
  historyItem: {
    textAlign: "left",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.28)",
    padding: 10,
    cursor: "pointer",
    color: "rgba(255,255,255,0.88)",
  },
  historyMeta: { marginTop: 6, fontSize: 11, color: "rgba(226,232,240,0.58)" },

  content: { minHeight: "calc(100vh - 110px)" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  card: {
    border: "1px solid rgba(148,163,184,0.16)",
    borderRadius: 18,
    background: "rgba(2,6,23,0.55)",
    backdropFilter: "blur(10px)",
    padding: 14,
    boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: 900, color: "rgba(255,255,255,0.92)" },
  cardSub: { marginTop: 4, fontSize: 12, color: "rgba(226,232,240,0.65)" },

  btn: {
    height: 38,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid rgba(56,189,248,0.45)",
    background:
      "linear-gradient(135deg, rgba(56,189,248,0.85), rgba(168,85,247,0.75))",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
  },
  btnSecondary: {
    height: 38,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(15,23,42,0.35)",
    color: "rgba(255,255,255,0.88)",
    fontWeight: 800,
    cursor: "pointer",
  },
  btnLink: {
    border: "none",
    background: "transparent",
    color: "rgba(56,189,248,0.95)",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    padding: 0,
  },
  iconBtn: {
    height: 34,
    width: 34,
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.35)",
    color: "rgba(255,255,255,0.8)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
  },

  textarea: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.30)",
    color: "rgba(255,255,255,0.9)",
    padding: 12,
    outline: "none",
    resize: "vertical",
    lineHeight: 1.4,
  },
  textareaMono: {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.30)",
    color: "rgba(255,255,255,0.9)",
    padding: 12,
    outline: "none",
    resize: "vertical",
    lineHeight: 1.4,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
  },

  resultBox: {
    marginTop: 12,
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.16)",
    background: "rgba(15,23,42,0.28)",
    padding: 12,
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  copilotGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  panel: {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(2,6,23,0.35)",
    padding: 12,
  },
  panelWide: {
    gridColumn: "1 / -1",
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(2,6,23,0.35)",
    padding: 12,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: 900,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },
  ul: { margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.88)" },
  li: { marginBottom: 6, lineHeight: 1.35 },

  reqRow: { display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, marginTop: 6 },
  select: {
    height: 38,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.55)",
    color: "rgba(255,255,255,0.9)",
    padding: "0 10px",
    outline: "none",
    fontWeight: 800,
  },
  inputMono: {
    height: 38,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.55)",
    color: "rgba(255,255,255,0.9)",
    padding: "0 12px",
    outline: "none",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
  },

  block: {
    marginTop: 12,
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.22)",
    padding: 12,
  },
  blockHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 10,
  },
  blockTitle: { fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.9)" },
  kvGrid: { display: "flex", flexDirection: "column", gap: 10 },
  kvRow: { display: "grid", gridTemplateColumns: "120px 1fr 36px", gap: 10, alignItems: "center" },
  kvKey: {
    fontSize: 12,
    color: "rgba(226,232,240,0.78)",
    fontWeight: 800,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },

  responseGrid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12 },

  pre: {
    margin: 0,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(2,6,23,0.45)",
    padding: 12,
    color: "rgba(255,255,255,0.88)",
    overflow: "auto",
    maxHeight: 320,
    fontSize: 12,
    lineHeight: 1.45,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  preSmall: {
    margin: 0,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(2,6,23,0.45)",
    padding: 12,
    color: "rgba(255,255,255,0.85)",
    overflow: "auto",
    maxHeight: 320,
    fontSize: 11,
    lineHeight: 1.45,
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },

  alertBad: {
    marginTop: 12,
    borderRadius: 16,
    border: "1px solid rgba(244,63,94,0.35)",
    background: "rgba(244,63,94,0.12)",
    padding: 12,
    color: "rgba(255,255,255,0.9)",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(15,23,42,0.35)",
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: 900,
  },

  muted: { color: "rgba(226,232,240,0.6)", fontSize: 12 },
  mutedSmall: { color: "rgba(226,232,240,0.62)", fontSize: 12, lineHeight: 1.35 },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: "10px 16px 18px",
    color: "rgba(226,232,240,0.62)",
  },
  footerLeft: { display: "flex", gap: 10, alignItems: "center" },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(34,197,94,0.9)",
    boxShadow: "0 0 0 4px rgba(34,197,94,0.12)",
  },
};
