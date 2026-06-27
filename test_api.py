import requests
resp = requests.post("http://127.0.0.1:8000/api/v1/investigate", json={"raw_text": "Payment of 0.5 BTC expected. Send to bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh.", "source_url": "test"})
print(resp.status_code)
print(resp.text)
