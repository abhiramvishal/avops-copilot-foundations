# AV Ops Copilot – Foundations

AV Ops Copilot is an internal AI-driven system for **AV telemetry ingestion, predictive risk analysis, device operations, and AI-assisted diagnostics**.  
The project provides a single, unified codebase that exposes an OpenAPI-driven API and an interactive UI console to test, run, and inspect all system capabilities.

---

## What this project does

- Ingests AV device telemetry in real time
- Stores and queries recent and historical telemetry
- Predicts operational risk from telemetry signals
- Performs device-level actions (e.g. reset)
- Runs an AI Copilot to diagnose issues and suggest next steps
- Exposes all capabilities through a versioned OpenAPI interface
- Provides a built-in UI console to interact with every endpoint

---

## Key capabilities

### Health & System
- Root and versioned health checks
- Fast verification that the system is running correctly

### Telemetry
- Ingest structured telemetry payloads
- Retrieve latest telemetry snapshots
- Query telemetry event streams with pagination
- Fetch individual telemetry events

### Predictive Intelligence
- Generate risk scores from telemetry signals
- Explain why a device is considered high or low risk

### Device Operations
- Trigger operational actions such as device resets
- Secure access using token-based authentication

### Copilot (AI Diagnostics)
- Accept natural language tasks describing AV issues
- Correlate telemetry signals and error patterns
- Return diagnoses, recommended next steps, and notes
- Store and retrieve historical Copilot runs

### Interactive Console
- Browse all available endpoints
- Build requests with path params, query params, headers, and body
- Execute requests and inspect responses in real time
- View request history and reuse previous calls
- Run Copilot tasks from a dedicated panel

---

## API surface (OpenAPI aligned)

All routes are defined and documented via OpenAPI and exposed under a versioned namespace where applicable.

### Health
- `GET /health`
- `GET /`
- `GET /api/v1/health`

### Auth
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Telemetry
- `POST /api/v1/telemetry/ingest`
- `GET  /api/v1/telemetry/latest`
- `GET  /api/v1/telemetry/latest/{device_id}`
- `GET  /api/v1/telemetry/events`
- `GET  /api/v1/telemetry/events/{event_id}`

### Predict
- `POST /api/v1/predict/risk`

### Device
- `POST /api/v1/device/reset?device_id=...`

### Copilot
- `POST /api/v1/copilot/run`
- `GET  /api/v1/copilot/runs`
- `GET  /api/v1/copilot/runs/{run_id}`
---
### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

### Install dependencies
```bash
npm install
````

### Start the system

```bash
npm run dev
```

This starts the API server and the interactive console together.

* API: `http://localhost:8000`
* OpenAPI: `http://localhost:8000/docs`
* UI Console: `http://localhost:5173`

---

## Authentication

The system uses JWT-based authentication.

* Login uses `application/x-www-form-urlencoded`
* Token is passed as:

```http
Authorization: Bearer <token>
```

For local development, a static token can be used to immediately access protected routes.

---

## Common usage flows

### Health check

* Call `GET /health` or use the **Quick Ping** button in the console

### Telemetry ingestion

* Send a `TelemetryPayload` to `/api/v1/telemetry/ingest`

### Latest device telemetry

* Call `/api/v1/telemetry/latest/{device_id}`

### Risk prediction

* Send telemetry payload to `/api/v1/predict/risk`

### Device reset

* Call `/api/v1/device/reset?device_id=001` (token required)

### Copilot diagnostics

* Provide a natural language task:

```json
{
  "task": "Diagnose device 001 audio dropouts error E42"
}
```

* Receive diagnosis, next steps, and notes

---

## Design notes

* OpenAPI is the single source of truth for routes and schemas
* Versioned APIs (`/api/v1`) allow future evolution without breaking clients
* Token-based security is enforced on sensitive operations
* The console is designed for internal testing, debugging, and iteration

---

## Roadmap (optional)

* Auto-load routes directly from `/openapi.json`
* Schema-driven request editors
* Persisted collections and saved scenarios
* Streaming telemetry visualization
* Copilot reasoning trace inspection

---

## Status

This project is currently in **active development** and intended for internal use and rapid iteration.

---
