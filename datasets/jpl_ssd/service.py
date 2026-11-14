import json
import os
import urllib.parse
import urllib.request

# ponytail: fetch default sentry & CAD dist-max 10LD sort dist. Upgrade: dinamisasi parameter via CLI.
BASE_URL = "https://ssd-api.jpl.nasa.gov"

def fetch_json(url, out_path):
    req = urllib.request.Request(url, headers={"User-Agent": "spaceapp/1.0"})
    with urllib.request.urlopen(req, timeout=15) as res:
        data = json.loads(res.read().decode("utf-8"))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return out_path

def fetch_all():
    cad_params = urllib.parse.urlencode({
        "dist-max": "10LD",
        "date-min": "2026-01-01",
        "sort": "dist"
    })
    return {
        "sentry": fetch_json(f"{BASE_URL}/sentry.api", "datasets/jpl_ssd/sentry.json"),
        "cad": fetch_json(f"{BASE_URL}/cad.api?{cad_params}", "datasets/jpl_ssd/cad.json")
    }

if __name__ == "__main__":
    saved = fetch_all()
    for k, p in saved.items():
        assert os.path.exists(p) and os.path.getsize(p) > 0, f"JPL SSD {k} failed"
        print(f"JPL SSD {k} saved: {p}")
