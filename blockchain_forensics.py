import requests
import os
from dotenv import load_dotenv

load_dotenv()

ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY", "")

def trace_wallet(wallet_address, crypto_type):
    """
    Fetches the last few transactions for a wallet from public blockchains.
    Returns a list of dicts: [{"from": "addr", "to": "addr", "value": float_amount, "hash": "txhash"}]
    """
    transactions = []
    print(f"[FORENSICS] Tracing {crypto_type} wallet {wallet_address} on-chain...")
    
    try:
        if crypto_type.upper() == "BTC":
            # Mempool.space API (No auth required, high limits)
            url = f"https://mempool.space/api/address/{wallet_address}/txs"
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                txs = res.json()
                # Take up to 5 most recent transactions
                for tx in txs[:5]:
                    tx_hash = tx.get("txid")
                    vin = tx.get("vin", [])
                    vout = tx.get("vout", [])
                    
                    sender = vin[0].get("prevout", {}).get("scriptpubkey_address") if (vin and vin[0].get("prevout")) else "Unknown_Sender"
                    receiver = vout[0].get("scriptpubkey_address") if vout else "Unknown_Receiver"
                    value_satoshi = vout[0].get("value", 0) if vout else 0
                    
                    # Convert Satoshi to BTC
                    value_btc = value_satoshi / 100000000.0
                    
                    transactions.append({
                        "from": sender,
                        "to": receiver,
                        "value": value_btc,
                        "hash": tx_hash
                    })
        
        elif crypto_type.upper() == "ETH":
            if not ETHERSCAN_API_KEY:
                print("[!] No Etherscan API key found. Skipping ETH trace.")
                return []
                
            # Etherscan API (Requires Auth)
            url = f"https://api.etherscan.io/api?module=account&action=txlist&address={wallet_address}&startblock=0&endblock=99999999&page=1&offset=5&sort=desc&apikey={ETHERSCAN_API_KEY}"
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "1":
                    for tx in data.get("result", []):
                        sender = tx.get("from")
                        receiver = tx.get("to")
                        value_wei = float(tx.get("value", 0))
                        
                        # Convert Wei to ETH
                        value_eth = value_wei / 1e18
                        
                        transactions.append({
                            "from": sender,
                            "to": receiver,
                            "value": value_eth,
                            "hash": tx.get("hash")
                        })
    except Exception as e:
        print(f"[!] Error tracing wallet {wallet_address}: {e}")
            
    return transactions

def trace_wallet_deep(start_address: str, crypto_type: str, max_hops: int = 3, max_nodes: int = 30):
    """
    BFS multi-hop wallet tracer.
    Follows money flow up to max_hops deep.
    Returns all discovered edges as a flat list.
    """
    visited = set()
    queue = [(start_address, 0)]
    all_edges = []
    
    print(f"[FORENSICS-DEEP] Starting {max_hops}-hop BFS trace from {start_address}...")
    import time
    
    while queue and len(visited) < max_nodes:
        address, depth = queue.pop(0)
        
        if address in visited or depth >= max_hops:
            continue
            
        visited.add(address)
        print(f"  [HOP {depth}] Tracing {address[:20]}... ({len(visited)}/{max_nodes} nodes)")
        
        # Throttling to respect API rate limits
        if len(visited) > 1:
            time.sleep(0.5)
            
        # Use existing 1-hop tracer
        txs = trace_wallet(address, crypto_type)
        
        for tx in txs:
            if tx.get("value", 0) > 0:  # Skip zero-value txns
                all_edges.append({**tx, "hop_depth": depth, "origin": start_address})
                
                # Add peers to queue for next hop
                peer = tx.get("to")
                if peer and peer not in visited and peer != "Unknown_Receiver":
                    queue.append((peer, depth + 1))
    
    print(f"[FORENSICS-DEEP] Traced {len(visited)} wallets, {len(all_edges)} transactions across {max_hops} hops.")
    return all_edges
