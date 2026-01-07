# AVOps Copilot — Internal AI Tooling (Foundations)

A foundational internal AI tooling project inspired by UXT’s focus on intelligent AV operations and automated support platforms.

This project shows how an internal platform can:
- ingest AV device telemetry (simulated)
- score anomaly/failure risk (predictive maintenance)
- power intelligent diagnostics search using **embeddings + Chroma vector DB**
- answer support questions using a simple **RAG** pipeline (with sources)
- trigger an automated “agentic” workflow (Node-RED style) to reset devices (simulated)

> Note: This is a foundations project to showcase architecture + capability. AV devices are simulated, but the flow mirrors real ops tooling.

---

## Architecture (Simple)

**Telemetry → Risk Scoring → RAG Diagnostics → Workflow Automation**

1. **Telemetry Ingest**
   - Devices post metrics (temp, packet loss, audio dropouts, error codes)
2. **Predictive Maintenance**
   - A lightweight anomaly/risk scoring component flags unhealthy devices
3. **Diagnostics Copilot (RAG)**
   - Internal runbooks are embedded and stored in **Chroma**
   - Queries retrieve relevant snippets + generate an answer with cited sources
4. **Automated Diagnostics Workflow**
   - A Node-RED-like webhook flow triggers “reset” actions for high risk devices

---

## Features

### Operational Intelligence
- `POST /telemetry/ingest` — ingest device telemetry
- `GET /telemetry/latest` — view current device status snapshot

### Predictive Maintenance (Risk Scoring)
- `POST /predict/risk` — returns `risk_score` + reasons from telemetry

### Vector Search + RAG Diagnostics
- `python rag/ingest_kb.py` — embed internal runbooks into Chroma
- `POST /ask` — retrieve top docs and answer with sources

### Automated Diagnostics (Agentic Workflow)
- `POST /workflow/trigger` — triggers a workflow action (simulated)
- `POST /device/reset` — simulate resetting a device (e.g., reboot)

---

## Tech Stack
- **Python** (FastAPI) for internal microservices APIs
- **Chroma** for vector database (embeddings + similarity search)
- Lightweight **RAG** pipeline (retrieve + answer + cite sources)
- Node-RED compatible workflow export (foundations)

---

## Quick Start

### 1) Setup
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt