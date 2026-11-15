# Is It a Meteor Shower?

**Uncovering NASA's Meteorite Trends & Impact Risks.** NASA Space Apps Challenge 2026, *Be An Earth System Trend Detective!*

The number of meteorites found jumped 66.6× after the 1970s. This project shows that Earth is not being hit more often: the jump comes from scientists searching Antarctic ice. It then shows what a real impact would do to a city.

## The three pages

| Page | File | What it does |
|---|---|---|
| The Documentary | `web/index.html` | Parallax history (Tunguska → Chelyabinsk), meteor shower vs. meteorite, and three data clues: the decade trend, rock types, and a Random Forest + K-Means analysis |
| Treasure Map | `web/map.html` | 511 notable meteorites worldwide, 19 from Indonesia, 888 CNEOS fireballs, K-Means clusters, NASA Black/Blue Marble layers |
| Drop a Meteor! | `web/simulator.html` | Pick a city or click the map: impact energy, breakup altitude, three hazard rings, people affected (SEDAC GPWv4), DART deflection |

## Run it locally

The pages load JSON with `fetch`, so they need a web server; opening the HTML file directly won't work.

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)

Everything is static, so no build step is needed.

1. Repo **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, branch `main`, folder `/ (root)`.
2. The site appears at `https://<owner>.github.io/<repo>/`. The root `index.html` redirects to `web/index.html`.

## Data pipeline

The notebooks in `notebook/` turn the raw NASA files in `datasets/` into the small JSON files in `datasets/exports/` that the web pages read:

1. `preprocessing_api_to_json.ipynb`: download NeoWs, Sentry, CAD and CNEOS data
2. `pipeline_transformation.ipynb`: clean the data (45,716 → 31,911 rows) and add features
3. `preprocessing_population.ipynb`: build the SEDAC population grid
4. `modeling_and_export.ipynb`: run K-Means and the Random Forest, then export the JSON files

Install the Python dependencies with `pip install -r requirements.txt`. The full blueprint is in `docs/project-blueprint.md`.

## Credits

Data from NASA (Meteorite Landings, CNEOS, JPL Sentry/CAD, NeoWs, SEDAC GPWv4, GIBS). Full sources and media credits are at the bottom of the Documentary page.
