==========================================================
  ROUTE TEMPLATE MAPPER
==========================================================

Reads a map JSON file, matches each navigation graph inside
it to a route-template bundle (templates + mappings), lets you
edit them, and exports ONE route-template file per navigation
graph.

----------------------------------------------------------
HOW TO RUN
----------------------------------------------------------
WINDOWS
1. Double-click  "Route Template Mapper.exe"  (in this folder).
2. If Windows SmartScreen shows a blue warning (the app is not
   code-signed): click "More info"  ->  "Run anyway".

MACOS (download the macos zip from the GitHub release:
arm64 = Apple Silicon M1/M2/M3..., intel = older Intel Macs)
1. Unzip; drag "Route Template Mapper.app" wherever you like.
2. First launch: RIGHT-CLICK the app -> "Open" -> "Open"
   (the app is not notarized). If macOS still refuses, run:
   xattr -cr "/path/to/Route Template Mapper.app"
   and open it again.

Your work auto-saves on this PC, so closing and re-opening the
app keeps your last session (use "Resume last session"). The
"Menu" (house) button in the top bar of the editors also takes
you back to this start screen at any time - your work is saved
first, so "Resume last session" brings it right back.

----------------------------------------------------------
THE FLOW
----------------------------------------------------------
1. LOAD A MAP
   On start the app asks for a map .json file. ("Load example
   map" loads the bundled sample so you can try it instantly.)
   The app reads map.navigationGraphs and shows one pill per
   graph at the top.

2. MATCHED vs NEW graphs
   - MATCHED (green "matched"): the graph's id AND its exact set
     of node/edge IDs equal a known graph that ships with the
     app. Its route templates + mappings load automatically and
     you edit as usual.
   - NEW (amber "new"): the graph isn't recognised. You first
     pick a starting route-template style (KUKA-style or
     Tusk-style), start blank, or choose "No route template"
     (see below), customise the template (add attributes, etc.),
     then use "Save as sample" so it becomes reusable.
   - NO ROUTE TEMPLATE: graphs that don't need a route template can
     be marked "No route template" (in that chooser, or with the
     "No route template" button in the bottom bar of any graph).
     They show a "no template" tag and are skipped on export. Use
     "Add a route template" to give one back later.

3. GENERATE FROM MAP (Mappings tab, circular-arrow button)
   Builds mappings straight from the map: one edge-mapping per
   edge, and pickup/dropoff mappings per handling station that
   belongs to the active graph. Existing mappings are kept;
   only missing ones are added. Review the values afterwards.

4. DUPLICATE WITH A COUNT (Mappings tab)
   Each mapping has a "x N" box next to its Duplicate button.
   Set how many copies you want, then click Duplicate.

5. EXPORT
   "Export" opens a checklist: the full map (.json), the
   reservation dependencies (their own .json), plus one
   route-template file per navigation graph. Tick what you want,
   choose ONE folder, and it writes them all:
       <map>_map_<date>.json
       reservation_dependencies_<date>_<time>.json
       <graphId>_route_templates_<date>.json
   e.g. map + dependencies + 2 graphs = up to 4 files.

----------------------------------------------------------
MAP EDITOR (visual)
----------------------------------------------------------
Open it with "New map" on the start screen, or "Map edit" in the
top bar while editing route templates. "Route templates" takes you
back (your existing template work is kept where graphs still match).

- VIEW: mouse wheel = zoom; drag empty space (or Space+drag) = pan.
  The "View" menu (top right of the toolbar) holds the display
  options: Grid + rulers, node coordinates, decimals, "Fit view",
  and the background image controls. The mouse position is shown
  bottom-left (x / y in metres).
- TOOLBAR: the tools (Select, Node, Edge, Station, Charger, Light,
  Emergency, Dependencies, Waiting) are compact icon buttons -
  hover one for a tooltip explaining how it works. "Bidirectional"
  appears only while the Edge tool is active; "Finish area" only
  while you are drawing.
- LEFT-CLICK = SELECT (any object: node, edge, station, …).
    * Drag a selected object to move it.
    * Shift+click adds/removes another object from the selection.
    * Shift+drag on empty space = box-select (marquee) many at once.
    * With several selected: drag any one to move them all together,
      or press Delete (or the info-box "Delete N") to remove them all.
    * Double-click an object to open its edit dialog.
    * ACCESS NODES: pick the Station tool, select a station, then
      left-click nodes to add/remove them as that station's access
      nodes (a green dashed line + ring marks each one; the station
      stays selected). The Charger tool works the same way for a
      charging station's access nodes. In other tools, clicking a
      node just selects it.
- ICONS: each element type has its own shape + colour — blue circle
  (node), teal rounded-square (station), red hexagon (charger), amber
  triangle (traffic light), violet outline (area).
- RIGHT-CLICK = CREATE with the chosen tool:
    * Node/Station/Charger/Light: right-click the canvas to place one.
    * Edge: right-click the start node, then the end node.
      "Bidirectional" makes BOTH directions (two opposite edges) at once.
    * Emergency area: see below (left-click drawing).
- EDIT dialogs: nodes (id, X, Y, parking/emergency), stations
  (id, X, Y, access nodes), edges (id, bidirectional), etc.
- TRANSLATE A GRAPH: the ✥ button by the graph selector opens a
  live "Translate" panel — type Translation X/Y [m] or Rotation Z
  [rad] and the graph slides in real time into the shared map frame
  (e.g. translate Tusk so it lands exactly on the Kuka graph and the
  shared stations, like SYNAOS). Node positions you store stay in the
  graph's own local coordinates; only its placement in the map moves.
  ("Name & AGV types…" in that panel edits the graph id / AGV types.)
- COORDS: the "Coords" checkbox labels each active-graph node with
  both its local coords (loc graphX, graphY) and its translated map
  coords (map mapX, mapY), so you can see the translation take effect.
- STATIONS must be grouped to be used: "Groups" opens the grouping
  editor (add/delete groups, Controlled / JustInSequence / selection
  mode, move stations between Available and Assigned).
- BACKGROUND: "Open" loads a PNG as a tracing backdrop (set
  Meters-per-pixel + offset via the ✥ button). It is a visual aid
  only and is NOT written into the exported map.
- DECIMALS: rounds all coordinates (on drag/typing and on export).
- "Preview map" shows the exact map JSON that will be exported.

----------------------------------------------------------
RESERVATION DEPENDENCIES (Dependencies tool - chain-link icon)
----------------------------------------------------------
Defines which nodes must be free before a node can be reserved.
Exported as its OWN file (reservation_dependencies_<date>.json),
never into the map or route-template files.

- Pick the "Dependencies" tool: a panel opens on the left.
- Click a node on the map -> it becomes the FIRST NODE of a new
  entry (magenta ring). Then click any other nodes - on ANY
  navigation graph - to add/remove them as DEPENDENT nodes
  (cyan rings + dashed magenta lines). Click "Done" to finish.
- Every entry is listed in the panel: click one to edit it,
  click a chip to remove that dependent node, or use the
  buttons: (target) re-pick the first node, (copy) DUPLICATE the
  whole entry - the copy keeps all dependents, then your next
  node click sets its new first node - and (trash) delete.
- "Import..." loads an existing reservation-dependencies .json
  so you can extend it. The list also auto-saves with your
  session.
- Small magenta rings mark all first nodes while the tool is
  active; selecting a first node with the Select tool also
  highlights its dependency.

----------------------------------------------------------
EMERGENCY AREAS (Emergency tool + Detectors)
----------------------------------------------------------
- Pick the "Emergency" tool (warning-triangle icon) and simply
  LEFT-CLICK 4 or more points on the map (works over any
  navigation graph - points are map coordinates). The info box
  shows a live point count, and a faint line previews the
  closing edge.
- CLOSE the area by clicking the highlighted FIRST point
  ("click to close" ring), pressing Enter, double-clicking, or
  the "Finish area (N points)" button. Esc cancels the draft.
- Finishing writes BOTH the polygon into map.areas AND a
  matching entry in map.emergencyDetectors ("<area> Detector"),
  so the area is armed immediately. Emergency areas are drawn
  RED.
- "Detectors" (Manage group) manages the detectors: rename
  them, and tick which areas each detector watches - e.g. one
  "All Lanes Detector" covering several areas, like the sample
  map. Double-clicking an area also offers an "Emergency area"
  checkbox (plain non-emergency areas from loaded maps keep
  working; there is just no separate drawing tool for them).

----------------------------------------------------------
WAITING SPOTS (Waiting tool - clock icon)
----------------------------------------------------------
- Pick the "Waiting" tool: a panel lists all waiting spots.
- Click a node on the map to create a spot with it (or select a
  spot first, then click nodes to add/remove them - orange
  rings). Rename a spot via its ID box; duplicate/delete with
  the row buttons.
- ASSIGN TO STATIONS: double-click a station and tick the
  waiting spots it should use (stored on the station's GROUP,
  exactly like the SYNAOS map format - the "Groups" dialog has
  the same checkboxes). Selecting a station highlights its
  waiting-spot nodes in orange with dashed lines.
- Waiting spots are exported inside the map .json (top-level
  "waitingSpots" + per-group references).

----------------------------------------------------------
TEMPLATES & MAPPINGS (same model as Robot Template Editor)
----------------------------------------------------------
TEMPLATES  - reusable blueprints: nodes, edges, steps, actions,
             action parameters (with data type), attributes, and
             the target handling-station condition. Values are
             placeholder tokens (e.g. DROP_CONTAINERX_A).
             Editing a template auto-syncs its mappings.
MAPPINGS   - concrete instances grouped by template. "Fill from
             template" creates the expected keys; then type each
             value. Bulk-edit several at once via the checkboxes.
             Mapping IDs auto-build as
             <template>_<node values>_mapping.

----------------------------------------------------------
SAMPLES
----------------------------------------------------------
"Samples" (top bar) lists the built-in route templates plus any
you saved, and lets you open one in the editor to check/edit it.
Built-in samples open as a copy you re-save under a new name.

----------------------------------------------------------
APPEARANCE
----------------------------------------------------------
Dark mode is on by default; use the Light/Dark button (top
right) to switch. Your choice is remembered.

----------------------------------------------------------
SHARING THE APP
----------------------------------------------------------
Zip this whole folder and send it. The recipient unzips and
double-clicks the .exe (no install).

The exported files match the format of the provided
route-template .json files.
==========================================================
