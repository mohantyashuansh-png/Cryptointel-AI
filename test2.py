import requests
import json
try:
    print("Sending payload to /api/v1/investigate... (waiting up to 180s for 4 AI agents to finish)")
    resp = requests.post("http://127.0.0.1:8000/api/v1/investigate", json={"raw_text": "Payment of 0.5 BTC expected. Send to bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh.", "source_url": "test"}, timeout=180)
    print("Status:", resp.status_code)
    try:
        print("Body:", json.dumps(resp.json(), indent=2))
    except:
        print("Body:", resp.text)
except Exception as e:
    print("Error:", str(e))
