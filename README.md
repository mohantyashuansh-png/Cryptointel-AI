# CryptoIntel AI — NTRO Core (PS-25228)

Autonomous Cryptocurrency Address Collection & Categorization System.

## Overview
This system autonomously scrapes the surface and deep web for cryptocurrency addresses, associates them with PII (Personally Identifiable Information) and context, and uses a 4-agent LLM swarm (CrewAI) to extract, score, and categorize the threat. The data is stored in Neo4j (Graph) and LanceDB (Vector/Evidence), and visualized on a Next.js React Dashboard.

## Features
- **Deterministic Regex Extraction**: Detects BTC, ETH, XMR, TRX, LTC, DOGE, XRP, SOL, ZEC, DASH.
- **Autonomous Scraper**: Configurable target lists (Clearweb & Tor), with auto-deduplication.
- **4-Agent LLM Swarm**: OSINT Extraction → Risk Scoring → Context Summarization → Matrix Compilation.
- **Dual-Database Architecture**: Neo4j for relationships (Graph) & LanceDB for raw evidence/semantic search (Vector).
- **Interactive Dashboard**: Force-directed graph, Activity Timeline, Dossiers, Risk Alerts, and Semantic Search.
- **Exporting**: CSV, JSON, auto-generated HTML Threat Bulletins, and PDF Reports.

## Setup Instructions

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- [Neo4j Desktop](https://neo4j.com/download/) or Neo4j AuraDB

### 2. Install Dependencies
```bash
# Python backend
pip install -r requirements.txt

# Node frontend
cd frontend
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
# Neo4j Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# LLM APIs (Gemini as primary, Groq as fallback)
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY_1=your_groq_key
```

### 4. Running the System

Start the 3 core components in separate terminals:

**Terminal 1 (Backend Core):**
```bash
python main.py
```

**Terminal 2 (Autonomous Scraper):**
```bash
python scraper.py
```

**Terminal 3 (Dashboard):**
```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

## Architecture

1. **Scraper (`scraper.py`)**: Fetches raw data from Telegram, Pastebin, .onion. Posts to `/api/v1/investigate`.
2. **AI Swarm (`engine.py`)**: Parses the raw text. Outputs a strict JSON matrix of nodes and edges.
3. **Core API (`main.py`)**: Receives the matrix, injects into Neo4j (Graph), calculates embeddings, and injects into LanceDB (Evidence Vault).
4. **Dashboard (`frontend/`)**: Provides the analytical front end for querying, filtering, and exporting.
