import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

# ponytail: fetch browse dan feed harian default 7 hari. Upgrade: pagination cursor browse API via CLI.
BASE_URL = "https://api.nasa.gov/neo/rest/v1"

def fetch_json(url, out_path):
    req = urllib.request.Request(url, headers={"User-Agent": "spaceapp/1.0"})
    with urllib.request.urlopen(req, timeout=15) as res:
        data = json.loads(res.read().decode("utf-8"))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return out_path

def fetch_all(api_key=None):
    key = api_key or os.getenv("NASA_API_KEY", "DEMO_KEY")
    today = datetime.now(timezone.utc).date()
    start = (today - timedelta(days=7)).isoformat()
    end = today.isoformat()

    return {
        "browse": fetch_json(f"{BASE_URL}/neo/browse?api_key={key}", "datasets/neows/neows_browse.json"),
        "feed": fetch_json(f"{BASE_URL}/feed?start_date={start}&end_date={end}&api_key={key}", "datasets/neows/neows_feed.json")
    }

if __name__ == "__main__":
    saved = fetch_all()
    for k, p in saved.items():
        assert os.path.exists(p) and os.path.getsize(p) > 0, f"NeoWs {k} failed"
        print(f"NeoWs {k} saved: {p}")
