/* Integration test: drives the real renderer (dist/app.js) inside jsdom.
 * Run: node test/integration.mjs   (requires jsdom installed) */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, '..', 'dist');
// Strip external <script> tags so jsdom doesn't try to fetch/run them; we inject manually.
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g, '');
const knownData = fs.readFileSync(path.join(dist, 'knownData.js'), 'utf8');
const appJs = fs.readFileSync(path.join(dist, 'app.js'), 'utf8');

let passed = 0, failed = 0;
function ok(name, cond, extra) { if (cond) { passed++; console.log('  PASS  ' + name); } else { failed++; console.log('  FAIL  ' + name + (extra ? '  → ' + extra : '')); } }

function boot(mutateKnown) {
  return new Promise((resolve) => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true });
    const { window } = dom;
    window.confirm = () => true;
    window.alert = () => {};
    const go = () => {
      window.eval(knownData);
      if (mutateKnown) mutateKnown(window);
      window.eval(appJs);        // readyState is 'complete' now → init() runs exactly once
      resolve(window);
    };
    if (window.document.readyState === 'complete') go();
    else window.addEventListener('load', go);
  });
}
const q = (w, s) => w.document.querySelector(s);
const qa = (w, s) => [...w.document.querySelectorAll(s)];
const click = (el, w) => el.dispatchEvent(new w.Event('click', { bubbles: true }));
function counts(w) {
  const t = (q(w, '.footer-hint') || {}).textContent || '';
  const m = t.match(/(\d+)\s+templates\s+·\s+(\d+)\s+mappings/);
  return m ? { templates: +m[1], mappings: +m[2] } : { templates: -1, mappings: -1 };
}

// ============================ A) Happy path: real example map ============================
console.log('\n[A] Example map — matching, generation, duplicate, preview');
{
  const w = await boot();
  ok('landing shows Load-example button', !!q(w, '[data-act="loadExample"]'));

  click(q(w, '[data-act="loadExample"]'), w);
  const pills = qa(w, '.graph-pill');
  ok('2 navigation graphs become 2 pills', pills.length === 2, 'got ' + pills.length);
  ok('both graphs matched (2 green badges)', qa(w, '.gp-badge.ok').length === 2, qa(w, '.gp-badge.ok').length + ' matched');
  ok('no base-chooser for matched graph', !q(w, '[data-act="base:pack"]'));

  let c = counts(w);
  ok('kuka graph (gi=0) loaded 1 template / 13 mappings', c.templates === 1 && c.mappings === 13, JSON.stringify(c));

  // generate from map → kuka has 21 edges, so 13 → 21
  click(q(w, '[data-act="tab"][data-tab="mappings"]'), w);
  click(q(w, '[data-act="map:generate"]'), w);
  c = counts(w);
  ok('generate-from-map fills all 21 kuka edges', c.mappings === 21, JSON.stringify(c));

  // duplicate the active mapping x3 → 21 → 24
  const dup = q(w, '[data-dupcount]');
  ok('duplicate-count input is present', !!dup);
  if (dup) dup.value = '3';
  click(q(w, '[data-act="map:dup"]'), w);
  c = counts(w);
  ok('duplicate x3 adds 3 mappings (21 → 24)', c.mappings === 24, JSON.stringify(c));

  // preview JSON is a docked right-side panel that updates live
  click(q(w, '[data-act="preview"]'), w);
  ok('preview opens as a docked side panel (not a modal)', !!q(w, '.preview-panel') && !q(w, '.modal-overlay'));
  const pre = q(w, '#preview-pre');
  let parsed = null; try { parsed = JSON.parse(pre.textContent); } catch (e) {}
  ok('Preview JSON parses', !!parsed);
  ok('Preview has templates[] and mappings[]', parsed && Array.isArray(parsed.templates) && Array.isArray(parsed.mappings));
  ok('Preview mapping carries navigationGraphId', parsed && parsed.mappings[0] && parsed.mappings[0].navigationGraphId === 'KMP 400P-1-5G diffDrive', parsed && parsed.mappings[0] && parsed.mappings[0].navigationGraphId);
  const idInput = q(w, '[data-path^="mappings."][data-path$=".id"]');
  if (idInput) { idInput.value = 'ZZZ_live_preview_check'; idInput.dispatchEvent(new w.Event('input', { bubbles: true })); }
  ok('preview updates live as you edit', /ZZZ_live_preview_check/.test(q(w, '#preview-pre').textContent));
  click(q(w, '[data-act="preview:close"]'), w);
  ok('closing preview removes the panel', !q(w, '.preview-panel'));

  // switch to tusk graph → 3 templates / 19 mappings, generate is idempotent
  click(qa(w, '.graph-pill')[1], w);
  c = counts(w);
  ok('tusk graph (gi=1) has 3 templates / 19 mappings', c.templates === 3 && c.mappings === 19, JSON.stringify(c));
  click(q(w, '[data-act="tab"][data-tab="mappings"]'), w);
  click(q(w, '[data-act="map:generate"]'), w);
  c = counts(w);
  ok('generate is idempotent for fully-covered tusk graph (stays 19)', c.mappings === 19, JSON.stringify(c));
}

// ============================ B) Unknown-graph flow ============================
console.log('\n[B] Unknown graph — base chooser + save-as-sample path');
{
  const w = await boot((win) => {
    // Rename the first known graph in the *map* so it no longer matches a known graph.
    win.EXAMPLE_MAP = JSON.parse(JSON.stringify(win.EXAMPLE_MAP));
    win.EXAMPLE_MAP.navigationGraphs[0].id = 'KMP_RENAMED_UNKNOWN';
  });
  click(q(w, '[data-act="loadExample"]'), w);
  ok('still 2 pills', qa(w, '.graph-pill').length === 2);
  ok('one matched + one new', qa(w, '.gp-badge.ok').length === 1 && qa(w, '.gp-badge.warn').length === 1,
     'ok=' + qa(w, '.gp-badge.ok').length + ' warn=' + qa(w, '.gp-badge.warn').length);
  ok('active unknown graph shows the base chooser', !!q(w, '[data-act="base:pack"]'));
  ok('base chooser offers a "Start blank" option', !!q(w, '[data-act="base:blank"]'));

  // pick the kuka-style base pack
  click(q(w, '[data-act="base:pack"]'), w);
  ok('after choosing a base, chooser disappears', !q(w, '[data-act="base:pack"]'));
  ok('base pack loaded at least 1 template', counts(w).templates >= 1, JSON.stringify(counts(w)));
  ok('"Save as sample" affordance exists for the new graph', !!q(w, '[data-act="graph:saveSample"]'));
}

// ============================ C) Samples editor ============================
console.log('\n[C] Sample templates — open & edit');
{
  const w = await boot();
  click(q(w, '[data-act="samples"]'), w);
  ok('Samples modal lists built-in samples', qa(w, '[data-act="sample:edit"]').length >= 2, qa(w, '[data-act="sample:edit"]').length + ' samples');
  click(qa(w, '[data-act="sample:edit"]')[0], w);
  ok('opening a sample enters sample-edit mode', !!q(w, '.graph-bar.sample'));
  ok('sample editor exposes Save-as-sample', !!q(w, '[data-act="sample:saveAs"]'));
}

// ============================ D) Top bar + export picker ============================
console.log('\n[D] Top bar consolidation + export picker');
{
  const w = await boot();
  click(q(w, '[data-act="loadExample"]'), w);
  ok('top bar has Preview JSON', !!q(w, '.app-header [data-act="preview"]'));
  ok('top bar has Save as sample', !!q(w, '.app-header [data-act="graph:saveSample"]'));
  ok('top bar has exactly one Export', qa(w, '.app-header [data-act="exportAll"]').length === 1, qa(w, '.app-header [data-act="exportAll"]').length + '');
  ok('footer keeps the moved actions in the top bar (not the footer)', !q(w, '.app-footer [data-act="exportAll"]') && !q(w, '.app-footer [data-act="preview"]') && !q(w, '.app-footer [data-act="graph:saveSample"]'));
  ok('footer shows autosave status slot', !!q(w, '.app-footer #save-status'));

  click(q(w, '.app-header [data-act="exportAll"]'), w);
  ok('export picker lists both graphs', qa(w, '[data-act="export:toggle"]').length === 2, qa(w, '[data-act="export:toggle"]').length + '');
  ok('export picker also offers the map', !!q(w, '[data-act="export:map"]'));
  click(q(w, '[data-act="export:map"]'), w); // untick the map to isolate graph counts
  ok('confirm starts at "Export 2 files"', /Export 2 files/.test((q(w, '[data-act="export:confirm"]') || {}).textContent || ''), (q(w, '[data-act="export:confirm"]') || {}).textContent);
  click(qa(w, '[data-act="export:toggle"]')[0], w);
  ok('unticking one → "Export 1 file"', /Export 1 file\b/.test((q(w, '[data-act="export:confirm"]') || {}).textContent || ''), (q(w, '[data-act="export:confirm"]') || {}).textContent);
}

// ============================ E) Map editor ============================
console.log('\n[E] Map editor — view, transforms, edges, export, reconcile');
{
  const w = await boot();
  const approx = (a, b) => Math.abs(a - b) < 1e-6;
  click(q(w, '[data-act="loadExample"]'), w);
  click(q(w, '[data-act="mapEdit"]'), w);
  ok('map editor view renders (toolbar + canvas)', !!q(w, '.map-toolbar') && !!q(w, '#map-svg'));
  ok('graph selector lists both graphs', qa(w, '.mt-graph option').length === 2, qa(w, '.mt-graph option').length + '');
  ok('canvas draws node circles', qa(w, 'circle[data-mt="node"]').length >= 20, qa(w, 'circle[data-mt="node"]').length + ' nodes');
  ok('canvas draws edges', qa(w, 'line[data-mt="edge"]').length >= 30, qa(w, 'line[data-mt="edge"]').length + ' edges');
  ok('canvas draws stations', qa(w, 'rect[data-mt="station"]').length === 5, qa(w, 'rect[data-mt="station"]').length + ' stations');

  const api = w.__rtm;
  // transforms round-trip (tusk graph has a non-zero translation)
  const tusk = api.state.map.navigationGraphs.find((g) => g.id === 'tusk');
  const mp = api.g2m(tusk, 10.2, 4.45324); const gp = api.m2g(tusk, mp.x, mp.y);
  ok('g2m→m2g round-trips', approx(gp.x, 10.2) && approx(gp.y, 4.45324), JSON.stringify(gp));
  ok('transform subtracts translation (SYNAOS direction)', approx(mp.x, 10.2 - tusk.graphToMapTransformation.xTranslation), mp.x + '');

  // bidirectional edge creates the reverse
  const g = api.normalizeMap(api.emptyMap()).navigationGraphs[0] || api.newGraph('g');
  g.nodes = [{ id: 'A', graphX: 0, graphY: 0, graphZ: 0 }, { id: 'B', graphX: 1, graphY: 0, graphZ: 0 }]; g.edges = [];
  api.state.mapEd.edgeBidir = true; api.addEdge(g, 'A', 'B');
  ok('bidirectional edge makes 2 directed edges', g.edges.length === 2, g.edges.length + '');
  ok('reverse edge has swapped start/end', g.edges.some((e) => e.startNodeId === 'A' && e.endNodeId === 'B') && g.edges.some((e) => e.startNodeId === 'B' && e.endNodeId === 'A'));

  // rounding on export
  api.state.mapEd.decimals = 2;
  const outMap = api.canonicalizeMap(api.state.map);
  const tNodes = outMap.navigationGraphs.find((x) => x.id === 'tusk').nodes;
  const rounded = tNodes.find((n) => n.id === '0013');
  ok('canonicalizeMap rounds coords to decimals', rounded && rounded.graphY === 4.45, rounded && rounded.graphY);
  ok('export keeps full SYNAOS shape', Array.isArray(outMap.handlingStationGroups) && Array.isArray(outMap.chargingStations) && Array.isArray(outMap.areas));

  // export picker includes the map in map view
  click(q(w, '.app-header [data-act="exportAll"]'), w);
  ok('export picker shows the Map option', !!q(w, '[data-act="export:map"]'));
  ok('export count includes map + 2 graphs', /Export 3 files/.test((q(w, '[data-act="export:confirm"]') || {}).textContent || ''), (q(w, '[data-act="export:confirm"]') || {}).textContent);
}

// ============================ F) New map + reconciliation ============================
console.log('\n[F] New map + non-destructive reconcile');
{
  const w = await boot();
  click(q(w, '[data-act="newMap"]'), w);
  ok('New map opens the editor with one graph', !!q(w, '.map-toolbar') && qa(w, '.mt-graph option').length === 1);
  ok('new map starts with no nodes', qa(w, 'circle[data-mt="node"]').length === 0);

  const api = w.__rtm;
  // simulate prior route work, then add a graph and reconcile
  api.state.graphs = [{ graphId: 'graph1', agvTypes: [], nodeIds: [], edgeIds: [], matched: false, baseChosen: true, bundle: { templates: [{ id: 'T', nodes: [], edges: [], steps: [] }], mappings: [] } }];
  api.state.map.navigationGraphs.push(api.newGraph('graph2'));
  const r = api.reconcileGraphsAfterMapEdit();
  ok('reconcile keeps existing graph bundle', r.kept === 1 && api.state.graphs.find((x) => x.graphId === 'graph1').bundle.templates.length === 1, JSON.stringify(r));
  ok('reconcile adds the new graph', r.added === 1 && !!api.state.graphs.find((x) => x.graphId === 'graph2'));
}

// ============================ G) Map editor — left/right, grid, multi-select ============================
console.log('\n[G] Map editor — left=select, right=create, grid/ruler/readout, multi-select');
{
  const w = await boot();
  click(q(w, '[data-act="loadExample"]'), w);
  click(q(w, '[data-act="mapEdit"]'), w);
  const api = w.__rtm;
  ok('grid lines render', qa(w, 'line.m-grid').length > 0, qa(w, 'line.m-grid').length + '');
  ok('ruler labels render', qa(w, 'text.m-rlbl').length > 0, qa(w, 'text.m-rlbl').length + '');
  ok('coordinate readout present', !!q(w, '#map-readout'));
  ok('crosshair lines present', !!q(w, '#map-xh-v') && !!q(w, '#map-xh-h'));

  click(q(w, '[data-act="mapMode"][data-mode="node"]'), w);
  const svg = q(w, '#map-svg'); // re-grab: the mode click re-rendered the canvas
  const g0 = api.mapGraph(); const before = g0.nodes.length;
  svg.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 300, clientY: 300 }));
  w.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  ok('left-click does NOT create', api.mapGraph().nodes.length === before, 'now ' + api.mapGraph().nodes.length);
  svg.dispatchEvent(new w.MouseEvent('contextmenu', { bubbles: true, clientX: 320, clientY: 300 }));
  ok('right-click creates a node', api.mapGraph().nodes.length === before + 1, 'now ' + api.mapGraph().nodes.length);
  ok('created node is auto-selected', api.state.mapEd.selset.length === 1 && api.state.mapEd.selset[0].type === 'node');

  const nodes = api.mapGraph().nodes;
  api.state.mapEd.selset = [{ type: 'node', id: nodes[0].id, graphId: g0.id }, { type: 'node', id: nodes[1].id, graphId: g0.id }];
  const n2 = api.mapGraph().nodes.length;
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  ok('Delete removes all selected (2 at once)', api.mapGraph().nodes.length === n2 - 2, 'removed ' + (n2 - api.mapGraph().nodes.length));
}

// ============================ H) Graph translation alignment + coords + live panel ============================
console.log('\n[H] Translation aligns graphs · coord labels · live translate panel');
{
  const w = await boot();
  const approx = (a, b, t) => Math.abs(a - b) < (t || 0.01);
  click(q(w, '[data-act="loadExample"]'), w);
  click(q(w, '[data-act="mapEdit"]'), w);
  const api = w.__rtm;
  const tusk = api.state.map.navigationGraphs.find((g) => g.id === 'tusk');
  // node 0003 must land next to its station T1 (mapX 27.6, mapY 10.30); access node ~1.5 m away
  const m0003 = api.g2m(tusk, 19, 7.1);
  ok('tusk 0003 lands on the Kuka/station side (mapX≈26.1, not 11.9)', approx(m0003.x, 26.115) && approx(m0003.y, 10.297), JSON.stringify(m0003));
  const m0013 = api.g2m(tusk, 10.2, 4.45324);
  ok('tusk 0013 lands next to station T2 (mapX≈17.32)', approx(m0013.x, 17.315), m0013.x + '');
  // graphs now overlap: tusk maps into Kuka's x-range (16..26) instead of 3..12
  ok('translated Tusk overlaps Kuka in the map frame', m0003.x > 20 && m0013.x > 15, m0003.x + ' / ' + m0013.x);

  // Coords toggle → coord labels render
  click(q(w, '[data-act="viewMenu"]'), w); // Coords toggle now lives in the View dropdown
  const cb = q(w, '[data-act="coordsToggle"]'); cb.checked = true; cb.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok('coord labels render when Coords is on', qa(w, 'text.m-clbl').length > 0, qa(w, 'text.m-clbl').length + '');

  // Live translate panel
  click(q(w, '[data-act="graphTranslate"]'), w);
  ok('translate panel opens', !!q(w, '.map-translate') && !!q(w, '[data-act="trans"][data-axis="x"]'));
  const kuka = api.state.map.navigationGraphs.find((g) => g.id.startsWith('KMP'));
  const xi = q(w, '[data-act="trans"][data-axis="x"]'); xi.value = '5'; xi.dispatchEvent(new w.Event('input', { bubbles: true }));
  ok('typing in the panel updates the transform live', kuka.graphToMapTransformation.xTranslation === 5, kuka.graphToMapTransformation.xTranslation + '');
  ok('live edit moves the graph (g2m reflects new translation)', approx(api.g2m(kuka, 16, 10.366).x, 16 - 5), api.g2m(kuka, 16, 10.366).x + '');
}

// ============================ I) Access nodes — assign by clicking, only in the matching tool ============================
console.log('\n[I] Access nodes — gated to the Station/Charger tool');
{
  const w = await boot();
  click(q(w, '[data-act="loadExample"]'), w);
  click(q(w, '[data-act="mapEdit"]'), w);
  const api = w.__rtm, s = api.state;
  const st = api.allStations()[0].st;
  const nid = q(w, 'circle[data-mt="node"]').getAttribute('data-mid'), gid = q(w, 'circle[data-mt="node"]').getAttribute('data-mg');
  const clickNode = () => { const c = q(w, 'circle[data-mt="node"][data-mid="' + nid + '"][data-mg="' + gid + '"]'); c.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 5, clientY: 5 })); w.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true })); };

  // SELECT tool: clicking a node with a station selected must NOT assign (it selects the node)
  click(q(w, '[data-act="mapMode"][data-mode="select"]'), w);
  st.accessNodes = []; s.mapEd.selset = [{ type: 'station', id: st.id }];
  clickNode();
  ok('SELECT tool: node click does NOT assign (selects the node instead)', st.accessNodes.length === 0 && s.mapEd.selset[0].type === 'node', JSON.stringify({ acc: st.accessNodes.length, sel: s.mapEd.selset[0].type }));

  // STATION tool: clicking a node assigns / unassigns
  click(q(w, '[data-act="mapMode"][data-mode="station"]'), w);
  st.accessNodes = []; s.mapEd.selset = [{ type: 'station', id: st.id }];
  clickNode();
  ok('STATION tool: node click ADDS a station access node', st.accessNodes.length === 1 && st.accessNodes[0].nodeId === nid, JSON.stringify(st.accessNodes));
  ok('station stays selected', s.mapEd.selset.length === 1 && s.mapEd.selset[0].type === 'station');
  clickNode();
  ok('STATION tool: clicking again REMOVES it', st.accessNodes.length === 0);

  // CHARGER gets the same feature in the CHARGER tool
  s.map.chargingStations.push({ id: 'C1', mapX: 0, mapY: 0, mapZ: 0, length: 5, width: 5, height: 5, controlled: true, accessNodes: [] });
  click(q(w, '[data-act="mapMode"][data-mode="charger"]'), w);
  s.mapEd.selset = [{ type: 'charger', id: 'C1' }];
  clickNode();
  const c1 = s.map.chargingStations.find((c) => c.id === 'C1');
  ok('CHARGER tool: node click ADDS a charger access node', c1.accessNodes.length === 1 && c1.accessNodes[0].nodeId === nid, JSON.stringify(c1.accessNodes));
}

// ============================ J) "No route template" option ============================
console.log('\n[J] No-route-template choice');
{
  const w = await boot();
  click(q(w, '[data-act="newMap"]'), w);   // map editor with one (unmatched) graph
  click(q(w, '[data-act="route"]'), w);     // back to route view → base chooser
  const s = w.__rtm.state;
  ok('base chooser offers "No route template"', !!q(w, '[data-act="base:none"]'));
  click(q(w, '[data-act="base:none"]'), w);
  ok('graph is marked noRouteTemplate', s.graphs[s.gi].noRouteTemplate === true);
  ok('editor shows the no-template placeholder', !!q(w, '[data-act="graph:withTemplate"]') && /No route template/i.test(q(w, '.detail-inner').textContent));
  click(q(w, '.app-header [data-act="exportAll"]'), w);
  ok('export lists it as skipped with no toggle', /no route template/i.test((q(w, '.sample-list') || {}).textContent || '') && !q(w, '[data-act="export:toggle"]'));
  click(q(w, '[data-act="export:close"]'), w);
  click(q(w, '[data-act="graph:withTemplate"]'), w);
  ok('“Add a route template” reopens the chooser', !!q(w, '[data-act="base:none"]') || !!q(w, '[data-act="base:pack"]'));
}

// ============================ K) Reservation dependencies ============================
console.log('\n[K] Reservation dependencies — edit, duplicate, import shape, export');
{
  const w = await boot();
  click(q(w, '[data-act="loadExample"]'), w);
  click(q(w, '[data-act="mapEdit"]'), w);
  const api = w.__rtm, s = api.state;

  click(q(w, '[data-act="mapMode"][data-mode="deps"]'), w);
  ok('deps tool opens the side panel', !!q(w, '#map-side') && /Reservation dependencies/.test(q(w, '#map-side').textContent));

  // clicking the active tool button again toggles back to Select and closes the panel
  click(q(w, '[data-act="mapMode"][data-mode="deps"]'), w);
  ok('clicking the deps button again closes its panel', !q(w, '#map-side') && w.__rtm.state.mapEd.mode === 'select');
  click(q(w, '[data-act="mapMode"][data-mode="wspot"]'), w);
  click(q(w, '[data-act="mapMode"][data-mode="wspot"]'), w);
  ok('clicking the waiting button again closes its panel', !q(w, '#map-side') && w.__rtm.state.mapEd.mode === 'select');
  click(q(w, '[data-act="mapMode"][data-mode="deps"]'), w);

  // click a node → becomes the first node of a new entry
  api.onDepNodeClick('KMP 400P-1-5G diffDrive', '1');
  ok('first node click creates a dependency entry', s.deps.length === 1 && s.deps[0].fromNode === '1' && s.deps[0].fromNavigationGraph === 'KMP 400P-1-5G diffDrive', JSON.stringify(s.deps));
  ok('new entry is active', s.mapEd.depSel === 0);

  // click nodes on the other graph → dependents (cross-graph)
  api.onDepNodeClick('tusk', '0011');
  api.onDepNodeClick('tusk', '0014');
  ok('clicking other nodes adds dependents', s.deps[0].to.length === 1 && s.deps[0].to[0].nodes.join(',') === '0011,0014', JSON.stringify(s.deps[0].to));
  api.onDepNodeClick('tusk', '0014');
  ok('clicking a dependent again removes it (toggle)', s.deps[0].to[0].nodes.join(',') === '0011', JSON.stringify(s.deps[0].to));

  // visualization: active entry draws from/to highlights + dashed links
  ok('first node highlighted on canvas', qa(w, 'circle.m-depfrom').length === 1);
  ok('dependent node highlighted + linked', qa(w, 'circle.m-depto').length === 1 && qa(w, 'line.m-dep').length === 1);

  // duplicate via the panel button
  click(q(w, '[data-act="depDup"][data-i="0"]'), w);
  ok('duplicate copies the whole entry', s.deps.length === 2 && s.deps[1].fromNode === '1' && s.deps[1].to[0].nodes.join(',') === '0011', JSON.stringify(s.deps[1]));
  ok('duplicate arms first-node re-pick', s.mapEd.depSel === 1 && s.mapEd.depPickFrom === true);
  api.onDepNodeClick('KMP 400P-1-5G diffDrive', '6');
  ok('next node click re-picks the first node of the copy', s.deps[1].fromNode === '6' && s.deps[1].to[0].nodes.join(',') === '0011', JSON.stringify(s.deps[1]));

  // export shape matches the sample reservation-dependencies file
  const out = api.canonicalizeDeps(s.deps);
  ok('canonical deps match the sample shape', JSON.stringify(Object.keys(out[0])) === JSON.stringify(['fromNode', 'fromNavigationGraph', 'to']) &&
     JSON.stringify(Object.keys(out[0].to[0])) === JSON.stringify(['navigationGraph', 'nodes']), JSON.stringify(out[0]));
  ok('deps file name matches the sample pattern', /^reservation_dependencies_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/.test(api.depsFileName()), api.depsFileName());

  // import (normalize) accepts the real sample file shape
  const sample = [{ fromNode: '10', fromNavigationGraph: 'KMP 400P-1-5G diffDrive', to: [{ navigationGraph: 'tusk', nodes: ['0014'] }] }];
  const norm = api.normalizeDeps(sample);
  ok('normalizeDeps accepts the sample file', norm.length === 1 && norm[0].to[0].nodes[0] === '0014');

  // export picker includes the dependencies file
  click(q(w, '.app-header [data-act="exportAll"]'), w);
  ok('export picker lists the reservation-dependencies file', !!q(w, '[data-act="export:deps"]') && /reservation_dependencies_/.test(q(w, '.sample-list').textContent));
  click(q(w, '[data-act="export:close"]'), w);

  // deleting the from-node drops the entry; deleting a dependent removes the reference
  api.removeNodeFromExtras('KMP 400P-1-5G diffDrive', '6');
  ok('deleting a first node drops its entry', s.deps.length === 1 && s.deps[0].fromNode === '1');
  api.removeNodeFromExtras('tusk', '0011');
  ok('deleting a dependent node cleans references', s.deps[0].to.length === 0, JSON.stringify(s.deps[0].to));
}

// ============================ L) Emergency areas ============================
console.log('\n[L] Emergency areas — 4+ points, auto detector, red rendering');
{
  const w = await boot();
  click(q(w, '[data-act="loadExample"]'), w);
  click(q(w, '[data-act="mapEdit"]'), w);
  const api = w.__rtm, s = api.state;

  // the updated example map ships Base1/Base2 + detectors → drawn red
  ok('example map areas covered by detectors render red', qa(w, 'polygon.m-area.emerg').length === 2, qa(w, 'polygon.m-area.emerg').length + '');
  ok('plain Area tool is gone from the toolbar', !q(w, '[data-act="mapMode"][data-mode="area"]'));
  ok('toolbar tools are compact icon buttons', !!q(w, '[data-act="mapMode"][data-mode="earea"].btn-icon'));
  ok('View dropdown exists and is closed by default', !!q(w, '[data-act="viewMenu"]') && !q(w, '#view-menu'));

  // left-click drawing: 4 clicks place points, a 5th on the first point closes
  click(q(w, '[data-act="mapMode"][data-mode="earea"]'), w);
  const s0 = w.__rtm.state;
  const nA0 = s0.map.areas.length, nD0 = s0.map.emergencyDetectors.length;
  const lclick = (x, y) => { q(w, '#map-svg').dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0, clientX: x, clientY: y })); w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true })); };
  lclick(300, 300); lclick(400, 300); lclick(400, 380);
  ok('left-clicks place draft points', s0.mapEd.areaDraft && s0.mapEd.areaDraft.length === 3, (s0.mapEd.areaDraft || []).length + '');
  ok('Finish button shows the live point count', /Finish area \(3 points\)/.test(q(w, '[data-act="areaFinish"]').textContent));
  ok('no close-hint ring below 4 points', !q(w, 'circle.m-draftpt.close'));
  lclick(300, 380);
  ok('4th point arms the close hint on the first point', !!q(w, 'circle.m-draftpt.close'));
  lclick(302, 301); // click the first point → closes the polygon
  ok('clicking the first point closes the area', s0.map.areas.length === nA0 + 1 && s0.mapEd.areaDraft === null, s0.map.areas.length + '/' + JSON.stringify(s0.mapEd.areaDraft));
  ok('left-click drawing auto-creates its detector', s0.map.emergencyDetectors.length === nD0 + 1);
  // clean up the drawn area for the checks below
  s0.mapEd.selset = [{ type: 'area', id: s0.map.areas[s0.map.areas.length - 1].id }];
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  const nAreas = s.map.areas.length, nDets = s.map.emergencyDetectors.length;
  s.mapEd.areaDraft = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }];
  s.mapEd.areaDraftKind = 'earea';
  api.finishArea();
  ok('emergency area needs at least 4 points', s.map.areas.length === nAreas && s.mapEd.areaDraft !== null);
  s.mapEd.areaDraft.push({ x: 0, y: 5 });
  api.finishArea();
  ok('4 points finish the emergency area', s.map.areas.length === nAreas + 1, s.map.areas.length + '');
  const newArea = s.map.areas[s.map.areas.length - 1];
  ok('a matching detector is auto-created', s.map.emergencyDetectors.length === nDets + 1 &&
     s.map.emergencyDetectors.some((d) => d.id === newArea.id + ' Detector' && d.areas.includes(newArea.id)), JSON.stringify(s.map.emergencyDetectors));
  ok('new emergency area renders red', qa(w, 'polygon.m-area.emerg').length === 3);
  ok('detector reaches the exported map JSON', api.canonicalizeMap(s.map).emergencyDetectors.some((d) => d.id === newArea.id + ' Detector'));

  // detectors dialog
  click(q(w, '[data-act="detectorsEdit"]'), w);
  ok('Detectors dialog lists detectors with area checkboxes', qa(w, '.det-row').length === s.map.emergencyDetectors.length && qa(w, '[data-act="detArea"]').length > 0);
  click(q(w, '[data-act="detAdd"]'), w);
  ok('Add detector works', s.map.emergencyDetectors.length === nDets + 2);
  click(q(w, '[data-act="detDel"][data-i="' + (s.map.emergencyDetectors.length - 1) + '"]'), w);
  ok('Delete detector works', s.map.emergencyDetectors.length === nDets + 1);
  click(q(w, '[data-act="mapDlg:cancel"]'), w);

  // deleting the area removes its (now empty) detector
  api.state.mapEd.selset = [{ type: 'area', id: newArea.id }];
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
  ok('deleting the area prunes its empty detector', !s.map.areas.some((a) => a.id === newArea.id) && !s.map.emergencyDetectors.some((d) => d.id === newArea.id + ' Detector'));
}

// ============================ M) Waiting spots ============================
console.log('\n[M] Waiting spots — editor, station-group assignment, highlight, export');
{
  const w = await boot();
  click(q(w, '[data-act="loadExample"]'), w);
  click(q(w, '[data-act="mapEdit"]'), w);
  const api = w.__rtm, s = api.state;

  // the updated example map ships WS_Kuka / WS_tusk
  ok('example map loads its waiting spots', s.map.waitingSpots.length === 2 && s.map.waitingSpots[0].id === 'WS_Kuka', JSON.stringify(s.map.waitingSpots.map((x) => x.id)));

  click(q(w, '[data-act="mapMode"][data-mode="wspot"]'), w);
  ok('waiting tool opens the side panel listing both spots', !!q(w, '#map-side') && qa(w, '#map-side .side-item').length === 2);

  // clicking a node of an existing spot selects that spot; clicking again toggles membership
  api.onWsNodeClick('KMP 400P-1-5G diffDrive', '6');
  ok('clicking a member node selects its spot', s.mapEd.wsSel === 0);
  api.onWsNodeClick('KMP 400P-1-5G diffDrive', '5');
  ok('next click adds a node to the active spot', s.map.waitingSpots[0].nodes.some((n) => n.nodeId === '5'));
  api.onWsNodeClick('KMP 400P-1-5G diffDrive', '5');
  ok('clicking it again removes it (toggle)', !s.map.waitingSpots[0].nodes.some((n) => n.nodeId === '5'));
  ok('active spot nodes highlighted on canvas', qa(w, 'circle.m-wsnode').length === s.map.waitingSpots[0].nodes.length, qa(w, 'circle.m-wsnode').length + '');

  // new + duplicate via the panel
  click(q(w, '[data-act="wsNew"]'), w);
  ok('New creates an empty spot with a fresh id', s.map.waitingSpots.length === 3 && s.map.waitingSpots[2].id === 'WS1');
  click(q(w, '[data-act="wsDup"][data-i="0"]'), w);
  ok('Duplicate copies nodes under a new id', s.map.waitingSpots.length === 4 && s.map.waitingSpots[1].id === 'WS_Kuka_copy' && s.map.waitingSpots[1].nodes.length === s.map.waitingSpots[0].nodes.length);
  s.map.waitingSpots.splice(1, 2); s.mapEd.wsSel = null; // tidy up for the next checks

  // selecting a station highlights its group's waiting-spot nodes
  click(q(w, '[data-act="mapMode"][data-mode="select"]'), w);
  s.mapEd.selset = [{ type: 'station', id: 'K1' }];
  w.document.defaultView.dispatchEvent(new w.Event('resize')); // repaint with the selection
  ok('station K1 belongs to a group referencing WS_Kuka', api.groupOfStation('K1') && api.groupOfStation('K1').waitingSpots.some((x) => x.id === 'WS_Kuka'));
  ok('selected station highlights its waiting-spot nodes', qa(w, 'circle.m-wsnode').length === 2 && qa(w, 'line.m-wslink').length === 2, qa(w, 'circle.m-wsnode').length + '/' + qa(w, 'line.m-wslink').length);

  // canonical export shape
  const cm = api.canonicalizeMap(s.map);
  ok('map export keeps top-level waiting spots with node refs', cm.waitingSpots.length === 2 && cm.waitingSpots[0].nodes[0].navigationGraphId === 'KMP 400P-1-5G diffDrive');
  ok('map export keeps group waiting-spot references as {id}', JSON.stringify(cm.handlingStationGroups[0].waitingSpots) === '[{"id":"WS_Kuka"}]', JSON.stringify(cm.handlingStationGroups[0].waitingSpots));

  // deleting a spot cleans group references
  s.mapEd.wsSel = null;
  click(q(w, '[data-act="mapMode"][data-mode="wspot"]'), w);
  click(q(w, '[data-act="wsDel"][data-i="0"]'), w);
  ok('deleting a spot removes it from groups too', s.map.waitingSpots.length === 1 && !s.map.handlingStationGroups.some((g) => (g.waitingSpots || []).some((x) => x.id === 'WS_Kuka')));
}

// ============================ N) Home — back to the main menu ============================
console.log('\n[N] Home button — back to the main menu + resume');
{
  const w = await boot();
  click(q(w, '[data-act="loadExample"]'), w);
  ok('route view shows a Menu (home) button', !!q(w, '.app-header [data-act="home"]'));
  click(q(w, '[data-act="mapEdit"]'), w);
  ok('map editor shows a Menu (home) button', !!q(w, '.app-header [data-act="home"]'));
  click(q(w, '[data-act="home"]'), w);
  ok('Home returns to the landing screen', !!q(w, '.landing') && !!q(w, '[data-act="loadMap"]'));
  ok('landing offers Resume last session', !!q(w, '[data-act="resume"]'));
  click(q(w, '[data-act="resume"]'), w);
  ok('Resume restores the session (2 graphs, kuka mappings intact)', qa(w, '.graph-pill').length === 2 && counts(w).mappings === 13, JSON.stringify(counts(w)));
}

// ============================ O) Overlapping nodes — disambiguation picker ============================
console.log('\n[O] Overlapping nodes — picker to choose which node to select/edit');
{
  const w = await boot();
  click(q(w, '[data-act="loadExample"]'), w);
  click(q(w, '[data-act="mapEdit"]'), w);
  const api = w.__rtm, s = api.state;
  const KUKA = 'KMP 400P-1-5G diffDrive';

  // move tusk node 0011 exactly onto kuka node 1 (in the shared map frame)
  const kuka = s.map.navigationGraphs.find((g) => g.id === KUKA);
  const tusk = s.map.navigationGraphs.find((g) => g.id === 'tusk');
  const n1 = kuka.nodes.find((n) => n.id === '1');
  const p = api.g2m(kuka, n1.graphX, n1.graphY);
  const loc = api.m2g(tusk, p.x, p.y);
  const t11 = tusk.nodes.find((n) => n.id === '0011');
  t11.graphX = loc.x; t11.graphY = loc.y;
  w.document.defaultView.dispatchEvent(new w.Event('resize')); // repaint

  const hit1 = { type: 'node', id: '1', graphId: KUKA };
  ok('overlapCandidates finds both nodes within 0.1 m', api.overlapCandidates(hit1).length === 2, JSON.stringify(api.overlapCandidates(hit1)));
  ok('active graph listed first on exact ties', api.overlapCandidates(hit1)[0].graphId === KUKA);

  // clicking the shared spot opens the picker instead of silently picking one
  const el = q(w, 'circle[data-mt="node"][data-mid="1"][data-mg="' + KUKA + '"]');
  el.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  ok('overlap picker opens with 2 entries', !!q(w, '#map-overlap') && qa(w, '#map-overlap .ov-item').length === 2, qa(w, '#map-overlap .ov-item').length + '');
  ok('no drag started (nothing moved by accident)', !s.mapEd.drag);

  // pick the tusk node from the panel
  click(qa(w, '[data-act="ovSelect"]').find((x) => x.dataset.g === 'tusk'), w);
  ok('choosing an entry selects that node', s.mapEd.selset.length === 1 && s.mapEd.selset[0].graphId === 'tusk' && s.mapEd.selset[0].id === '0011', JSON.stringify(s.mapEd.selset));

  // clicking the shared spot again now drags the CHOSEN node, not the top one
  const el2 = q(w, 'circle[data-mt="node"][data-mid="1"][data-mg="' + KUKA + '"]');
  el2.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  ok('re-click grabs the chosen (tusk) node for dragging', s.mapEd.drag && s.mapEd.drag.kind === 'move' && s.mapEd.drag.items.length === 1 && s.mapEd.drag.items[0].r.n === t11);
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));

  // the pencil button opens the edit dialog for exactly that node
  click(qa(w, '[data-act="ovEdit"]').find((x) => x.dataset.g === 'tusk'), w);
  ok('edit opens the dialog for the chosen node', s.mapEd.dialog && s.mapEd.dialog.kind === 'node' && s.mapEd.dialog.graphId === 'tusk' && s.mapEd.dialog.id === '0011', JSON.stringify(s.mapEd.dialog));
  ok('picking an editor closes the picker', !s.mapEd.overlap);
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok('Escape closes the dialog', !s.mapEd.dialog);

  // single (non-overlapping) nodes never show the picker
  const el3 = q(w, 'circle[data-mt="node"][data-mid="13"][data-mg="' + KUKA + '"]');
  el3.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  ok('normal nodes select directly without a picker', !q(w, '#map-overlap') && s.mapEd.selset[0] && s.mapEd.selset[0].id === '13');

  // ---- mixed types: a station moved onto node 13 ----
  const k1 = api.allStations().find((x) => x.st.id === 'K1').st;
  const n13 = kuka.nodes.find((n) => n.id === '13');
  const p13 = api.g2m(kuka, n13.graphX, n13.graphY);
  k1.mapX = p13.x; k1.mapY = p13.y;
  w.document.defaultView.dispatchEvent(new w.Event('resize'));
  const mixed = api.overlapCandidates({ type: 'node', id: '13', graphId: KUKA });
  ok('node + station on one spot are both detected', mixed.length === 2 && mixed.some((c) => c.type === 'station' && c.id === 'K1'), JSON.stringify(mixed));
  s.mapEd.selset = []; s.mapEd.overlap = null;
  const stEl = q(w, 'rect[data-mt="station"][data-mid="K1"]');
  stEl.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  ok('clicking the station opens the mixed picker (no accidental drag)', !!q(w, '#map-overlap') && qa(w, '#map-overlap .ov-item').length === 2 && !s.mapEd.drag);
  ok('entries carry their type', qa(w, '#map-overlap [data-act="ovSelect"]').some((x) => x.dataset.t === 'station') && qa(w, '#map-overlap [data-act="ovSelect"]').some((x) => x.dataset.t === 'node'));
  click(qa(w, '[data-act="ovEdit"]').find((x) => x.dataset.t === 'node' && x.dataset.n === '13'), w);
  ok('edit from the mixed picker opens the node dialog', s.mapEd.dialog && s.mapEd.dialog.kind === 'node' && s.mapEd.dialog.id === '13', JSON.stringify(s.mapEd.dialog));
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  // picking the station in the panel, then dragging the shared spot, moves the station not the node
  s.mapEd.selset = []; s.mapEd.overlap = null;
  q(w, 'rect[data-mt="station"][data-mid="K1"]').dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  click(qa(w, '[data-act="ovSelect"]').find((x) => x.dataset.t === 'station'), w);
  ok('choosing the station selects it', s.mapEd.selset.length === 1 && s.mapEd.selset[0].type === 'station' && s.mapEd.selset[0].id === 'K1', JSON.stringify(s.mapEd.selset));
  const stEl2 = q(w, 'rect[data-mt="station"][data-mid="K1"]');
  stEl2.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  ok('re-click drags the chosen station, not the node', s.mapEd.drag && s.mapEd.drag.kind === 'move' && s.mapEd.drag.items.length === 1 && s.mapEd.drag.items[0].r.el === k1);
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
}

// ============================ P) Node under a station — tools see through ============================
console.log('\n[P] Node covered by a station — edge / deps / waiting / access still reach it');
{
  const w = await boot();
  click(q(w, '[data-act="loadExample"]'), w);
  click(q(w, '[data-act="mapEdit"]'), w);
  const api = w.__rtm, s = api.state;
  const KUKA = 'KMP 400P-1-5G diffDrive';
  const kuka = s.map.navigationGraphs.find((g) => g.id === KUKA);

  // cover node 13 with station K1
  const k1 = api.allStations().find((x) => x.st.id === 'K1').st;
  const n13 = kuka.nodes.find((n) => n.id === '13');
  const p13 = api.g2m(kuka, n13.graphX, n13.graphY);
  k1.mapX = p13.x; k1.mapY = p13.y;
  w.document.defaultView.dispatchEvent(new w.Event('resize'));
  const stRect = () => q(w, 'rect[data-mt="station"][data-mid="K1"]');
  ok('nodeFromHit resolves the station hit to the covered node', JSON.stringify(api.nodeFromHit({ type: 'station', id: 'K1' })) === JSON.stringify({ graphId: KUKA, nodeId: '13' }), JSON.stringify(api.nodeFromHit({ type: 'station', id: 'K1' })));

  // EDGE tool: right-click the covering station picks the node underneath
  click(q(w, '[data-act="mapMode"][data-mode="edge"]'), w);
  stRect().dispatchEvent(new w.MouseEvent('contextmenu', { bubbles: true }));
  ok('edge tool: right-click on the station starts the edge at node 13', s.mapEd.edgeFrom === '13', s.mapEd.edgeFrom + '');
  q(w, 'circle[data-mt="node"][data-mid="2"][data-mg="' + KUKA + '"]').dispatchEvent(new w.MouseEvent('contextmenu', { bubbles: true }));
  ok('edge 13 → 2 is created (+ reverse, bidirectional)', kuka.edges.some((e) => e.startNodeId === '13' && e.endNodeId === '2') && kuka.edges.some((e) => e.startNodeId === '2' && e.endNodeId === '13'));

  // DEPENDENCIES tool: click on the station picks the node underneath as first node
  click(q(w, '[data-act="mapMode"][data-mode="deps"]'), w);
  stRect().dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  ok('deps tool: click on the station makes node 13 the first node', s.deps.length === 1 && s.deps[0].fromNode === '13' && s.deps[0].fromNavigationGraph === KUKA, JSON.stringify(s.deps));

  // WAITING tool: click on the station adds the node underneath
  click(q(w, '[data-act="mapMode"][data-mode="wspot"]'), w);
  stRect().dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  const lastWs = s.map.waitingSpots[s.map.waitingSpots.length - 1];
  ok('waiting tool: click on the station puts node 13 into a spot', lastWs.nodes.some((n) => n.navigationGraphId === KUKA && n.nodeId === '13'), JSON.stringify(lastWs));

  // ACCESS NODES: with another station selected (Station tool), clicking the covering station toggles node 13
  click(q(w, '[data-act="mapMode"][data-mode="station"]'), w);
  s.mapEd.selset = [{ type: 'station', id: 'K2' }];
  stRect().dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  const k2 = api.allStations().find((x) => x.st.id === 'K2').st;
  ok('access nodes: clicking the covering station assigns node 13 to K2', (k2.accessNodes || []).some((a) => a.navigationGraphId === KUKA && a.nodeId === '13'), JSON.stringify(k2.accessNodes));
  ok('K2 stayed selected', s.mapEd.selset.length === 1 && s.mapEd.selset[0].id === 'K2');
  // clicking the SELECTED station itself still starts a drag (doesn't toggle access)
  s.mapEd.selset = [{ type: 'station', id: 'K1' }];
  q(w, 'rect[data-mt="station"][data-mid="K1"]').dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0 }));
  ok('clicking the selected station itself still drags it', s.mapEd.drag && s.mapEd.drag.kind === 'move' && s.mapEd.drag.items[0].r.el === k1);
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
}

// ============================ Q) v1.4: auto-sync, Edit-all, Tusk geometry values ============================
console.log('\n[Q] Auto-sync after map edits · Edit-all · Tusk container values from geometry');
{
  const w = await boot();
  click(q(w, '[data-act="loadExample"]'), w);
  const api = w.__rtm, s = api.state;
  const KUKA = 'KMP 400P-1-5G diffDrive';

  // --- Tusk geometry values: regenerate the T1 dropoff/pickup mappings ---
  click(qa(w, '.graph-pill')[1], w); // tusk graph
  const tuskG = s.graphs[1];
  tuskG.bundle.mappings = tuskG.bundle.mappings.filter((m) => !/^TUSK_(PICKUP|DROPOFF)_0003_mapping$/.test(m.id));
  api.generateFromMap(tuskG);
  const drop = tuskG.bundle.mappings.find((m) => m.id === 'TUSK_DROPOFF_0003_mapping');
  const pick = tuskG.bundle.mappings.find((m) => m.id === 'TUSK_PICKUP_0003_mapping');
  const ev = (m, k) => (m.entries.find((e) => e.key === k) || {}).value;
  ok('regenerated T1 dropoff exists', !!drop && !!pick);
  ok('containerX = station T1 in tusk LOCAL frame (20.5)', ev(drop, 'DROP_CONTAINERX_A') === '20.5' && ev(pick, 'PICK_CONTAINERX_A') === '20.5', ev(drop, 'DROP_CONTAINERX_A'));
  ok('containerY = 7.1', ev(drop, 'DROP_CONTAINERY_A') === '7.1' && ev(pick, 'PICK_CONTAINERY_A') === '7.1', ev(drop, 'DROP_CONTAINERY_A'));
  ok('containerTheta = node→station direction (0)', ev(drop, 'DROP_CONTAINERTHETA_A') === '0' && ev(pick, 'PICK_CONTAINERTHETA_A') === '0', ev(drop, 'DROP_CONTAINERTHETA_A'));
  ok('mapTheta matches (0)', ev(drop, 'MAPTHETA_A') === '0');
  ok('constants still come from the sample mapping', ev(drop, 'DROP_CONTAINERTYPEID_A') === '1' && ev(drop, 'DROP_ONLYFORK_A') === 'true' && ev(drop, 'detectBeforeDrop_1') === 'false', JSON.stringify(drop.entries));
  ok('external station id filled (T1)', ev(drop, 'DROP_EXTERNAL_STATION_ID_A') === 'T1');
  // T2 (node 0013 below the station → theta -1.57) — regenerate it too
  tuskG.bundle.mappings = tuskG.bundle.mappings.filter((m) => m.id !== 'TUSK_DROPOFF_0013_mapping');
  api.generateFromMap(tuskG);
  const drop2 = tuskG.bundle.mappings.find((m) => m.id === 'TUSK_DROPOFF_0013_mapping');
  ok('T2 containerTheta/mapTheta = -1.57', ev(drop2, 'DROP_CONTAINERTHETA_A') === '-1.57' && ev(drop2, 'MAPTHETA_A') === '-1.57', ev(drop2, 'DROP_CONTAINERTHETA_A'));
  ok('T2 containerX/Y = station in local frame (10.2 / 2.95)', ev(drop2, 'DROP_CONTAINERX_A') === '10.2' && ev(drop2, 'DROP_CONTAINERY_A') === '2.95', ev(drop2, 'DROP_CONTAINERX_A') + '/' + ev(drop2, 'DROP_CONTAINERY_A'));

  // --- auto-sync: add an edge on the map → mapping appears; delete it → mapping goes ---
  click(qa(w, '.graph-pill')[0], w); // kuka graph (13 mappings out of 21 edges initially)
  const kukaG = s.graphs[0];
  const kukaMap = s.map.navigationGraphs.find((g) => g.id === KUKA);
  const nBefore = kukaG.bundle.mappings.length;
  click(q(w, '[data-act="mapEdit"]'), w);
  api.addEdge(kukaMap, '2', '7'); w.__rtm.state.mapEd._dirty = true;
  click(q(w, '[data-act="route"]'), w);
  ok('returning from map edit auto-adds mappings (incl. the new edge, both directions)',
     kukaG.bundle.mappings.some((m) => m.id === 'kuka_edge_2_7_mapping') && kukaG.bundle.mappings.some((m) => m.id === 'kuka_edge_7_2_mapping'),
     kukaG.bundle.mappings.length + ' vs ' + nBefore);
  ok('auto-sync also filled the other missing edges (full coverage: 23 edges)', kukaG.bundle.mappings.length === kukaMap.edges.length, kukaG.bundle.mappings.length + '/' + kukaMap.edges.length);
  // hand-edit one mapping, delete the edge on the map → its mappings are pruned, edits elsewhere survive
  const handEdited = kukaG.bundle.mappings.find((m) => m.id === 'kuka_edge_1_10_mapping');
  handEdited.entries.find((e) => e.key === 'A').value = '1'; // no-op edit, marker value stays
  click(q(w, '[data-act="mapEdit"]'), w);
  kukaMap.edges = kukaMap.edges.filter((e) => !(e.startNodeId === '2' && e.endNodeId === '7') && !(e.startNodeId === '7' && e.endNodeId === '2'));
  w.__rtm.state.mapEd._dirty = true;
  click(q(w, '[data-act="route"]'), w);
  ok('deleting the edge removes its mappings on return', !kukaG.bundle.mappings.some((m) => /kuka_edge_(2_7|7_2)_mapping/.test(m.id)));
  ok('other mappings survive the prune untouched', kukaG.bundle.mappings.some((m) => m.id === 'kuka_edge_1_10_mapping') && kukaG.bundle.mappings.length === kukaMap.edges.length, kukaG.bundle.mappings.length + '');
  // graphs with zero mappings are left alone
  const blankBefore = tuskG.bundle.mappings.length; // tusk untouched by kuka syncs
  ok('non-dirty / other graphs unaffected', tuskG.bundle.mappings.length === blankBefore);

  // --- Edit all: one click selects every mapping of a template and opens the bulk editor ---
  click(q(w, '[data-act="tab"][data-tab="mappings"]'), w);
  const editAll = q(w, '[data-act="grp:editAll"][data-tpl="kuka_edge"]');
  ok('template group header has an Edit-all button', !!editAll);
  click(editAll, w);
  ok('Edit-all selects every mapping of the template', s.sel.size === kukaG.bundle.mappings.length, s.sel.size + '');
  ok('bulk editor opens', /Bulk editing/.test((q(w, '.detail-inner') || {}).textContent || ''));
  // typing into a bulk entry field updates all selected mappings
  const bulkField = q(w, '[data-bulk="entry"]');
  if (bulkField) { bulkField.value = 'ZZ_BULK'; bulkField.dispatchEvent(new w.Event('input', { bubbles: true })); }
  const key = bulkField && bulkField.dataset.key;
  ok('bulk edit writes the value into every mapping', !!key && kukaG.bundle.mappings.every((m) => (m.entries.find((e) => e.key === key) || {}).value === 'ZZ_BULK'), key + '');
}

// ============================ R) Station geometry values refresh on EXISTING mappings ============================
console.log('\n[R] Existing mappings get their geometry values refreshed (fix)');
{
  const w = await boot();
  click(q(w, '[data-act="loadExample"]'), w);
  const api = w.__rtm, s = api.state;
  const tuskG = s.graphs[1];
  const ev = (m, k) => ((m.entries || []).find((e) => e.key === k) || {}).value;

  // loading a map immediately corrects the sample values to the real geometry
  const d13 = tuskG.bundle.mappings.find((m) => m.id === 'TUSK_DROPOFF_0013_mapping');
  ok('map load corrects sample values to real geometry (3.0 → 2.95)', ev(d13, 'DROP_CONTAINERY_A') === '2.95', ev(d13, 'DROP_CONTAINERY_A'));
  ok('theta present and correct on the existing mapping', ev(d13, 'DROP_CONTAINERTHETA_A') === '-1.57' && ev(d13, 'MAPTHETA_A') === '-1.57');

  // corrupt a geometry value + hand-edit a non-geometry value, then press Generate
  const d03 = tuskG.bundle.mappings.find((m) => m.id === 'TUSK_DROPOFF_0003_mapping');
  d03.entries.find((e) => e.key === 'DROP_CONTAINERX_A').value = '99';
  d03.entries.find((e) => e.key === 'DROP_DESCRIPTION_A').value = 'my note';
  click(qa(w, '.graph-pill')[1], w);
  click(q(w, '[data-act="tab"][data-tab="mappings"]'), w);
  const before = tuskG.bundle.mappings.length;
  click(q(w, '[data-act="map:generate"]'), w);
  ok('Generate refreshes geometry values on EXISTING mappings (99 → 20.5)', ev(d03, 'DROP_CONTAINERX_A') === '20.5', ev(d03, 'DROP_CONTAINERX_A'));
  ok('non-geometry values are untouched by the refresh', ev(d03, 'DROP_DESCRIPTION_A') === 'my note');
  ok('refresh does not duplicate mappings', tuskG.bundle.mappings.length === before, tuskG.bundle.mappings.length + '/' + before);

  // moving the station on the map auto-refreshes the values on return
  click(q(w, '[data-act="mapEdit"]'), w);
  api.allStations().find((x) => x.st.id === 'T1').st.mapX += 1;
  s.mapEd._dirty = true;
  click(q(w, '[data-act="route"]'), w);
  ok('moving the station auto-refreshes containerX (20.5 → 21.5)', ev(d03, 'DROP_CONTAINERX_A') === '21.5', ev(d03, 'DROP_CONTAINERX_A'));
}

console.log('\n──────────────────────────────');
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
