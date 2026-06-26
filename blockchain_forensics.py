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
            # Blockchain.info API (No auth required)
            url = f"https://blockchain.info/rawaddr/{wallet_address}?limit=5"
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                data = res.json()
                for tx in data.get("txs", []):
                    tx_hash = tx.get("hash")
                    # Simplified logic: take the first input and first output
                    inputs = tx.get("inputs", [])
                    outputs = tx.get("out", [])
                    
                    sender = inputs[0].get("prev_out", {}).get("addr") if inputs else "Unknown_Sender"
                    receiver = outputs[0].get("addr") if outputs else "Unknown_Receiver"
                    value_satoshi = outputs[0].get("value", 0) if outputs else 0
                    
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
