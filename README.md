# AgriSārathi — Agentic AI Agricultural Crop Planning & Precision Farming System

> **Project Status:** Phase 1 — Requirements Analysis & System Architecture (Complete)
> All features described below are **planned** unless explicitly marked as implemented.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [Project Objectives](#project-objectives)
4. [Main Features](#main-features)
5. [Technology Stack](#technology-stack)
6. [High-Level System Architecture](#high-level-system-architecture)
7. [Specialized AI Agents](#specialized-ai-agents)
8. [Implementation Phases](#implementation-phases)
9. [Expected Deliverables](#expected-deliverables)
10. [Limitations & Responsible-Use Principles](#limitations--responsible-use-principles)
11. [Getting Started](#getting-started)
12. [Project Structure](#project-structure)
13. [License](#license)

---

## Project Overview

**AgriSārathi** (from Sanskrit सारथी — "charioteer" or "guide") is an agentic AI system designed to assist farmers with evidence-based crop planning and precision farming decisions. The system orchestrates six specialized AI agents that collectively evaluate crop suitability, analyze soil and weather conditions, plan irrigation, identify environmental crop risks, and generate explainable agricultural recommendations.

The system is designed with a clear separation between:

- **Measured data** — values from soil tests, sensors, and weather APIs.
- **Retrieved references** — crop requirements and agricultural knowledge from curated sources.
- **ML predictions** — model outputs with stated confidence and limitations.
- **AI-generated explanations** — natural language reasoning that synthesizes evidence.

AgriSārathi explicitly identifies missing information and uncertainty rather than inventing agricultural facts.

---

## Problem Statement

Smallholder and mid-scale farmers face compounding challenges when planning crops:

1. **Information fragmentation** — Soil data, weather forecasts, crop requirements, and market conditions exist in separate silos with no unified decision-support view.
2. **Reactive decision-making** — Farmers often respond to problems (drought stress, nutrient deficiency, pest outbreaks) after visible damage, rather than planning proactively.
3. **Opaque AI advice** — Many agricultural advisory tools provide recommendations without evidence, source attribution, or uncertainty disclosure, eroding farmer trust.
4. **Missing-data blindness** — Systems that silently substitute defaults for missing soil tests or sensor readings can produce misleading recommendations.
5. **One-size-fits-all guidance** — Generic crop calendars and fertilizer schedules do not account for field-specific soil chemistry, microclimate variations, or water availability.

AgriSārathi addresses these gaps by combining multi-agent reasoning, data provenance tracking, and human-in-the-loop approval into a single, transparent advisory system.

---

## Project Objectives

| # | Objective | Scope |
|---|-----------|-------|
| O-1 | Build a multi-agent system that evaluates crop suitability for a given field | Core |
| O-2 | Integrate real-time weather data via a working weather API | Core |
| O-3 | Analyze soil test parameters against crop-specific reference ranges | Core |
| O-4 | Provide irrigation decision support based on soil moisture, forecast rainfall, and crop stage | Core |
| O-5 | Identify and prioritize environmental crop risks with supporting evidence | Core |
| O-6 | Generate explainable, evidence-cited recommendations with uncertainty disclosure | Core |
| O-7 | Require human review and approval before recommending physical farm operations | Core |
| O-8 | Simulate sensor data (soil moisture, temperature, humidity) for development | Development |
| O-9 | Persist field profiles, soil tests, recommendations, and agent outputs in a database | Core |
| O-10 | Produce downloadable PDF advisory reports | Planned |

---

## Main Features

### Planned Features

- **Farm & Field Profiling** — Capture field area, location, soil type, crop history, irrigation source, and water availability. Flag missing profile data.
- **Soil & Nutrient Analysis** — Ingest soil test results (pH, N, P, K, organic matter, moisture), preserve original measurements, and compare against crop-specific reference ranges.
- **Weather & Climate Analysis** — Fetch current conditions and multi-day forecasts from an external weather API. Record timestamps, source, and forecast confidence.
- **Crop Suitability Assessment** — Compare aggregated field conditions against crop requirements. Classify suitability as: Suitable, Suitable with Conditions, Additional Information Required, or Agronomic Review Required.
- **Irrigation Planning** — Evaluate soil moisture, crop water needs at the current growth stage, expected rainfall, and available water supply. Provide decision support with reasoning.
- **Risk Identification & Advisory** — Combine agent findings and ML predictions to identify environmental risks (heat stress, frost, waterlogging, disease-favorable conditions). Generate prioritized, explainable advisories.
- **Human-in-the-Loop Approval** — Present recommendations for farmer or agronomist review before any physical-action guidance is finalized.
- **PDF Report Generation** — Compile field profile, analysis results, recommendations, and evidence citations into a downloadable report.
- **Sensor Data Simulation** — Generate realistic soil moisture, temperature, and humidity readings for development and testing.
- **RAG-Enhanced Knowledge Retrieval** — Use a vector database (ChromaDB) to retrieve relevant agricultural reference material for agent reasoning.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React.js, TypeScript, Tailwind CSS, Recharts | User interface, data visualization |
| Backend | Python 3.11+, FastAPI, Pydantic | REST API, request validation, business logic |
| Multi-Agent Orchestration | LangGraph | Agent workflow graph, state management, conditional routing |
| Data Analysis | Pandas, NumPy | Soil data processing, statistical analysis |
| Machine Learning | Scikit-learn | Crop yield risk prediction, anomaly detection (planned) |
| RAG / Vector DB | ChromaDB | Agricultural knowledge retrieval |
| Database | SQLite (dev), PostgreSQL (production) | Persistent storage for fields, soil tests, recommendations |
| Weather API | Open-Meteo or OpenWeatherMap (TBD) | Real-time weather and forecast data |
| Sensor Simulation | Python (custom) | Simulated IoT soil/weather sensor readings |
| Deployment | Render (backend), Vercel (frontend) | Cloud hosting |
| Version Control | Git, GitHub | Source control, collaboration |

> **Note:** Dependencies will be installed incrementally as each phase is implemented. The `requirements.txt` currently lists only the planned packages.

---

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Farmer / User                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│            React + TypeScript Frontend                  │
│         (Tailwind CSS, Recharts)                        │
└──────────────────────┬──────────────────────────────────┘
                       │  REST API
                       ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI Backend                            │
│    ┌─────────────────────────────────────┐              │
│    │  Request Validation (Pydantic)      │              │
│    │  Data Persistence (SQLite/Postgres) │──────┐       │
│    └──────────────┬──────────────────────┘      │       │
│                   ▼                             │       │
│    ┌─────────────────────────────────────┐      │       │
│    │     LangGraph Orchestrator          │      │       │
│    │  ┌───────────────────────────────┐  │      │       │
│    │  │  Agent 1: Farm & Field Profile│  │      │       │
│    │  │  Agent 2: Soil & Nutrient     │  │      │       │
│    │  │  Agent 3: Weather & Climate   │  │      │       │
│    │  │  Agent 4: Crop Suitability    │  │      │       │
│    │  │  Agent 5: Irrigation Planning │  │      │       │
│    │  │  Agent 6: Risk & Advisory     │  │      │       │
│    │  └───────────────────────────────┘  │      │       │
│    └──────────────┬──────────────────────┘      │       │
│                   ▼                             │       │
│    ┌──────────────────────────────────┐         │       │
│    │  Advisory Aggregation &          │         │       │
│    │  Explainable Recommendation      │         │       │
│    └──────────────┬───────────────────┘         │       │
│                   ▼                             │       │
│    ┌──────────────────────────────────┐         │       │
│    │  Human Review & Approval         │         │       │
│    └──────────────┬───────────────────┘         │       │
│                   ▼                             │       │
│    ┌──────────────────────────────────┐         │       │
│    │  Farm Activity Planner &         │         │       │
│    │  PDF Report Generator            │         │       │
│    └──────────────────────────────────┘         │       │
└─────────────────────────────────────────────────────────┘
         │              │                │
         ▼              ▼                ▼
   ┌──────────┐  ┌────────────┐  ┌──────────────┐
   │ Weather  │  │ ChromaDB   │  │ Sensor Data  │
   │ API      │  │ Knowledge  │  │ & ML Service │
   │(External)│  │ Base (RAG) │  │ (Simulated)  │
   └──────────┘  └────────────┘  └──────────────┘
```

> See [docs/architecture.md](docs/architecture.md) for detailed Mermaid diagrams and the shared workflow state design.

---

## Specialized AI Agents

AgriSārathi uses six specialized agents orchestrated by LangGraph. Each agent has a defined scope, explicit inputs/outputs, and documented failure-handling behavior.

| # | Agent | Primary Responsibility |
|---|-------|----------------------|
| 1 | **Farm & Field Profile Agent** | Collect and validate field information, crop history, location, soil data, irrigation source. Identify missing profile data. |
| 2 | **Soil & Nutrient Analysis Agent** | Analyze soil test parameters (pH, N, P, K, moisture, organic matter). Preserve raw measurements. Compare against crop-specific reference ranges. |
| 3 | **Weather & Climate Analysis Agent** | Retrieve current and forecast weather from an external API. Track timestamps, source attribution, and forecast period. |
| 4 | **Crop Planning & Suitability Agent** | Compare field conditions against crop requirements. Classify suitability. Explain favorable conditions, limitations, and missing information. |
| 5 | **Irrigation Planning Agent** | Evaluate soil moisture, crop stage water needs, expected rainfall, and water availability. Provide irrigation decision support with reasoning. |
| 6 | **Crop Risk & Farm Advisory Agent** | Combine findings from all agents and ML predictions. Prioritize environmental risks. Generate explainable, evidence-cited recommendations. |

> See [docs/agents.md](docs/agents.md) for the full specification of each agent including inputs, outputs, tools, dependencies, failure handling, and testing requirements.

---

## Implementation Phases

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Requirements analysis, system architecture, data dictionary, agent specifications, test plan | ✅ Complete |
| **Phase 2** | Backend foundation — FastAPI setup, Pydantic schemas, database models, API endpoints | 🔲 Planned |
| **Phase 3** | Agent implementation — Individual agent logic, LangGraph orchestration, shared state | 🔲 Planned |
| **Phase 4** | External integrations — Weather API, ChromaDB RAG pipeline, sensor simulation | 🔲 Planned |
| **Phase 5** | ML service — Crop risk prediction model, training pipeline, model serving | 🔲 Planned |
| **Phase 6** | Frontend — React UI, form inputs, dashboard, visualization, PDF report | 🔲 Planned |
| **Phase 7** | Testing, integration, deployment — End-to-end tests, Render/Vercel deployment | 🔲 Planned |

---

## Expected Deliverables

1. **Documentation** — Architecture diagrams, agent specifications, data dictionary, test plan, and this README.
2. **Backend API** — FastAPI application with validated endpoints for field profiles, soil tests, weather queries, and recommendations. *(Planned)*
3. **Agent System** — Six LangGraph-orchestrated agents with shared state, provenance tracking, and explainable outputs. *(Planned)*
4. **Frontend Dashboard** — React application for data entry, status tracking, and recommendation review. *(Planned)*
5. **ML Risk Model** — Scikit-learn model for crop risk prediction with stated accuracy and limitations. *(Planned)*
6. **RAG Knowledge Base** — ChromaDB-powered retrieval of agricultural references for agent reasoning. *(Planned)*
7. **PDF Reports** — Downloadable advisory reports with evidence citations. *(Planned)*
8. **Test Suite** — Unit, integration, and scenario-based tests covering six assignment test cases. *(Planned)*

---

## Limitations & Responsible-Use Principles

### What This System Does NOT Do

- **Does not replace professional agronomic advice.** All recommendations should be reviewed by a qualified agronomist or experienced farmer before implementation.
- **Does not guarantee crop yield or agricultural outcomes.** Recommendations are decision-support tools, not guarantees.
- **Does not provide real sensor data.** Sensor readings are simulated for development purposes and must be replaced with actual hardware integrations in production.
- **Does not diagnose plant diseases.** The system identifies environmental conditions favorable to certain risks but does not perform visual or laboratory disease diagnosis.

### Design Constraints

| # | Constraint | Rationale |
|---|-----------|-----------|
| R-1 | Never silently alter original measured soil values | Data integrity; farmers must trust that their lab results are preserved |
| R-2 | Never treat missing data as zero | Missing pH ≠ pH 0; missing nutrient data should trigger an "Additional Information Required" status |
| R-3 | Do not invent fertilizer quantities or pesticide recommendations | Dosage errors can damage crops, soil, and human health |
| R-4 | Do not describe disease-favorable conditions as confirmed diagnoses | Environmental risk ≠ confirmed infection; farmers should inspect or consult an expert |
| R-5 | Include source references for important recommendations | Traceability; farmers and reviewers can verify advice |
| R-6 | Record timestamp and source of external weather data | Weather data is time-sensitive; stale forecasts can mislead |
| R-7 | Clearly identify uncertainty and unavailable information | Honest uncertainty is more useful than false confidence |
| R-8 | Require explicit human authorization before physical farm operations | No automated system should trigger irrigation, spraying, or harvesting without farmer consent |
| R-9 | Do not expose API keys or secrets in source control | Security best practice |
| R-10 | Do not claim recommendations guarantee outcomes | Legal and ethical responsibility |

---

## Getting Started

### Prerequisites

- Python 3.11 or later
- Node.js 18 or later
- Git

### Phase 1 — Inspect Documentation

```bash
# Clone the repository
git clone <repository-url>
cd agrisarathi

# Review documentation
cat README.md
cat docs/architecture.md
cat docs/agents.md
cat docs/data_dictionary.md
cat docs/test_plan.md
```

### Phase 2+ — Setup (Planned)

```bash
# Backend setup (planned)
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Frontend setup (planned)
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
agrisarathi/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI route handlers (planned)
│   │   ├── agents/         # Individual agent implementations (planned)
│   │   ├── orchestration/  # LangGraph workflow definition (planned)
│   │   ├── schemas/        # Pydantic request/response models (planned)
│   │   ├── services/       # Business logic services (planned)
│   │   ├── models/         # SQLAlchemy/DB models (planned)
│   │   ├── database/       # Database connection and migrations (planned)
│   │   └── core/           # Configuration, constants, utilities (planned)
│   ├── tests/              # Test suite (planned)
│   ├── data/
│   │   └── knowledge_base/ # Agricultural reference documents for RAG (planned)
│   └── requirements.txt    # Python dependencies (planned packages listed)
├── frontend/               # React + TypeScript application (planned)
├── docs/
│   ├── architecture.md     # System architecture and shared state design
│   ├── agents.md           # Detailed agent specifications
│   ├── data_dictionary.md  # Field definitions and validation rules
│   └── test_plan.md        # Test scenarios for six assignment cases
├── .gitignore              # Python, Node.js, React, secrets exclusions
├── .env.example            # Environment variable placeholders (no real credentials)
└── README.md               # This file
```

---

## License

This project is developed as an academic assignment for the Brightcone AI program. All rights reserved by the author.
