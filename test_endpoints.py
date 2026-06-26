import urllib.request
import json

try:
    print("LOGS:")
    res_logs = urllib.request.urlopen("http://localhost:8000/api/v1/logs").read()
    print(json.loads(res_logs))
    
    print("EVIDENCE:")
    res_ev = urllib.request.urlopen("http://localhost:8000/api/v1/evidence").read()
    print(json.loads(res_ev))
except Exception as e:
    print("ERROR:", e)
