# RoutePilot AI — Prototype

Intelligent Dispatch & Route Optimization platform prototype for a golf-cart
rental operation (3 hubs, 8 drivers, 186 daily bookings). Built as a static,
front-end-only demo — no backend required.

## What's inside

- **Login** → **Dashboard** → **Daily Optimizer** (paste/import bookings, configure
  hubs, run the AI) → animated "AI thinking" sequence → **Results** (real Leaflet
  map with per-driver colored routes, driver timeline cards, AI reasoning panel,
  route-detail modal with numbered stops)
- **Trailers** (efficiency bars + AI reassignment suggestion), **Conflict Detector**
  (with one-click resolution suggestions), **Deadhead Analysis**, **Demand Heatmap**
- **AI Dispatcher** — a working chat simulation ("Move Driver 3 to Hub A", "Driver
  Mike called in sick", etc.)
- **Prompt Builder** — the actual reusable ChatGPT-ready prompt from the brief,
  with copyable `{{variables}}`
- **Sample Dataset** — searchable table of all 186 bookings
- **Reports** (Chart.js trend line), **Settings** (business rules), **Driver Mobile
  View** (phone mockup), **Customer Timeline** (tracking-page mockup)

Every hover, click, tab, toggle, and modal in the file is functional — this is
built to feel like the real product, not a slide deck.

## Run it locally

No build step. Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Host on GitHub Pages

1. Create a new repository on GitHub (e.g. `routepilot-ai-prototype`).
2. Push this folder's contents to the repo root:
   ```bash
   git init
   git add .
   git commit -m "RoutePilot AI prototype"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. In the repo on GitHub: **Settings → Pages → Source → Deploy from a branch →
   `main` / `root`** → Save.
4. Your live prototype will be at:
   `https://<your-username>.github.io/<repo-name>/`

## Notes

- Map tiles come from OpenStreetMap and Leaflet.js (CDN) — both load fine on
  GitHub Pages with no configuration.
- Charts use Chart.js via CDN.
- All data (drivers, bookings, routes) is generated client-side with a seeded
  random function, so numbers stay consistent across reloads but nothing is
  a real customer record.
