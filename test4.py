import requests
import json
print(json.dumps(requests.get("http://127.0.0.1:8002/api/v1/logs").json(), indent=2))
