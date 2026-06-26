"""
CryptoIntel AI — FastAPI Service Layer
Wraps the 4-agent engine as a local HTTP API for the frontend/dashboard team.

Run with:  python main.py
Then POST to:  http://localhost:8000/api/v1/investigate
Body:  {"raw_text": "...scraped text..."}
"""

import os
import csv
import io
import sys
import json
import requests
import hashlib
from collections import deque
from datetime import datetime
from fastapi import FastAPI, Body, HTTPException, Response
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from blockchain_forensics import trace_wallet
from pydantic import BaseModel
from neo4j import GraphDatabase
from dotenv import load_dotenv
import requests
import json
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

from engine import run_investigation_pipeline, extract_wallets_via_regex

load_dotenv()

try:
    import lancedb
    from langchain_huggingface import HuggingFaceEmbeddings
    # Initialize LanceDB
    lancedb_client = lancedb.connect("./evidence_vault")
    hf_embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    print("[SYSTEM] LanceDB and HuggingFace Embeddings Initialized.")
except Exception as e:
    print(f"[ERROR] Failed to initialize LanceDB/Embeddings: {e}")
    lancedb_client = None
    hf_embeddings = None

# Initialize Neo4j Driver
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USERNAME = os.environ.get("NEO4J_USERNAME", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "password")

try:
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
    print("[SYSTEM] Neo4j Driver Initialized Successfully.")
except Exception as e:
    print(f"[ERROR] Failed to initialize Neo4j: {e}")
    driver = None

# Ensure stdout handles UTF-8 (emojis in CrewAI logs)
try:
    sys.__stdout__.reconfigure(encoding='utf-8')
except AttributeError:
    pass

class ConsoleInterceptor(io.StringIO):
    def __init__(self):
        super().__init__()
        self.logs = deque(maxlen=200) # Keep last 200 lines
    
    def write(self, s):
        super().write(s)
        clean_s = s.strip()
        if clean_s:
            self.logs.append(clean_s)
        sys.__stdout__.write(s)
        sys.__stdout__.flush()

# Instantiate and bind the interceptor globally
live_console = ConsoleInterceptor()
sys.stdout = live_console
live_console.write("[SYSTEM] NTRO Core API Initialized.\n")
live_console.write("[SYSTEM] Listening for intelligence payloads from scraper swarms...\n")

app = FastAPI(title="CryptoIntel AI: Central Investigation Core")

# Enable CORS so a frontend teammate can hit this from a browser over local Wi-Fi.
# allow_origins=["*"] is fine for a hackathon demo on a local network; tighten
# this to specific origins before deploying anywhere public.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class InvestigateRequest(BaseModel):
    raw_text: str
    source_url: str = "Unknown"


@app.get("/")
async def health_check():
    return {"status": "CryptoIntel AI core is running"}

@app.get("/api/v1/logs")
async def get_logs():
    return {"logs": list(live_console.logs)}

def enrich_btc_address(address: str):
    try:
        res = requests.get(f"https://blockchain.info/rawaddr/{address}?limit=0", timeout=5)
        if res.status_code == 200:
            data = res.json()
            return {
                "tx_count": data.get("n_tx", 0),
                "total_received": data.get("total_received", 0) / 100000000, # BTC
                "final_balance": data.get("final_balance", 0) / 100000000, # BTC
            }
    except Exception:
        pass
    return None

def inject_into_graph(intelligence_matrix):
    """Inserts nodes and edges into Neo4j using Cypher MERGE commands."""
    if not driver:
        print("[WARN] Neo4j driver not initialized. Skipping graph injection.")
        return
        
    if "error" in intelligence_matrix:
        return
        
    nodes = intelligence_matrix.get("nodes", [])
    edges = intelligence_matrix.get("edges", [])
    
    with driver.session() as session:
        # Merge Nodes
        for node in nodes:
            node_id = node.get("id")
            node_type = node.get("type", "Entity").replace(" ", "_").replace("-", "_").replace("`", "")
            category = node.get("category", "Unknown")
            crypto_type = node.get("crypto_type", "None")
            source_url = node.get("source_url", "Unknown")
            score = node.get("score", 0)
            desc = node.get("desc", "")
            timestamp = datetime.utcnow().isoformat()
            
            # PII Fields
            phone = node.get("phone", "")
            email = node.get("email", "")
            bank_account = node.get("bank_account", "")
            real_name = node.get("real_name", "")
            address = node.get("address", "")
            estimated_location = node.get("estimated_location", "Unknown")
            
            # Blockchain Enrichment
            tx_count = 0
            final_balance = 0.0
            total_received = 0.0
            if crypto_type == "BTC":
                enrichment = enrich_btc_address(node_id)
                if enrichment:
                    tx_count = enrichment["tx_count"]
                    final_balance = enrichment["final_balance"]
                    total_received = enrichment["total_received"]
                    
            # Using Cypher parameters to prevent injection
            query = f"""
            MERGE (n:`{node_type}` {{id: $id}})
            ON CREATE SET n.timestamp = $timestamp, n.sightings_count = 1
            ON MATCH SET n.sightings_count = coalesce(n.sightings_count, 1) + 1
            SET n.category = $category, n.score = $score, n.desc = $desc, n.crypto_type = $crypto_type, n.source_url = $source_url, n.last_seen = $timestamp,
                n.phone = $phone, n.email = $email, n.bank_account = $bank_account, n.real_name = $real_name, n.address = $address, n.estimated_location = $estimated_location,
                n.tx_count = $tx_count, n.final_balance = $final_balance, n.total_received = $total_received
            """
            session.run(query, id=node_id, category=category, score=score, desc=desc, crypto_type=crypto_type, source_url=source_url, timestamp=timestamp,
                        phone=phone, email=email, bank_account=bank_account, real_name=real_name, address=address, estimated_location=estimated_location,
                        tx_count=tx_count, final_balance=final_balance, total_received=total_received)
            
        # Merge Edges
        for edge in edges:
            from_id = edge.get("from")
            to_id = edge.get("to")
            rel = edge.get("relation", "LINKED_TO").upper().replace(" ", "_").replace("-", "_").replace("`", "")
            
            # Neo4j requires the relationship type to be statically defined in the query string,
            # but we can pass the node IDs as parameters.
            query = f"""
            MATCH (a {{id: $from_id}})
            MATCH (b {{id: $to_id}})
            MERGE (a)-[r:`{rel}`]->(b)
            """
            session.run(query, from_id=from_id, to_id=to_id)
            
        # -------------------------------------------------------------
        # Live Blockchain Forensics: Expand graph automatically
        # -------------------------------------------------------------
        for node in nodes:
            node_id = node.get("id")
            node_type = node.get("type", "")
            crypto_type = node.get("crypto_type", "")
            
            if node_type == "Wallet" and crypto_type in ["BTC", "ETH"]:
                txs = trace_wallet(node_id, crypto_type)
                for tx in txs:
                    sender = tx["from"]
                    receiver = tx["to"]
                    amount = tx["value"]
                    tx_hash = tx["hash"]
                    
                    # Prevent tracing 0 value or missing txs
                    if not sender or not receiver or amount <= 0:
                        continue
                        
                    # Create the connected nodes
                    for peer in [sender, receiver]:
                        peer_query = f"""
                        MERGE (n:Wallet {{id: $id}})
                        ON CREATE SET n.timestamp = $timestamp, n.crypto_type = $crypto_type, n.category = 'Unknown', n.source_url = 'On-Chain Forensics'
                        """
                        session.run(peer_query, id=peer, timestamp=datetime.utcnow().isoformat(), crypto_type=crypto_type)
                    
                    # Create the TRANSACTED_WITH edge
                    edge_query = f"""
                    MATCH (a:Wallet {{id: $sender}})
                    MATCH (b:Wallet {{id: $receiver}})
                    MERGE (a)-[r:TRANSACTED_WITH {{tx_hash: $tx_hash}}]->(b)
                    ON CREATE SET r.amount = $amount
                    """
                    session.run(edge_query, sender=sender, receiver=receiver, tx_hash=tx_hash, amount=amount)
                    edges.append({"from": sender, "to": receiver, "relation": "TRANSACTED_WITH", "amount": amount})
                    nodes.append({"id": sender, "type": "Wallet", "crypto_type": crypto_type})
                    nodes.append({"id": receiver, "type": "Wallet", "crypto_type": crypto_type})
                    
    print(f"[NEO4J] Injected {len(nodes)} nodes and {len(edges)} edges into graph (including forensics).")


@app.post("/api/v1/investigate")
def analyze_scraped_data(payload: InvestigateRequest = Body(...)):
    """
    Main integration endpoint.
    Accepts raw scraped text and returns the full intelligence matrix:
    deterministic regex wallet hits + the 4-agent LLM analysis.
    """
    raw_text = payload.raw_text.strip()
    
    # Hard cap the text length to prevent LLM context window crashes
    # especially for Manual Intel Drops where users might paste massive Wikipedia pages
    if len(raw_text) > 4000:
        raw_text = raw_text[:4000]
        print(f"[API] Warning: Payload truncated from {len(payload.raw_text)} to 4000 characters.")
        
    source_url = payload.source_url

    if not raw_text:
        raise HTTPException(status_code=400, detail="raw_text cannot be empty.")

    # 1. Fast deterministic check (no LLM call, near-instant)
    detected_wallets = extract_wallets_via_regex(text=raw_text)

    # 2. Heavy 4-agent LLM swarm (returns an already-parsed dict, or an
    #    {"error": ..., "raw_output": ...} dict if parsing failed)
    intelligence_matrix = run_investigation_pipeline(raw_text=raw_text, source_url=source_url)

    # 3. Inject the results directly into Neo4j
    inject_into_graph(intelligence_matrix)

    # 4. Inject the raw text into LanceDB Evidence Vault
    if lancedb_client is not None and hf_embeddings is not None:
        try:
            content_hash = hashlib.sha256(raw_text.encode('utf-8')).hexdigest()
            
            agent_outputs = intelligence_matrix.get("agent_outputs", {})
            combined_text = raw_text
            if agent_outputs:
                combined_text += "\n\n=== 🕵️‍♂️ AGENT TRACE LOGS ===\n"
                combined_text += f"📍 Agent 1 (OSINT Analyst): {agent_outputs.get('osint', 'N/A')}\n\n"
                combined_text += f"📍 Agent 2 (Risk Scorer): {agent_outputs.get('risk', 'N/A')}\n\n"
                combined_text += f"📍 Agent 3 (Context Interpreter): {agent_outputs.get('context', 'N/A')}\n\n"
                combined_text += f"📍 Agent 4 (Matrix Compiler): {agent_outputs.get('matrix', 'N/A')}"

            vector = hf_embeddings.embed_query(combined_text)
            
            nodes = intelligence_matrix.get("nodes", [])
            risk_score = max([int(n.get("score", 0)) for n in nodes]) if nodes else 0
            
            data = [{
                "vector": vector, 
                "text": combined_text, 
                "source_url": source_url, 
                "risk_score": risk_score,
                "timestamp": datetime.utcnow().isoformat(),
                "content_hash": content_hash
            }]
            if "scraped_evidence" not in lancedb_client.table_names():
                lancedb_client.create_table("scraped_evidence", data=data)
                print(f"[LanceDB] Created new table and injected 1 record.")
            else:
                tbl = lancedb_client.open_table("scraped_evidence")
                # Deduplication check
                # Note: Where clause support can vary by lancedb version, using safe fallback
                all_hashes = [r.get("content_hash") for r in tbl.search().limit(100).to_list()]
                if content_hash in all_hashes:
                    print(f"[LanceDB] Duplicate evidence ignored (hash matched).")
                else:
                    tbl.add(data)
                    print(f"[LanceDB] Injected 1 record into evidence vault.")
        except Exception as e:
            print(f"[LanceDB ERROR] {e}")

    return {
        "status": "ok",
        "regex_detected_wallets": detected_wallets,
        "intelligence_matrix": intelligence_matrix,
    }


@app.get("/api/v1/evidence")
async def get_evidence():
    """Returns the latest intercepted raw text from LanceDB."""
    try:
        if lancedb_client is None:
            return {"evidence": [], "error": "LanceDB not initialized"}
        
        # Reverting to table_names() as list_tables() returns a Paged object in newer versions
        if "scraped_evidence" not in lancedb_client.table_names():
            return {"evidence": []}
            
        tbl = lancedb_client.open_table("scraped_evidence")
        records = tbl.search().to_list()
        
        # Safe sorting and formatting
        records.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)
        records = records[:50]
        
        safe_records = []
        for r in records:
            safe_records.append({
                "text": str(r.get("text", "")),
                "source_url": str(r.get("source_url", "")),
                "risk_score": int(r.get("risk_score", 0)) if str(r.get("risk_score")).isdigit() else r.get("risk_score"),
                "timestamp": str(r.get("timestamp", ""))
            })
            
        return {"evidence": safe_records}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"evidence": [], "error": str(e)}

@app.get("/api/v1/evidence/search")
async def search_evidence(q: str = ""):
    """Semantic search over LanceDB evidence vault."""
    try:
        if lancedb_client is None or hf_embeddings is None:
            return {"evidence": [], "error": "LanceDB/Embeddings not initialized"}
        
        if not q:
            return await get_evidence()

        if "scraped_evidence" not in lancedb_client.table_names():
            return {"evidence": []}
            
        tbl = lancedb_client.open_table("scraped_evidence")
        vector = hf_embeddings.embed_query(q)
        records = tbl.search(vector).limit(20).to_list()
        
        safe_records = []
        for r in records:
            safe_records.append({
                "text": str(r.get("text", "")),
                "source_url": str(r.get("source_url", "")),
                "risk_score": int(r.get("risk_score", 0)) if str(r.get("risk_score")).isdigit() else r.get("risk_score"),
                "timestamp": str(r.get("timestamp", ""))
            })
            
        return {"evidence": safe_records}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"evidence": [], "error": str(e)}


@app.get("/api/v1/export/json")
async def export_json(days: int = 30, category: str = "All Categories", search: str = ""):
    """Exports nodes and edges from the graph as JSON, honoring filters."""
    if not driver:
        raise HTTPException(status_code=500, detail="Neo4j not connected.")
    
    with driver.session() as session:
        # Build dynamic query
        where_clauses = []
        params = {}
        
        if days:
            where_clauses.append("datetime(n.timestamp) >= datetime() - duration({days: $days})")
            params["days"] = days
            
        if category and category != "All Categories":
            where_clauses.append("n.category = $category")
            params["category"] = category
            
        if search:
            where_clauses.append("(toLower(n.id) CONTAINS toLower($search) OR toLower(n.desc) CONTAINS toLower($search))")
            params["search"] = search
            
        where_str = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        
        nodes_query = f"MATCH (n) {where_str} RETURN labels(n) as labels, properties(n) as props"
        nodes_res = session.run(nodes_query, **params)
        nodes = [{"labels": record["labels"], "properties": record["props"]} for record in nodes_res]
        
        # Only fetch edges where both source and target are in the filtered nodes
        node_ids = [n["properties"]["id"] for n in nodes]
        if not node_ids:
            edges = []
        else:
            edges_query = """
            MATCH (a)-[r]->(b) 
            WHERE a.id IN $node_ids AND b.id IN $node_ids 
            RETURN a.id as source, type(r) as rel, b.id as target
            """
            edges_res = session.run(edges_query, node_ids=node_ids)
            edges = [{"source": record["source"], "relation": record["rel"], "target": record["target"]} for record in edges_res]
        
    return {"nodes": nodes, "edges": edges}


@app.get("/api/v1/profile/{node_id}")
async def get_node_profile(node_id: str):
    """Generates an AI behavioral profile using Gemini based on Neo4j evidence."""
    if not driver:
        raise HTTPException(status_code=500, detail="Neo4j not connected.")
        
    with driver.session() as session:
        query = "MATCH (n) WHERE n.id = $node_id RETURN n.desc as desc, n.category as category, n.score as score"
        res = session.run(query, node_id=node_id).single()
        
    if not res:
        raise HTTPException(status_code=404, detail="Node not found.")
        
    text_data = res["desc"] or "No specific evidence text available."
    
    # Check if we have an API key
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY_1")
    if not api_key:
        return {
            "opsec_level": "Unknown",
            "sophistication": "Unknown",
            "motivation": "Unknown",
            "summary": "AI profiling is disabled (No Gemini API key found)."
        }
        
    # Call Gemini via REST
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={api_key}"
        prompt = f"""You are an elite cyber intelligence profiler. Analyze the following intercepted intel regarding a suspect or entity.
Generate a quick psychological / behavioral profile.

Intel:
{text_data}

Return ONLY a valid JSON object (no markdown, no backticks) with EXACTLY these keys:
"opsec_level": "Low", "Moderate", or "High"
"sophistication": "Low", "Moderate", or "High"
"motivation": Brief 1-4 word guess (e.g. "Financial Gain", "Ideological", "Unknown")
"summary": A 1-2 sentence assessment of the threat level and behavior.
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2}
        }
        resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        resp.raise_for_status()
        
        reply = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        # clean possible markdown block
        reply = reply.strip().replace("```json", "").replace("```", "").strip()
        
        return json.loads(reply)
    except Exception as e:
        print("Gemini API Error:", e)
        return {
            "opsec_level": "Error",
            "sophistication": "Error",
            "motivation": "Error",
            "summary": f"Failed to generate profile: {str(e)}"
        }


@app.get("/api/v1/export/csv")
async def export_csv(days: int = 30, category: str = "All Categories", search: str = ""):
    """Exports filtered nodes from the graph as a CSV file."""
    if not driver:
        raise HTTPException(status_code=500, detail="Neo4j not connected.")
    
    # Reuse json logic to get filtered nodes
    data = await export_json(days, category, search)
    nodes = data.get("nodes", [])
    
    # Flatten properties
    flat_nodes = []
    for n in nodes:
        props = n.get("properties", {})
        props["type"] = n.get("labels", ["Entity"])[0] if n.get("labels") else "Entity"
        flat_nodes.append(props)
        
    # Generate CSV in memory
    output = io.StringIO()
    fieldnames = ["id", "type", "category", "score", "crypto_type", "phone", "email", "bank_account", "real_name", "address", "last_seen", "sightings_count", "source_url", "tx_count", "final_balance"]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    for node in flat_nodes:
        writer.writerow(node)
        
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cryptointel_export.csv"}
    )


@app.get("/api/v1/export/pdf")
async def export_pdf(days: int = 30, category: str = "All Categories", search: str = ""):
    """Exports a high-level PDF Intelligence Report."""
    data = await export_json(days, category, search)
    nodes = data.get("nodes", [])
    
    # Filter and sort by risk score
    high_risk = sorted([n["properties"] for n in nodes if n.get("properties", {}).get("score", 0) > 0], key=lambda x: x.get("score", 0), reverse=True)[:15]
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(colors.darkred)
    c.drawString(50, height - 50, "CryptoIntel AI - High Priority Threat Report")
    
    c.setFont("Helvetica", 10)
    c.setFillColor(colors.gray)
    c.drawString(50, height - 70, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC | Filters: {days} Days, {category}")
    
    y = height - 110
    
    if not high_risk:
        c.setFont("Helvetica", 12)
        c.setFillColor(colors.black)
        c.drawString(50, y, "No intelligence targets found for the given criteria.")
    else:
        for i, node in enumerate(high_risk):
            if y < 100:
                c.showPage()
                y = height - 60
                
            c.setFont("Helvetica-Bold", 11)
            c.setFillColor(colors.black)
            node_id = str(node.get("id", "Unknown"))
            if len(node_id) > 75: node_id = node_id[:72] + "..."
            c.drawString(50, y, f"{i+1}. {node.get('type', 'Entity')}: {node_id}")
            
            y -= 15
            c.setFont("Helvetica", 9)
            c.setFillColor(colors.red if node.get('score', 0) >= 70 else colors.black)
            c.drawString(60, y, f"Threat Score: {node.get('score', 0)} | Category: {node.get('category', 'Unknown')}")
            
            y -= 15
            c.setFillColor(colors.darkslategray)
            desc = str(node.get('desc', 'No context available')).replace('\n', ' ')
            if len(desc) > 100: desc = desc[:97] + "..."
            c.drawString(60, y, f"Context: {desc}")
            
            # PII / Blockchain info
            extras = []
            if node.get("crypto_type"): extras.append(f"Crypto: {node.get('crypto_type')}")
            if node.get("tx_count", 0) > 0: extras.append(f"Txs: {node.get('tx_count')} | Received: {node.get('total_received')} BTC")
            if extras:
                y -= 15
                c.setFillColor(colors.gray)
                c.drawString(60, y, " | ".join(extras))
                
            y -= 25
            
    c.save()
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=CryptoIntel_Report.pdf"}
    )


@app.get("/api/v1/export/report")
async def export_report():
    """Generates an HTML Tactical Report for export."""
    if not driver:
        raise HTTPException(status_code=500, detail="Neo4j not connected.")
    
    with driver.session() as session:
        # Fetch nodes
        nodes_res = session.run("MATCH (n) RETURN n.id as id, labels(n)[0] as type, n.category as category, n.score as score, n.desc as desc")
        nodes = [dict(record) for record in nodes_res]
        
        # Fetch edges
        edges_res = session.run("MATCH (a)-[r]->(b) RETURN a.id as source, type(r) as rel, b.id as target")
        edges = [dict(record) for record in edges_res]
        
    high_risk_count = sum(1 for n in nodes if (n.get("score") or 0) > 50 or n.get("category") in ["Narcotics", "Terror Financing"])
    
    node_rows = ""
    for n in sorted(nodes, key=lambda x: x.get("score") or 0, reverse=True):
        risk_class = "high-risk alert-bg" if ((n.get("score") or 0) > 50 or n.get("category") in ["Narcotics", "Terror Financing"]) else ""
        node_rows += f"""
        <tr class="{risk_class}">
            <td>{n.get("id")}</td>
            <td>{n.get("category")}</td>
            <td>{n.get("score")}</td>
            <td>{n.get("desc", "")}</td>
        </tr>
        """
        
    edge_rows = ""
    for e in edges:
        edge_rows += f"""
        <tr>
            <td>{e.get("source")}</td>
            <td>{e.get("rel")}</td>
            <td>{e.get("target")}</td>
        </tr>
        """
        
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>CRYPTOINTEL TACTICAL REPORT</title>
        <style>
            body {{
                font-family: 'Courier New', Courier, monospace;
                background-color: #ffffff;
                color: #000000;
                margin: 40px;
                font-size: 14px;
            }}
            h1 {{
                font-size: 24px;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
                margin-bottom: 20px;
                text-transform: uppercase;
            }}
            .metadata {{
                margin-bottom: 40px;
                font-weight: bold;
                line-height: 1.5;
            }}
            .section-title {{
                font-size: 18px;
                font-weight: bold;
                margin-top: 40px;
                margin-bottom: 10px;
                text-transform: uppercase;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 40px;
            }}
            th, td {{
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
            }}
            th {{
                background-color: #f0f0f0;
            }}
            .high-risk {{
                color: red;
                font-weight: bold;
            }}
            .alert-bg {{
                background-color: #ffeaea;
            }}
        </style>
    </head>
    <body>
        <h1>CRYPTOINTEL TACTICAL REPORT</h1>
        <div class="metadata">
            TIMESTAMP: {datetime.utcnow().isoformat() + 'Z'}<br>
            NEO4J DB: CONNECTED<br>
            STATUS: ACTIVE INTELLIGENCE MATRIX<br>
            TOTAL NODES: {len(nodes)}<br>
            HIGH RISK ALERTS: {high_risk_count}<br>
        </div>

        <div class="section-title">THREAT MATRIX</div>
        <table>
            <tr>
                <th>ENTITY ID</th>
                <th>CATEGORY</th>
                <th>RISK SCORE</th>
                <th>DESCRIPTION</th>
            </tr>
            {node_rows}
        </table>

        <div class="section-title">NETWORK CONNECTIONS</div>
        <table>
            <tr>
                <th>SOURCE ENTITY</th>
                <th>RELATIONSHIP</th>
                <th>TARGET ENTITY</th>
            </tr>
            {edge_rows}
        </table>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)


@app.get("/api/v1/export/pdf")
async def export_pdf():
    """Generates a PDF Tactical Report for export."""
    if not driver:
        raise HTTPException(status_code=500, detail="Neo4j not connected.")
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(status_code=500, detail="ReportLab not installed. Cannot generate PDF.")
    
    with driver.session() as session:
        nodes_res = session.run("MATCH (n) RETURN n.id as id, n.category as category, n.score as score, n.desc as desc")
        nodes = [dict(record) for record in nodes_res]
        
    high_risk_count = sum(1 for n in nodes if (n.get("score") or 0) > 50 or n.get("category") in ["Narcotics", "Terror Financing"])
    
    output = io.BytesIO()
    c = canvas.Canvas(output, pagesize=letter)
    width, height = letter
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "CRYPTOINTEL TACTICAL REPORT")
    
    c.setFont("Helvetica", 10)
    y = height - 80
    c.drawString(50, y, f"TIMESTAMP: {datetime.utcnow().isoformat() + 'Z'}")
    c.drawString(50, y - 15, f"TOTAL NODES: {len(nodes)}")
    c.drawString(50, y - 30, f"HIGH RISK ALERTS: {high_risk_count}")
    
    y -= 70
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "THREAT MATRIX (Top 50 by Score)")
    
    y -= 20
    c.setFont("Helvetica", 8)
    sorted_nodes = sorted(nodes, key=lambda x: x.get("score") or 0, reverse=True)[:50]
    
    for n in sorted_nodes:
        if y < 50:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 8)
        
        score = n.get("score") or 0
        node_str = f"[{score}] {n.get('category')} | {n.get('id')} | {n.get('desc', '')[:100]}..."
        
        if score > 50 or n.get("category") in ["Narcotics", "Terror Financing"]:
            c.setFillColorRGB(0.8, 0, 0)
        else:
            c.setFillColorRGB(0, 0, 0)
            
        c.drawString(50, y, node_str)
        y -= 15
        
    c.save()
    
    return Response(
        content=output.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=crypto_intelligence_export.pdf"}
    )

@app.delete("/api/v1/flush")
def flush_data():
    """Wipes all data from Neo4j and LanceDB. Danger zone."""
    # 1. Neo4j
    if driver:
        with driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
            
    # 2. LanceDB
    if lancedb_client:
        tables = lancedb_client.table_names()
        if "scraped_evidence" in tables:
            lancedb_client.drop_table("scraped_evidence")
            
    return {"status": "success", "message": "All graph and vector data flushed."}

@app.get("/api/v1/health")
def health_check():
    """Returns the live connection status of backend databases."""
    neo4j_status = "Connected" if driver else "Disconnected"
    lancedb_status = "Connected" if lancedb_client else "Disconnected"
    return {
        "neo4j": neo4j_status,
        "lancedb": lancedb_status
    }

class TargetRequest(BaseModel):
    url: str
    type: str

class AskRequest(BaseModel):
    query: str

@app.post("/api/v1/ask")
def ask_ai(payload: AskRequest):
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    try:
        # 1. Search LanceDB for context
        context_texts = []
        if lancedb_client and hf_embeddings:
            if "scraped_evidence" in lancedb_client.table_names():
                tbl = lancedb_client.open_table("scraped_evidence")
                vector = hf_embeddings.embed_query(query)
                results = tbl.search(vector).limit(3).to_list()
                for r in results:
                    context_texts.append(str(r.get("text", "")))
                    
        context_str = "\n\n---\n\n".join(context_texts) if context_texts else "No specific evidence found in database."
        
        # 2. Call Groq
        groq_api_key = os.environ.get("GROQ_ASK_AI_KEY")
        if not groq_api_key:
            return {"answer": "Groq API key not configured for Semantic Search. Missing GROQ_ASK_AI_KEY."}
            
        system_prompt = f"You are CryptoIntel AI. Answer the user's question based ONLY on the evidence below. Keep it concise, analytical, and tactical. If not in the evidence, say so.\n\nEVIDENCE:\n{context_str}"
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            "temperature": 0.1
        }
        
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data)
        if response.status_code == 200:
            answer = response.json()["choices"][0]["message"]["content"]
            return {"answer": answer, "sources": len(context_texts)}
        else:
            return {"answer": f"Groq API Error: {response.text}", "sources": 0}
            
    except Exception as e:
        return {"answer": f"Error occurred: {str(e)}", "sources": 0}

@app.get("/api/v1/scraper/targets")
def get_targets():
    try:
        with open("targets.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return []

@app.post("/api/v1/scraper/targets")
def add_target(target: TargetRequest):
    targets = get_targets()
    targets.append(target.dict())
    with open("targets.json", "w") as f:
        json.dump(targets, f, indent=4)
    return {"status": "success"}

@app.delete("/api/v1/scraper/targets")
def delete_target(url: str):
    targets = get_targets()
    targets = [t for t in targets if t["url"] != url]
    with open("targets.json", "w") as f:
        json.dump(targets, f, indent=4)
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

