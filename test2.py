import urllib.request
import urllib.error

try:
    response = urllib.request.urlopen("http://127.0.0.1:8000/api/v1/evidence")
    print("SUCCESS")
    print(response.read().decode())
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code)
    print(e.read().decode())
except Exception as e:
    print("OTHER ERROR:", e)
