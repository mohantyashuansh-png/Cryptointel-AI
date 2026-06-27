import requests
resp = requests.post("http://127.0.0.1:8002/api/v1/ask", json={"query": "tell me about 0.5 btc case"})
print(resp.status_code)
print(resp.text)
