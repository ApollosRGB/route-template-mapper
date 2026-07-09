# Route Template Mapper

A desktop app (Windows & macOS, portable — no install) for building **SYNAOS maps and route templates** visually: load a map JSON, edit its navigation graphs on a canvas, pair each graph with route templates and mappings, and export everything back out as clean, ready-to-use JSON files.

> **Download:** grab the zip for your platform from the [latest release](../../releases/latest).

## How to run

**Windows** — unzip, double-click `Route Template Mapper.exe`. If SmartScreen warns (the app is not code-signed): **More info → Run anyway**.

**macOS** — download the `arm64` zip for Apple Silicon (M1–M4) or the `intel` zip for Intel Macs. Unzip, then **right-click** `Route Template Mapper.app` → **Open** → **Open** (the app is not notarized). If macOS still refuses:

```bash
xattr -cr "/path/to/Route Template Mapper.app"
```

Your work auto-saves locally — close the app anytime and pick **Resume last session** on the start screen. The **Menu** (house) button in the editors also returns you to the start screen, saving first.

## What it does

### Visual map editor
- Nodes, edges (uni/bidirectional), handling stations (+ groups), charging stations, traffic lights — left-click selects/moves, right-click creates, with grid, rulers, zoom/pan, box-select and a live coordinate readout.
- **Per-graph translation**: slide/rotate a whole navigation graph into the shared map frame in real time (node coordinates stay in graph-local space, exactly like SYNAOS).
- **Access nodes** assigned by clicking, background image tracing, adjustable decimal rounding, live JSON preview.

### Route templates & mappings
- Loads a map's navigation graphs and auto-matches known layouts to their bundled route templates; unknown graphs start from a template style, blank, or "no route template".
- **Generate from map**: builds edge and pickup/dropoff mappings straight from the map's edges and stations. Bulk edit, duplicate ×N, auto-named mapping IDs, reusable samples.
- Exports **one route-template file per graph**.

### Reservation dependencies
- Pick a **first node**, then click its **dependent nodes** on any navigation graph — visualized with colored rings and dashed links.
- Duplicate whole entries (then re-pick the first node), import an existing file, and export to its own `reservation_dependencies_<timestamp>.json` — never mixed into the map or template files.

### Emergency areas & waiting spots
- **Emergency areas**: click 4+ points to outline an area; the polygon *and* a matching `emergencyDetectors` entry are created together, drawn red. A Detectors dialog groups multiple areas under one detector.
- **Waiting spots**: named node sets, built by clicking nodes, assigned to handling-station groups; a selected station highlights its waiting-spot nodes.

### Export
One dialog exports any combination of: the full map, the reservation dependencies, and a route-template file per graph — all written into a single folder you choose.

## Repository layout

| Path | What it is |
|---|---|
| [`Route Template Mapper/`](Route%20Template%20Mapper/) | The app: Electron shell (`electron/`), renderer (`dist/`), tests (`test/`) |
| [`MapGenerator/`](MapGenerator/) | SYNAOS Python/PySimpleGUI map editor used as the reference for map semantics & coordinate transforms |
| [`map_*.json`](map_2026-06-23_14-08-59.json), `*_route_templates_*.json`, [`reservation_dependencies_*.json`](reservation_dependencies_2026-06-23_14-27-23.json) | Sample data files showing the exact export formats |
| [`SESSION_HANDOFF.md`](SESSION_HANDOFF.md) | Technical deep-dive: architecture, data model, coordinate-transform details |

The end-user manual ships with the app: [`Route Template Mapper/README.txt`](Route%20Template%20Mapper/README.txt).

> The original *Robot Template Editor* reference app is not in the repo (packaged binaries only, exceeding GitHub's file-size limit).

## Build from source

```bash
cd "Route Template Mapper"
npm install
npm start              # run in development
npm run package        # → release/Route Template Mapper-win32-x64/ (on Windows)
npm run package:mac    # → darwin arm64 + x64 .app bundles (on macOS)
```

Tests (jsdom drives the real renderer — 132 checks across the whole feature set):

```bash
npm install --no-save jsdom
node test/integration.mjs
```

## Releases

Pushing a `v*` tag triggers the [release workflow](.github/workflows/release.yml), which builds Windows (x64) and macOS (Apple Silicon + Intel) on GitHub-hosted runners and attaches the zips to that tag's GitHub release.

## Data formats

- **Map JSON** — SYNAOS map: `navigationGraphs` (nodes/edges in graph-local coordinates + `graphToMapTransformation`), `waitingSpots`, `handlingStationGroups`, `chargingStations`, `trafficLights`, `areas`, `emergencyDetectors`, `limitedCapacityAreas`.
- **Route-template bundle** — `templates` (steps, actions, placeholder tokens) + `mappings` (fill the placeholders per node/edge/station, tied to a `navigationGraphId`).
- **Reservation dependencies** — array of `{ fromNode, fromNavigationGraph, to: [{ navigationGraph, nodes[] }] }`.

See the sample files in the repo root for complete, real examples of each format.
