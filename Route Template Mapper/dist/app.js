/* Route Template Mapper — renderer logic (vanilla JS, no build step).
 * Reads a map JSON, matches its navigation graphs against known graphs, lets you
 * edit per-graph route templates + mappings, and exports one file per graph.
 * Works in Electron (native dialogs via window.electronAPI) and a plain browser. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- constants
  const SESSION_KEY = 'routeTemplateMapper.session.v1';
  const THEME_KEY = 'routeTemplateMapper.theme';
  const USER_SAMPLES_KEY = 'routeTemplateMapper.userSamples.v1';
  const DATA_TYPES = ['string', 'number', 'boolean'];
  const BLOCKING_TYPES = ['HARD', 'SOFT', 'NONE'];

  // ------------------------------------------------------------------- icons
  const I = {
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3z"/><path d="M9 4v13"/><path d="M15 7v13"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    node: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21s-7-7.6-7-12a7 7 0 0 1 14 0c0 4.4-7 12-7 12z"/></svg>',
    edge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.5 8.5l7 7"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5M3 17l9 5 9-5"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
    wand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2M15 10V8M11 6H9M21 6h-2M18 9l-1.5-1.5M18 3l-1.5 1.5M4 20l9-9"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>',
    translate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    cursor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.2 17 2.4-7.4L20 10.2z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="20" rx="3"/><path d="M12 7h.01M12 12h.01M12 17h.01"/></svg>',
    poly: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 7-3.5 11h-11L3 9z"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="2"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.8 12 3l9 7.8"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 10a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>'
  };

  // ------------------------------------------------------------------- state
  const state = {
    map: null,            // parsed map JSON
    mapName: '',          // file name (display only)
    graphs: [],           // [{ graphId, agvTypes, matched, baseChosen, nodeIds, edgeIds, bundle }]
    gi: 0,                // active graph index
    editingSample: null,  // { name, bundle, builtIn } when editing a sample instead of a graph

    bundle: { templates: [], mappings: [] }, // ACTIVE bundle pointer (set by syncActiveBundle)

    tab: 'templates',
    ti: 0, mi: 0,
    tSearch: '', mSearch: '',
    dupN: 1,              // duplicate count for the active mapping
    sel: new Set(),

    preview: false,
    saveDialog: false,    // sample-save prompt
    samplesModal: false,  // "check & edit sample route templates"
    exportModal: false,   // pick-which-graph export dialog
    exportSel: new Set(), // graph indices selected for export
    exportMap: true,      // include the map file in the export
    exportDeps: true,     // include the reservation-dependencies file in the export

    deps: [],             // reservation dependencies: [{ fromNode, fromNavigationGraph, to: [{ navigationGraph, nodes[] }] }]

    view: 'landing',      // 'landing' | 'route' | 'map'
    mapEd: {              // map-editor sub-state
      gi: 0,              // active navigation-graph index
      mode: 'select',    // select | node | edge | station | charger | light | area
      selset: [],        // [{ type, id, graphId? }] current selection (multi)
      grid: true,        // show grid + rulers
      coords: false,     // show local + map coords on active-graph nodes
      translatePanel: false, // live translation panel open
      marquee: null,     // { minX,minY,maxX,maxY } rubber-band while dragging
      _space: false,     // space held → pan with left drag
      view: { x: 0, y: 0, zoom: 30 }, // pan (px) + zoom (px per metre)
      decimals: 3,
      edgeBidir: true,
      edgeFrom: null,    // first node id while drawing an edge
      areaDraft: null,   // points being drawn for a new area
      areaDraftKind: 'area', // 'area' | 'earea' — which tool started the draft
      depSel: null,      // active reservation-dependency index (deps tool)
      depPickFrom: false, // next node click sets the active dependency's first node
      wsSel: null,       // active waiting-spot index (waiting tool)
      viewMenu: false,   // View dropdown (grid/coords/decimals/background) open
      overlap: null,     // { items: [{graphId,nodeId,dist}] } — picker for nodes sharing one spot
      ungroupedStations: [],
      bg: null,          // { path, name, dataUrl, metersPerPixel, offsetX, offsetY, imgW, imgH, opacity }
      drag: null,        // transient drag state
      dialog: null,      // { kind, ... } current map dialog
      _bound: false      // canvas listeners attached
    }
  };
  let pendingFocus = null;

  // --------------------------------------------------------------- utilities
  const $ = (s, r) => (r || document).querySelector(s);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const sortedKey = (arr) => (arr || []).slice().sort().join('|');
  const safeName = (s) => String(s == null ? '' : s).replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
  const today = () => new Date().toISOString().slice(0, 10);

  function setByPath(root, path, value) {
    const p = path.split('.');
    let o = root;
    for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
    o[p[p.length - 1]] = value;
  }

  function normalize(b) {
    b = b && typeof b === 'object' ? b : {};
    b.templates = Array.isArray(b.templates) ? b.templates : [];
    b.mappings = Array.isArray(b.mappings) ? b.mappings : [];
    b.templates.forEach((t) => {
      t.id = t.id || 'TEMPLATE';
      t.nodes = Array.isArray(t.nodes) ? t.nodes : [];
      t.edges = Array.isArray(t.edges) ? t.edges : [];
      t.steps = Array.isArray(t.steps) ? t.steps : [];
      t.steps.forEach((s) => {
        s.reference = s.reference || '';
        s.type = s.type || 'node';
        s.actions = Array.isArray(s.actions) ? s.actions : [];
        s.attributes = Array.isArray(s.attributes) ? s.attributes : [];
        s.actions.forEach((a) => {
          a.actionName = a.actionName || '';
          a.blockingType = a.blockingType || 'HARD';
          a.actionParameters = Array.isArray(a.actionParameters) ? a.actionParameters : [];
          if (a.targetHandlingStationCondition !== null && typeof a.targetHandlingStationCondition !== 'object') {
            a.targetHandlingStationCondition = null;
          }
        });
      });
    });
    b.mappings.forEach((m) => {
      m.id = m.id || 'mapping';
      m.template = m.template || '';
      m.actionMapping = !!m.actionMapping;
      m.entries = Array.isArray(m.entries) ? m.entries : [];
      m.navigationGraphId = m.navigationGraphId || '';
      if (m.conditions && typeof m.conditions === 'object') {
        const c = m.conditions;
        ['milestoneTypes', 'targetActions', 'agvTypes', 'usages'].forEach((k) => { c[k] = Array.isArray(c[k]) ? c[k] : []; });
      } else if (m.conditions !== null) {
        m.conditions = null;
      }
    });
    return b;
  }

  // Node references = the references of steps of type "node" (works even when a
  // template declares no top-level nodes[] array, as the Tusk templates don't).
  function templateNodeRefs(t) {
    const out = [];
    (t.steps || []).forEach((s) => { if (s.type === 'node' && s.reference && !out.includes(s.reference)) out.push(s.reference); });
    (t.nodes || []).forEach((n) => { if (n && !out.includes(n)) out.push(n); });
    return out;
  }
  // Placeholder tokens from params / attributes / station externalIds + declared nodes/edges.
  function templatePlaceholders(t) {
    const keys = [];
    const add = (k) => { if (k && !keys.includes(k)) keys.push(k); };
    (t.nodes || []).forEach(add);
    (t.edges || []).forEach((e) => { add(e.startNode); add(e.endNode); });
    (t.steps || []).forEach((s) => {
      (s.actions || []).forEach((a) => {
        (a.actionParameters || []).forEach((p) => add(p.value));
        if (a.targetHandlingStationCondition && a.targetHandlingStationCondition.externalId) add(a.targetHandlingStationCondition.externalId);
      });
      (s.attributes || []).forEach((at) => add(at.value));
    });
    return keys;
  }
  // Every key a mapping should carry: node refs (A, B…) + placeholder tokens.
  function allPlaceholders(t) {
    const keys = [];
    const add = (k) => { if (k && !keys.includes(k)) keys.push(k); };
    templateNodeRefs(t).forEach(add);
    templatePlaceholders(t).forEach(add);
    return keys;
  }

  function placeholderSet(t) { return new Set(templatePlaceholders(t)); }
  function mappingsForTemplate(id) { return state.bundle.mappings.filter((m) => m.template === id); }

  function propagateDiff(t, beforeSet) {
    const after = placeholderSet(t);
    const added = [...after].filter((k) => !beforeSet.has(k));
    const removed = [...beforeSet].filter((k) => !after.has(k));
    if (!added.length && !removed.length) return;
    mappingsForTemplate(t.id).forEach((m) => {
      removed.forEach((k) => { m.entries = m.entries.filter((e) => e.key !== k); });
      added.forEach((k) => { if (!m.entries.some((e) => e.key === k)) m.entries.push({ key: k, value: '' }); });
    });
  }
  function propagateTokenRename(t, oldTok, newTok) {
    if (oldTok === newTok) return;
    const stillUsesOld = oldTok && placeholderSet(t).has(oldTok);
    mappingsForTemplate(t.id).forEach((m) => {
      if (oldTok && newTok && !stillUsesOld) {
        const oldE = m.entries.find((e) => e.key === oldTok);
        const newE = m.entries.find((e) => e.key === newTok);
        if (oldE) {
          if (newE) m.entries = m.entries.filter((e) => e !== oldE);
          else oldE.key = newTok;
        } else if (!newE) {
          m.entries.push({ key: newTok, value: '' });
        }
      } else {
        if (newTok && !m.entries.some((e) => e.key === newTok)) m.entries.push({ key: newTok, value: '' });
        if (oldTok && !stillUsesOld) m.entries = m.entries.filter((e) => e.key !== oldTok);
      }
    });
  }

  function autoMappingId(m) {
    const tpl = state.bundle.templates.find((t) => t.id === m.template);
    if (!tpl || !m.template) return m.id;
    const refs = templateNodeRefs(tpl);
    const vals = refs.map((k) => { const e = m.entries.find((x) => x.key === k); return e ? String(e.value).trim() : ''; }).filter((x) => x !== '');
    return m.template + (vals.length ? '_' + vals.join('_') : '') + '_mapping';
  }
  function applyAutoRename(mi) {
    const m = state.bundle.mappings[mi];
    if (!m) return;
    const newId = autoMappingId(m);
    if (newId === m.id) return;
    m.id = newId;
    const idInput = document.querySelector('[data-path="mappings.' + mi + '.id"]');
    if (idInput && document.activeElement !== idInput) idInput.value = newId;
    refreshList();
  }

  // ---- emit JSON with the same field order as the source route-template files ----
  function reorder(obj, keys) {
    const out = {};
    keys.forEach((k) => { if (k in obj) out[k] = obj[k]; });
    Object.keys(obj).forEach((k) => { if (!(k in out)) out[k] = obj[k]; });
    return out;
  }
  function canonicalize(b) {
    const templates = (b.templates || []).map((t) => {
      const o = reorder(t, ['id', 'nodes', 'edges', 'steps']);
      o.steps = (o.steps || []).map((s) => {
        const ss = reorder(s, ['reference', 'type', 'actions', 'attributes']);
        ss.actions = (ss.actions || []).map((a) => {
          const aa = reorder(a, ['actionName', 'blockingType', 'actionParameters', 'targetHandlingStationCondition']);
          aa.actionParameters = (aa.actionParameters || []).map((p) => reorder(p, ['key', 'value', 'dataType']));
          if (aa.targetHandlingStationCondition && typeof aa.targetHandlingStationCondition === 'object') {
            aa.targetHandlingStationCondition = reorder(aa.targetHandlingStationCondition, ['externalId', 'loaded']);
          }
          return aa;
        });
        ss.attributes = (ss.attributes || []).map((at) => reorder(at, ['key', 'value']));
        return ss;
      });
      // Drop empty nodes/edges arrays so output matches the source style of each template.
      if (Array.isArray(o.nodes) && o.nodes.length === 0) delete o.nodes;
      if (Array.isArray(o.edges) && o.edges.length === 0) delete o.edges;
      return o;
    });
    const mappings = (b.mappings || []).map((m) => {
      const o = reorder(m, ['id', 'template', 'actionMapping', 'conditions', 'entries', 'navigationGraphId']);
      if (o.conditions && typeof o.conditions === 'object') {
        o.conditions = reorder(o.conditions, ['milestoneTypes', 'targetActions', 'agvTypes', 'usages']);
      }
      o.entries = (o.entries || []).map((e) => reorder(e, ['key', 'value']));
      return o;
    });
    return reorder({ templates: templates, mappings: mappings }, ['templates', 'mappings']);
  }

  // ===========================================================================
  // MAP EDITOR — model, coordinate transforms, export, reconciliation
  // ===========================================================================
  function mapDecimals() { return (state.mapEd && Number.isFinite(state.mapEd.decimals)) ? state.mapEd.decimals : 3; }
  function rnd(v) { const f = Math.pow(10, mapDecimals()); return Math.round(((+v || 0) + Number.EPSILON) * f) / f; }

  function graphTf(g) { const t = (g && g.graphToMapTransformation) || {}; return { tx: +t.xTranslation || 0, ty: +t.yTranslation || 0, rz: +t.zRotation || 0 }; }
  // graph-local -> map, matching SYNAOS MapGenerator: map = Rot(rz)·(graph - translation)
  function g2m(g, gx, gy) { const { tx, ty, rz } = graphTf(g); const c = Math.cos(rz), s = Math.sin(rz); const dx = gx - tx, dy = gy - ty; return { x: c * dx - s * dy, y: s * dx + c * dy }; }
  // map -> graph-local (inverse): graph = Rot(-rz)·map + translation
  function m2g(g, mx, my) { const { tx, ty, rz } = graphTf(g); const c = Math.cos(rz), s = Math.sin(rz); return { x: c * mx + s * my + tx, y: -s * mx + c * my + ty }; }

  function emptyMap() {
    return { id: 'map', name: 'None', description: 'Made with SYNAOS MapGenerator Editor',
      navigationGraphs: [], waitingSpots: [], handlingStationGroups: [], chargingStations: [],
      trafficLights: [], areas: [], emergencyDetectors: [], limitedCapacityAreas: [] };
  }
  function newGraph(id) {
    return { id: id || 'graph', agvTypes: [], graphToMapTransformation: { xTranslation: 0, yTranslation: 0, zTranslation: 0, zRotation: 0 }, nodes: [], edges: [] };
  }
  function normStation(st) { st.id = st.id || 'station'; st.mapX = +st.mapX || 0; st.mapY = +st.mapY || 0; st.mapZ = +st.mapZ || 0; st.length = +st.length || 5; st.width = +st.width || 5; st.height = +st.height || 5; st.accessNodes = Array.isArray(st.accessNodes) ? st.accessNodes : []; if (st.actions && !Array.isArray(st.actions)) delete st.actions; }
  function normPoint(p) { p.id = p.id || 'el'; p.mapX = +p.mapX || 0; p.mapY = +p.mapY || 0; p.mapZ = +p.mapZ || 0; }
  function normalizeMap(m) {
    m = (m && typeof m === 'object') ? m : emptyMap();
    m.id = m.id || 'map'; m.name = m.name || 'None'; m.description = m.description || 'Made with SYNAOS MapGenerator Editor';
    m.navigationGraphs = Array.isArray(m.navigationGraphs) ? m.navigationGraphs : [];
    m.navigationGraphs.forEach((g) => {
      g.id = g.id || 'graph';
      g.agvTypes = Array.isArray(g.agvTypes) ? g.agvTypes : [];
      const t = g.graphToMapTransformation && typeof g.graphToMapTransformation === 'object' ? g.graphToMapTransformation : {};
      g.graphToMapTransformation = { xTranslation: +t.xTranslation || 0, yTranslation: +t.yTranslation || 0, zTranslation: +t.zTranslation || 0, zRotation: +t.zRotation || 0 };
      g.nodes = Array.isArray(g.nodes) ? g.nodes : [];
      g.nodes.forEach((n) => { n.id = String(n.id); n.graphX = +n.graphX || 0; n.graphY = +n.graphY || 0; n.graphZ = +n.graphZ || 0; });
      g.edges = Array.isArray(g.edges) ? g.edges : [];
      g.edges.forEach((e) => { e.id = String(e.id); e.startNodeId = String(e.startNodeId); e.endNodeId = String(e.endNodeId); });
    });
    ['waitingSpots', 'handlingStationGroups', 'chargingStations', 'trafficLights', 'areas', 'emergencyDetectors', 'limitedCapacityAreas'].forEach((k) => { if (!Array.isArray(m[k])) m[k] = []; });
    m.waitingSpots.forEach((w) => { w.id = String(w.id || 'WS'); w.nodes = Array.isArray(w.nodes) ? w.nodes : []; w.nodes.forEach((n) => { n.navigationGraphId = String(n.navigationGraphId || ''); n.nodeId = String(n.nodeId || ''); }); });
    m.handlingStationGroups.forEach((grp) => {
      grp.id = grp.id || 'group'; grp.controlled = !!grp.controlled; grp.justInSequence = !!grp.justInSequence;
      grp.stationAutomaticSelectionMode = grp.stationAutomaticSelectionMode || 'ALWAYS';
      grp.handlingStations = Array.isArray(grp.handlingStations) ? grp.handlingStations : [];
      grp.handlingStations.forEach(normStation);
      grp.waitingSpots = (Array.isArray(grp.waitingSpots) ? grp.waitingSpots : []).filter(Boolean).map((w) => (typeof w === 'object' ? { id: String(w.id || '') } : { id: String(w) }));
    });
    m.chargingStations.forEach((c) => { normPoint(c); if (typeof c.controlled !== 'boolean') c.controlled = true; c.length = +c.length || 5; c.width = +c.width || 5; c.height = +c.height || 5; c.accessNodes = Array.isArray(c.accessNodes) ? c.accessNodes : []; });
    m.trafficLights.forEach(normPoint);
    m.areas.forEach((a) => { a.id = a.id || 'area'; a.points = Array.isArray(a.points) ? a.points : []; a.points.forEach((p) => { p.mapX = +p.mapX || 0; p.mapY = +p.mapY || 0; }); });
    m.emergencyDetectors.forEach((d) => { d.id = d.id || 'detector'; d.areas = Array.isArray(d.areas) ? d.areas : []; });
    m.limitedCapacityAreas.forEach((l) => { l.id = l.id || 'lca'; l.capacity = +l.capacity || 1; l.nodes = Array.isArray(l.nodes) ? l.nodes : []; });
    return m;
  }

  // Export-shaped, decimal-rounded copy of the map (field order matches the SYNAOS sample).
  function canonicalizeMap(m) {
    const node = (n) => { const o = { id: n.id, graphX: rnd(n.graphX), graphY: rnd(n.graphY), graphZ: rnd(n.graphZ) }; if (n.parkingSpot) o.parkingSpot = n.parkingSpot; if (n.emergencySpot) o.emergencySpot = n.emergencySpot; return o; };
    const edge = (e) => ({ id: e.id, startNodeId: e.startNodeId, endNodeId: e.endNodeId });
    const graph = (g) => ({ id: g.id, agvTypes: (g.agvTypes || []).map((a) => ({ vendorName: a.vendorName, typeName: a.typeName })),
      graphToMapTransformation: { xTranslation: rnd(g.graphToMapTransformation.xTranslation), yTranslation: rnd(g.graphToMapTransformation.yTranslation), zTranslation: rnd(g.graphToMapTransformation.zTranslation), zRotation: rnd(g.graphToMapTransformation.zRotation) },
      nodes: (g.nodes || []).map(node), edges: (g.edges || []).map(edge) });
    const station = (s) => ({ id: s.id, mapX: rnd(s.mapX), mapY: rnd(s.mapY), mapZ: rnd(s.mapZ), width: rnd(s.width), height: rnd(s.height), length: rnd(s.length), actions: Array.isArray(s.actions) ? s.actions : [], accessNodes: (s.accessNodes || []).map((a) => ({ navigationGraphId: a.navigationGraphId, nodeId: a.nodeId })) });
    const group = (gr) => ({ id: gr.id, controlled: !!gr.controlled, justInSequence: !!gr.justInSequence, stationAutomaticSelectionMode: gr.stationAutomaticSelectionMode || 'ALWAYS', handlingStations: (gr.handlingStations || []).map(station), waitingSpots: (gr.waitingSpots || []).map((w) => ({ id: w.id })) });
    const charger = (c) => ({ id: c.id, mapX: rnd(c.mapX), mapY: rnd(c.mapY), mapZ: rnd(c.mapZ), length: rnd(c.length), width: rnd(c.width), height: rnd(c.height), controlled: !!c.controlled, accessNodes: (c.accessNodes || []).map((a) => ({ navigationGraphId: a.navigationGraphId, nodeId: a.nodeId })) });
    const light = (l) => { const o = { id: l.id, mapX: rnd(l.mapX), mapY: rnd(l.mapY), mapZ: rnd(l.mapZ) }; if (l.scenarioIndicatorCounter) o.scenarioIndicatorCounter = l.scenarioIndicatorCounter; return o; };
    const area = (a) => ({ id: a.id, points: (a.points || []).map((p) => ({ mapX: rnd(p.mapX), mapY: rnd(p.mapY) })) });
    const det = (d) => ({ id: d.id, areas: (d.areas || []).slice() });
    const lca = (l) => ({ id: l.id, capacity: l.capacity, nodes: (l.nodes || []).map((n) => ({ nodeId: n.nodeId, navigationGraphId: n.navigationGraphId })) });
    return { id: m.id, name: m.name, description: m.description,
      navigationGraphs: (m.navigationGraphs || []).map(graph),
      waitingSpots: (m.waitingSpots || []).map((w) => ({ id: w.id, nodes: (w.nodes || []).map((n) => ({ navigationGraphId: n.navigationGraphId, nodeId: n.nodeId })) })),
      handlingStationGroups: (m.handlingStationGroups || []).map(group),
      chargingStations: (m.chargingStations || []).map(charger),
      trafficLights: (m.trafficLights || []).map(light),
      areas: (m.areas || []).map(area),
      emergencyDetectors: (m.emergencyDetectors || []).map(det),
      limitedCapacityAreas: (m.limitedCapacityAreas || []).map(lca) };
  }

  // ===========================================================================
  // RESERVATION DEPENDENCIES · WAITING SPOTS · EMERGENCY AREAS — model helpers
  // ===========================================================================
  function nowStamp() { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds()); }
  function depsFileName() { return 'reservation_dependencies_' + nowStamp() + '.json'; }
  function normalizeDeps(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter((d) => d && typeof d === 'object' && d.fromNode != null).map((d) => ({
      fromNode: String(d.fromNode),
      fromNavigationGraph: String(d.fromNavigationGraph == null ? '' : d.fromNavigationGraph),
      to: (Array.isArray(d.to) ? d.to : []).filter((t) => t && typeof t === 'object').map((t) => ({
        navigationGraph: String(t.navigationGraph == null ? '' : t.navigationGraph),
        nodes: (Array.isArray(t.nodes) ? t.nodes : []).map((n) => String(n))
      }))
    }));
  }
  // Export shape = the sample reservation-dependencies file; empty target groups are dropped.
  function canonicalizeDeps(arr) {
    return (arr || []).map((d) => ({
      fromNode: d.fromNode,
      fromNavigationGraph: d.fromNavigationGraph,
      to: (d.to || []).filter((t) => (t.nodes || []).length).map((t) => ({ navigationGraph: t.navigationGraph, nodes: (t.nodes || []).slice() }))
    }));
  }
  function depLabel(d) { return d.fromNavigationGraph + ' : ' + d.fromNode; }
  function depTargetCount(d) { return (d.to || []).reduce((n, t) => n + (t.nodes || []).length, 0); }
  function toggleDepTarget(d, graphId, nodeId) {
    d.to = Array.isArray(d.to) ? d.to : [];
    let t = d.to.find((x) => x.navigationGraph === graphId);
    if (t && t.nodes.includes(nodeId)) { t.nodes = t.nodes.filter((n) => n !== nodeId); if (!t.nodes.length) d.to = d.to.filter((x) => x !== t); }
    else { if (!t) { t = { navigationGraph: graphId, nodes: [] }; d.to.push(t); } t.nodes.push(nodeId); }
  }
  function activeDep() { const i = state.mapEd.depSel; return (i != null && state.deps[i]) || null; }
  function activeWs() { const i = state.mapEd.wsSel; return (i != null && state.map && (state.map.waitingSpots || [])[i]) || null; }
  function nextWsId() { const used = new Set((state.map.waitingSpots || []).map((w) => w.id)); let i = 1, id; do { id = 'WS' + i; i++; } while (used.has(id)); return id; }
  function groupOfStation(stId) { return ((state.map && state.map.handlingStationGroups) || []).find((g) => (g.handlingStations || []).some((s) => s.id === stId)) || null; }
  function emergencyAreaIds() { const s = new Set(); ((state.map && state.map.emergencyDetectors) || []).forEach((d) => (d.areas || []).forEach((a) => s.add(a))); return s; }
  function removeWaitingSpotRefs(id) { (state.map.handlingStationGroups || []).forEach((g) => { g.waitingSpots = (g.waitingSpots || []).filter((w) => (w && w.id) !== id); }); }
  function renameWaitingSpotRefs(oldId, newId) { (state.map.handlingStationGroups || []).forEach((g) => (g.waitingSpots || []).forEach((w) => { if (w && w.id === oldId) w.id = newId; })); }
  // Keep dependencies + waiting spots consistent with node/graph renames & deletions.
  function renameNodeInExtras(graphId, oldId, newId) {
    (state.deps || []).forEach((d) => {
      if (d.fromNavigationGraph === graphId && d.fromNode === oldId) d.fromNode = newId;
      (d.to || []).forEach((t) => { if (t.navigationGraph === graphId) t.nodes = t.nodes.map((n) => (n === oldId ? newId : n)); });
    });
    ((state.map && state.map.waitingSpots) || []).forEach((w) => (w.nodes || []).forEach((n) => { if (n.navigationGraphId === graphId && n.nodeId === oldId) n.nodeId = newId; }));
  }
  function removeNodeFromExtras(graphId, nodeId) {
    state.deps = (state.deps || []).filter((d) => !(d.fromNavigationGraph === graphId && d.fromNode === nodeId));
    state.deps.forEach((d) => { (d.to || []).forEach((t) => { if (t.navigationGraph === graphId) t.nodes = t.nodes.filter((n) => n !== nodeId); }); d.to = (d.to || []).filter((t) => t.nodes.length); });
    ((state.map && state.map.waitingSpots) || []).forEach((w) => { w.nodes = (w.nodes || []).filter((n) => !(n.navigationGraphId === graphId && n.nodeId === nodeId)); });
    if (state.mapEd.depSel != null && !state.deps[state.mapEd.depSel]) state.mapEd.depSel = null;
  }
  function renameGraphInExtras(oldId, newId) {
    (state.deps || []).forEach((d) => { if (d.fromNavigationGraph === oldId) d.fromNavigationGraph = newId; (d.to || []).forEach((t) => { if (t.navigationGraph === oldId) t.navigationGraph = newId; }); });
    ((state.map && state.map.waitingSpots) || []).forEach((w) => (w.nodes || []).forEach((n) => { if (n.navigationGraphId === oldId) n.navigationGraphId = newId; }));
  }
  function removeGraphFromExtras(graphId) {
    state.deps = (state.deps || []).filter((d) => d.fromNavigationGraph !== graphId);
    state.deps.forEach((d) => { d.to = (d.to || []).filter((t) => t.navigationGraph !== graphId); });
    ((state.map && state.map.waitingSpots) || []).forEach((w) => { w.nodes = (w.nodes || []).filter((n) => n.navigationGraphId !== graphId); });
    if (state.mapEd.depSel != null && !state.deps[state.mapEd.depSel]) state.mapEd.depSel = null;
  }

  // Non-destructive: keep each existing graph's route-template bundle by id; add new graphs via matching; drop removed graphs.
  function reconcileGraphsAfterMapEdit() {
    const prevById = {}; (state.graphs || []).forEach((p) => { prevById[p.graphId] = p; });
    let kept = 0, added = 0;
    state.graphs = (state.map.navigationGraphs || []).map((g) => {
      const nodeIds = (g.nodes || []).map((n) => n.id);
      const edgeIds = (g.edges || []).map((e) => e.id);
      const p = prevById[g.id];
      if (p) { p.agvTypes = g.agvTypes || []; p.nodeIds = nodeIds; p.edgeIds = edgeIds; kept++; return p; }
      added++;
      const known = findKnownGraph(g);
      return { graphId: g.id, agvTypes: g.agvTypes || [], nodeIds, edgeIds, matched: !!known, baseChosen: !!known, bundle: normalize(known ? clone(known.bundle) : { templates: [], mappings: [] }) };
    });
    if (state.gi >= state.graphs.length) state.gi = Math.max(0, state.graphs.length - 1);
    return { kept, added };
  }

  // ---- map element helpers ----
  function mapGraph() { return (state.map && state.map.navigationGraphs[state.mapEd.gi]) || null; }
  function nodeById(g, id) { return (g.nodes || []).find((n) => n.id === id); }
  function allStations() {
    const out = [];
    (state.mapEd.ungroupedStations || []).forEach((st) => out.push({ st: st, group: null }));
    (state.map.handlingStationGroups || []).forEach((grp) => (grp.handlingStations || []).forEach((st) => out.push({ st: st, group: grp })));
    return out;
  }
  function idStyleWidth(g) { let w = 0; (g.nodes || []).forEach((n) => { if (/^\d+$/.test(n.id) && n.id.length > 1 && n.id[0] === '0') w = Math.max(w, n.id.length); }); return w; }
  function nextNodeId(g) {
    const used = new Set((g.nodes || []).map((n) => n.id)); const w = idStyleWidth(g);
    for (let i = 0; i < 100000; i++) { const id = w ? String(i).padStart(w, '0') : String(i); if (!used.has(id)) return id; }
    return String(Date.now());
  }
  function edgeSep(g) { for (const e of g.edges || []) { if (e.id.includes('-')) return '-'; if (e.id.includes('_')) return '_'; } return '_'; }
  function edgeIdFor(g, a, b) { return a + edgeSep(g) + b; }
  function uniqueId(existing, base) { if (!existing.has(base)) return base; let i = 2; while (existing.has(base + '_' + i)) i++; return base + '_' + i; }

  async function reloadBackground() {
    const bg = state.mapEd.bg;
    if (!bg || bg.dataUrl || !bg.path || !(window.electronAPI && window.electronAPI.readImage)) return;
    try { const res = await window.electronAPI.readImage(bg.path); if (res && res.success) { bg.dataUrl = res.dataUrl; paintCanvas(); } } catch (e) {}
  }

  // ------------------------------------------------------- map & matching
  function findKnownGraph(g) {
    const nodeKey = sortedKey((g.nodes || []).map((n) => n.id));
    const edgeKey = sortedKey((g.edges || []).map((e) => e.id));
    return (window.KNOWN_GRAPHS || []).find((k) =>
      k.graphId === g.id && sortedKey(k.nodeIds) === nodeKey && sortedKey(k.edgeIds) === edgeKey
    );
  }
  function graphsFromMap(map) {
    return (map.navigationGraphs || []).map((g) => {
      const known = findKnownGraph(g);
      const base = {
        graphId: g.id,
        agvTypes: g.agvTypes || [],
        nodeIds: (g.nodes || []).map((n) => n.id),
        edgeIds: (g.edges || []).map((e) => e.id),
        matched: !!known,
        baseChosen: !!known
      };
      base.bundle = normalize(known ? clone(known.bundle) : { templates: [], mappings: [] });
      return base;
    });
  }
  function agvLabel(g) {
    const a = (g.agvTypes || [])[0];
    return a ? (a.vendorName + ' · ' + a.typeName) : 'unknown AGV';
  }
  function mapEdgesFor(graphId) {
    const g = (state.map && state.map.navigationGraphs || []).find((x) => x.id === graphId);
    return g ? (g.edges || []) : [];
  }
  function mapNodesFor(graphId) {
    const g = (state.map && state.map.navigationGraphs || []).find((x) => x.id === graphId);
    return g ? (g.nodes || []) : [];
  }
  function handlingStationsFor(graphId) {
    const out = [];
    (state.map && state.map.handlingStationGroups || []).forEach((grp) => {
      (grp.handlingStations || []).forEach((st) => {
        (st.accessNodes || []).forEach((an) => { if (an.navigationGraphId === graphId) out.push({ stationId: st.id, nodeId: an.nodeId }); });
      });
    });
    return out;
  }

  // ------- auto-generate mappings from the live map -------
  function templateStationInfo(t) {
    for (const s of t.steps || []) {
      for (const a of s.actions || []) {
        if (a.targetHandlingStationCondition && a.targetHandlingStationCondition.externalId) {
          return { nodeRef: s.reference, externalIdPlaceholder: a.targetHandlingStationCondition.externalId };
        }
      }
    }
    return null;
  }
  function templateIsEdge(t) { return (t.steps || []).some((s) => s.type === 'edge'); }
  function sampleMappingFor(tId) { return state.bundle.mappings.find((m) => m.template === tId); }

  function buildMapping(t, gid, overrides, sample) {
    const entries = allPlaceholders(t).map((k) => {
      let v = '';
      if (sample) { const se = sample.entries.find((e) => e.key === k); if (se) v = se.value; }
      if (Object.prototype.hasOwnProperty.call(overrides, k)) v = overrides[k];
      return { key: k, value: String(v) };
    });
    if (sample) sample.entries.forEach((se) => { if (!entries.some((e) => e.key === se.key)) entries.push({ key: se.key, value: Object.prototype.hasOwnProperty.call(overrides, se.key) ? String(overrides[se.key]) : se.value }); });
    return {
      id: t.id + '_mapping',
      template: t.id,
      actionMapping: sample ? !!sample.actionMapping : false,
      conditions: sample && sample.conditions ? clone(sample.conditions) : null,
      entries: entries,
      navigationGraphId: gid
    };
  }
  function generateFromMap() {
    const g = curGraph();
    if (!g) return 0;
    const gid = g.graphId;
    let added = 0;
    const exists = (id) => state.bundle.mappings.some((m) => m.id === id);
    state.bundle.templates.forEach((t) => {
      const sample = sampleMappingFor(t.id);
      const station = templateStationInfo(t);
      if (station) {
        handlingStationsFor(gid).forEach(({ stationId, nodeId }) => {
          const ov = {}; if (station.nodeRef) ov[station.nodeRef] = nodeId; ov[station.externalIdPlaceholder] = stationId;
          const m = buildMapping(t, gid, ov, sample); m.id = t.id + '_' + nodeId + '_mapping';
          if (!exists(m.id)) { state.bundle.mappings.push(m); added++; }
        });
      } else if (templateIsEdge(t)) {
        const refs = templateNodeRefs(t); const A = refs[0], B = refs[1];
        mapEdgesFor(gid).forEach((ed) => {
          const ov = {}; if (A) ov[A] = ed.startNodeId; if (B) ov[B] = ed.endNodeId;
          const m = buildMapping(t, gid, ov, sample); m.id = t.id + '_' + ed.startNodeId + '_' + ed.endNodeId + '_mapping';
          if (!exists(m.id)) { state.bundle.mappings.push(m); added++; }
        });
      } else {
        const refs = templateNodeRefs(t); const A = refs[0];
        mapNodesFor(gid).forEach((nd) => {
          const ov = {}; if (A) ov[A] = nd.id;
          const m = buildMapping(t, gid, ov, sample); m.id = t.id + '_' + nd.id + '_mapping';
          if (!exists(m.id)) { state.bundle.mappings.push(m); added++; }
        });
      }
    });
    return added;
  }

  // -------------------------------------------------------------- persistence
  let saveTimer = null;
  function persistNow() {
    try {
      const bg = state.mapEd.bg;
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        map: state.map, mapName: state.mapName, graphs: state.graphs, gi: state.gi, deps: state.deps,
        mapEd: { decimals: state.mapEd.decimals, ungroupedStations: state.mapEd.ungroupedStations,
          bg: bg ? { path: bg.path, name: bg.name, metersPerPixel: bg.metersPerPixel, offsetX: bg.offsetX, offsetY: bg.offsetY, imgW: bg.imgW, imgH: bg.imgH, opacity: bg.opacity } : null }
      }));
      const st = $('#save-status');
      if (st) {
        const d = new Date();
        st.textContent = 'Autosaved ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      }
    } catch (e) { /* storage may be unavailable */ }
  }
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, 250);
  }
  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s || !Array.isArray(s.graphs)) return null;
      s.graphs.forEach((g) => { g.bundle = normalize(g.bundle || {}); });
      return s;
    } catch (e) { return null; }
  }

  // ----------------------------------------------------------- user samples
  function loadUserSamples() {
    try { const a = JSON.parse(localStorage.getItem(USER_SAMPLES_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function saveUserSamples(arr) { try { localStorage.setItem(USER_SAMPLES_KEY, JSON.stringify(arr)); } catch (e) {} }
  function upsertUserSample(name, bundle) {
    const arr = loadUserSamples();
    const i = arr.findIndex((s) => s.name === name);
    const rec = { name: name, bundle: canonicalize(bundle) };
    if (i >= 0) arr[i] = rec; else arr.push(rec);
    saveUserSamples(arr);
  }
  // Built-in samples come from the known graphs (their full template+mapping bundles).
  function builtinSamples() {
    return (window.KNOWN_GRAPHS || []).map((k) => ({ name: k.graphId, bundle: k.bundle, builtIn: true }));
  }
  function allSamples() {
    return builtinSamples().concat(loadUserSamples().map((s) => ({ name: s.name, bundle: s.bundle, builtIn: false })));
  }

  // -------------------------------------------------------------------- theme
  function loadTheme() {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  }
  function toggleTheme() {
    const dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    render();
  }

  // ------------------------------------------------------------------- toasts
  function toast(title, msg, type) {
    const host = $('#toast-host');
    if (!host) return;
    const d = document.createElement('div');
    d.className = 'toast ' + (type || '');
    d.innerHTML = '<div class="t-title">' + esc(title) + '</div>' + (msg ? '<div class="t-msg">' + esc(msg) + '</div>' : '');
    host.appendChild(d);
    setTimeout(() => { d.style.transition = 'opacity .3s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 320); }, 2700);
  }

  // ----------------------------------------------------------- small builders
  function optionTags(values, current) {
    const seen = new Set();
    const list = [];
    (values || []).forEach((v) => {
      const val = typeof v === 'object' ? v.value : v;
      const lab = typeof v === 'object' ? v.label : v;
      if (seen.has(val)) return;
      seen.add(val);
      list.push('<option value="' + esc(val) + '"' + (val === current ? ' selected' : '') + '>' + esc(lab) + '</option>');
    });
    if (current != null && current !== '' && !seen.has(current)) {
      list.unshift('<option value="' + esc(current) + '" selected>' + esc(current) + '</option>');
    }
    return list.join('');
  }
  function btn(act, icon, label, cls, title) {
    return '<button class="btn ' + (cls || 'btn-ghost') + '" data-act="' + act + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' +
      (icon || '') + (label ? '<span>' + esc(label) + '</span>' : '') + '</button>';
  }
  function btnIdx(act, icon, label, cls, i) {
    return '<button class="btn ' + cls + '" data-act="' + act + '" data-i="' + i + '">' + icon + (label ? '<span>' + esc(label) + '</span>' : '') + '</button>';
  }
  function delBtn(act, i) {
    return '<button class="btn btn-ghost btn-icon btn-sm btn-danger-ghost" data-act="' + act + '" data-i="' + i + '" title="Remove">' + I.trash + '</button>';
  }
  function iconBtnIdx(act, icon, i, title, extra) {
    return '<button class="btn btn-ghost btn-icon btn-sm ' + (extra || '') + '" data-act="' + act + '" data-i="' + i + '" title="' + esc(title) + '">' + icon + '</button>';
  }
  function iconBtn2(act, icon, s, a, title, extra) {
    return '<button class="btn btn-ghost btn-icon btn-sm ' + (extra || '') + '" data-act="' + act + '" data-s="' + s + '" data-a="' + a + '" title="' + esc(title) + '">' + icon + '</button>';
  }

  // ----------------------------------------------------- active-bundle helpers
  function curGraph() { return state.editingSample ? null : state.graphs[state.gi] || null; }
  function syncActiveBundle() {
    if (state.editingSample) state.bundle = state.editingSample.bundle;
    else if (state.graphs[state.gi]) state.bundle = state.graphs[state.gi].bundle;
    else state.bundle = { templates: [], mappings: [] };
  }
  function resetEditState() { state.tab = 'templates'; state.ti = 0; state.mi = 0; state.tSearch = ''; state.mSearch = ''; state.dupN = 1; state.sel = new Set(); }
  function needsBase() { const g = curGraph(); return !!(g && !g.baseChosen); }

  // ===========================================================================
  // RENDER
  // ===========================================================================
  function render() {
    syncActiveBundle();
    const app = $('#app');
    const detailScroll = $('.detail') ? $('.detail').scrollTop : null;
    const listScroll = $('.sidebar-list') ? $('.sidebar-list').scrollTop : null;
    const previewScroll = $('.preview-body') ? $('.preview-body').scrollTop : null;

    if (state.view === 'map' && state.map) {
      app.innerHTML = mapEditorHTML();
      if (state.mapEd.dialog) app.insertAdjacentHTML('beforeend', mapDialogHTML());
      if (state.exportModal) app.insertAdjacentHTML('beforeend', exportModalHTML());
      if (state.preview) app.insertAdjacentHTML('beforeend', mapPreviewHTML());
      afterMapRender();
      return;
    }

    if (!state.map && !state.editingSample) {
      app.innerHTML = landingHTML();
    } else {
      let html = headerHTML();
      html += state.editingSample ? sampleBarHTML() : graphBarHTML();
      if (needsBase()) html += baseChooserHTML();
      else if (curGraph() && curGraph().noRouteTemplate) html += noTemplateHTML();
      else html += tabsHTML() + workspaceHTML();
      html += footerHTML();
      app.innerHTML = html;
    }
    if (state.samplesModal) app.insertAdjacentHTML('beforeend', samplesModalHTML());
    if (state.saveDialog) app.insertAdjacentHTML('beforeend', saveDialogHTML());
    if (state.exportModal) app.insertAdjacentHTML('beforeend', exportModalHTML());

    if (detailScroll != null && $('.detail')) $('.detail').scrollTop = detailScroll;
    if (listScroll != null && $('.sidebar-list')) $('.sidebar-list').scrollTop = listScroll;
    if (previewScroll != null && $('.preview-body')) $('.preview-body').scrollTop = previewScroll;

    if (pendingFocus) {
      const e = document.querySelector('[data-path="' + pendingFocus + '"]');
      if (e) { e.focus(); try { const L = e.value.length; e.setSelectionRange(L, L); } catch (_) {} }
      pendingFocus = null;
    }
  }

  function themeBtn() {
    const dark = document.documentElement.classList.contains('dark');
    return btn('theme', dark ? I.sun : I.moon, dark ? 'Light' : 'Dark', 'btn-outline', 'Toggle light/dark mode');
  }

  // -------------------------------------------------------------- landing
  function landingHTML() {
    const session = loadSession();
    const resume = session && session.map
      ? '<button class="btn btn-outline" data-act="resume">' + I.refresh + '<span>Resume last session</span></button>' : '';
    return '<header class="app-header">' +
        '<div class="brand"><div class="logo">' + I.logo + '</div>' +
        '<div class="brand-text"><h1>Route Template Mapper</h1><p>Read a map · match navigation graphs · edit & export route templates</p></div></div>' +
        '<div class="header-spacer"></div><div class="header-actions">' + themeBtn() +
        btn('samples', I.box, 'Sample templates', 'btn-ghost', 'Check & edit the built-in / saved route templates') +
        '</div></header>' +
      '<div class="landing">' +
        '<div class="landing-card">' +
          '<div class="landing-icon">' + I.map + '</div>' +
          '<h2>Load a map to begin</h2>' +
          '<p class="muted">Pick a map <span class="mono">.json</span> file. The app reads its navigation graphs and pairs each one with a route-template editor. Graphs that match a known layout load their templates automatically; new graphs let you start from a sample.</p>' +
          '<div class="landing-actions">' +
            btn('loadMap', I.open, 'Choose map file…', 'btn-primary') +
            btn('newMap', I.plus, 'New map', 'btn-outline') +
            (window.EXAMPLE_MAP ? btn('loadExample', I.map, 'Load example map', 'btn-outline') : '') +
            resume +
          '</div>' +
          '<div class="landing-hint muted">' + (window.KNOWN_GRAPHS || []).length + ' known graph(s) built in: ' +
            esc((window.KNOWN_GRAPHS || []).map((k) => k.graphId).join(', ')) + '</div>' +
        '</div>' +
      '</div>';
  }

  // -------------------------------------------------------------- header
  function headerHTML() {
    const actions = state.editingSample
      ? themeBtn() +
        btn('samples', I.box, 'Samples', 'btn-ghost', 'Check & edit sample route templates') +
        btn('preview', I.code, 'Preview JSON', state.preview ? 'btn-secondary' : 'btn-ghost') +
        btn('sample:saveAs', I.save, 'Save as sample', 'btn-outline') +
        btn('sample:download', I.download, 'Download', 'btn-primary') +
        btn('sample:close', I.open, 'Close', 'btn-ghost')
      : btn('home', I.home, 'Menu', 'btn-ghost', 'Back to the start screen — your work is auto-saved') +
        themeBtn() +
        btn('samples', I.box, 'Samples', 'btn-ghost', 'Check & edit sample route templates') +
        btn('loadMap', I.open, 'Load map', 'btn-ghost', 'Load a different map') +
        btn('mapEdit', I.map, 'Map edit', 'btn-ghost', 'Open the visual map editor') +
        btn('preview', I.code, 'Preview JSON', state.preview ? 'btn-secondary' : 'btn-ghost') +
        btn('graph:saveSample', I.save, 'Save as sample', 'btn-outline') +
        btn('exportAll', I.download, 'Export', 'btn-primary');
    return '<header class="app-header">' +
        '<div class="brand"><div class="logo">' + I.logo + '</div>' +
          '<div class="brand-text"><h1>Route Template Mapper</h1>' +
          '<p>' + (state.editingSample ? 'Editing sample template' : esc(state.mapName || 'map loaded')) + '</p></div></div>' +
        '<div class="header-spacer"></div>' +
        '<div class="header-actions">' + actions + '</div></header>';
  }

  // -------------------------------------------------------------- graph bar
  function graphBarHTML() {
    const pills = state.graphs.map((g, i) => {
      const active = i === state.gi ? ' active' : '';
      const status = g.noRouteTemplate
        ? '<span class="gp-badge none" title="No route template">no template</span>'
        : (g.matched
          ? '<span class="gp-badge ok" title="Matches a known graph">' + I.check + 'matched</span>'
          : '<span class="gp-badge warn" title="Not a known graph">' + I.warn + 'new</span>');
      return '<button class="graph-pill' + active + '" data-act="graph:select" data-i="' + i + '">' +
        '<span class="gp-main"><span class="gp-id">' + esc(g.graphId) + '</span>' +
        '<span class="gp-sub">' + esc(agvLabel(g)) + ' · ' + (g.noRouteTemplate ? 'no route template' : g.bundle.mappings.length + ' mappings') + '</span></span>' +
        status + '</button>';
    }).join('');
    return '<div class="graph-bar"><span class="graph-bar-label">' + I.layers + 'Navigation graphs <b>' + state.graphs.length + '</b></span>' +
      '<div class="graph-pills">' + pills + '</div></div>';
  }

  function sampleBarHTML() {
    const s = state.editingSample;
    return '<div class="graph-bar sample"><span class="graph-bar-label">' + I.box + 'Editing sample: <b>' + esc(s.name) + '</b>' +
      (s.builtIn ? ' <span class="badge outline">built-in</span>' : ' <span class="badge outline">custom</span>') + '</span>' +
      '<div class="row-actions">' + btn('sample:download', I.download, 'Download this file', 'btn-outline btn-sm') + '</div></div>';
  }

  // -------------------------------------------------------------- base chooser
  function baseChooserHTML() {
    const g = curGraph();
    const packs = (window.TEMPLATE_PACKS || []).map((p) =>
      '<button class="sample-item" data-act="base:pack" data-key="' + esc(p.key) + '">' +
        '<div class="sample-main"><div class="sample-name">' + esc(p.name) + '</div>' +
        '<div class="sample-sub">' + (p.templates || []).length + ' template(s): ' + esc((p.templates || []).map((t) => t.id).join(', ')) + '</div></div>' +
        I.copy + '</button>').join('');
    return '<div class="workspace"><main class="detail"><div class="detail-inner">' +
      '<div class="warn-banner">' + I.warn + '<div><b>“' + esc(g.graphId) + '”</b> isn’t one of the known navigation graphs (' +
        esc(agvLabel(g)) + '). Pick a route-template style to start from, customize it, then use <b>Save as sample</b> so it can be reused.</div></div>' +
      '<div class="card"><div class="card-head"><h3>' + I.box + 'Choose a starting point</h3></div>' +
      '<div class="card-body"><div class="sample-list">' + packs +
        '<button class="sample-item" data-act="base:blank"><div class="sample-main"><div class="sample-name">Start blank</div>' +
        '<div class="sample-sub">Begin with no templates and build everything by hand.</div></div>' + I.plus + '</button>' +
        '<button class="sample-item" data-act="base:none"><div class="sample-main"><div class="sample-name">No route template</div>' +
        '<div class="sample-sub">This graph won’t have a route template — it is skipped on export. You can add one later.</div></div>' + I.trash + '</button>' +
      '</div></div></div>' +
      '</div></main></div>';
  }
  function noTemplateHTML() {
    const g = curGraph();
    return '<div class="workspace"><main class="detail"><div class="detail-inner">' +
      '<div class="card"><div class="card-body"><div class="empty">' + I.layers +
        '<p class="big">No route template</p>' +
        '<p><b>“' + esc(g.graphId) + '”</b> is set to have no route template, so it is skipped when you export.</p>' +
        '<div class="spacer-8"></div>' + btn('graph:withTemplate', I.plus, 'Add a route template', 'btn-primary') +
      '</div></div></div></div></main></div>';
  }

  // -------------------------------------------------------------- footer
  function footerHTML() {
    const g = curGraph();
    const ctxRaw = state.editingSample ? 'Sample' : (g ? 'Graph: ' + g.graphId : '');
    const counts = state.bundle.templates.length + ' templates · ' + state.bundle.mappings.length + ' mappings';
    const noTplBtn = (g && !state.editingSample && !g.noRouteTemplate) ? btn('graph:noTemplate', I.trash, 'No route template', 'btn-ghost btn-sm', 'Mark this graph as having no route template (skipped on export)') : '';
    return '<footer class="app-footer slim">' +
      '<span class="footer-hint muted">' + (ctxRaw ? esc(ctxRaw) + ' · ' : '') + (g && g.noRouteTemplate ? 'no route template' : counts) + '</span>' +
      '<div class="footer-actions">' + noTplBtn + '</div>' +
      '<span id="save-status" class="muted" style="font-size:12px;"></span>' +
      '</footer>';
  }

  // -------------------------------------------------------------- tabs
  function tabsHTML() {
    const t = state.tab;
    return '<nav class="tabs-bar">' +
      '<button class="tab ' + (t === 'templates' ? 'active' : '') + '" data-act="tab" data-tab="templates">' +
        I.box + 'Templates <span class="count">' + state.bundle.templates.length + '</span></button>' +
      '<button class="tab ' + (t === 'mappings' ? 'active' : '') + '" data-act="tab" data-tab="mappings">' +
        I.layers + 'Mappings <span class="count">' + state.bundle.mappings.length + '</span></button>' +
      '</nav>';
  }

  function workspaceHTML() {
    const main = state.tab === 'templates'
      ? templateSidebarHTML() + '<main class="detail">' + templateDetailHTML() + '</main>'
      : mappingSidebarHTML() + '<main class="detail">' + mappingDetailHTML() + '</main>';
    return '<div class="workspace">' + main + (state.preview ? previewPanelHTML() : '') + '</div>';
  }

  function overviewStatsHTML() {
    const tpl = state.bundle.templates, map = state.bundle.mappings;
    const ids = new Set(tpl.map((t) => t.id));
    const orphans = map.filter((m) => !ids.has(m.template)).length;
    return '<div class="stats">' +
      stat(tpl.length, 'Templates') + stat(map.length, 'Mappings') +
      stat(orphans, 'Orphan Mappings', orphans > 0 ? 'warn' : '') +
      stat(tpl.reduce((n, t) => n + (t.steps ? t.steps.length : 0), 0), 'Total Steps') + '</div>';
  }
  function stat(v, k, cls) { return '<div class="stat ' + (cls || '') + '"><div class="v">' + v + '</div><div class="k">' + esc(k) + '</div></div>'; }

  // ====================================================== TEMPLATES: sidebar
  function templateSidebarHTML() {
    return '<aside class="sidebar">' +
      '<div class="sidebar-head"><h2>Templates</h2>' + btn('tpl:add', I.plus, 'Add', 'btn-secondary btn-sm') + '</div>' +
      '<div class="sidebar-search"><input type="text" placeholder="Search templates…" data-search="t" value="' + esc(state.tSearch) + '" /></div>' +
      '<div class="sidebar-list">' + templateListItems() + '</div></aside>';
  }
  function templateListItems() {
    const q = state.tSearch.toLowerCase();
    const items = state.bundle.templates.map((t, i) => ({ t, i })).filter((x) => !q || x.t.id.toLowerCase().includes(q));
    if (!items.length) return '<div class="empty" style="margin:8px;">' + I.box + '<p>No templates' + (q ? ' match' : ' yet') + '</p></div>';
    return items.map(({ t, i }) => {
      const sub = templateNodeRefs(t).length + ' nodes · ' + (t.steps ? t.steps.length : 0) + ' steps';
      return '<div class="list-item ' + (i === state.ti ? 'active' : '') + '" data-act="tpl:select" data-i="' + i + '">' +
        '<span class="li-dot node"></span><div class="li-main"><div class="li-title">' + esc(t.id) + '</div><div class="li-sub">' + esc(sub) + '</div></div></div>';
    }).join('');
  }

  // ==================================================== TEMPLATES: detail
  function templateDetailHTML() {
    const tpl = state.bundle.templates;
    if (!tpl.length) {
      return '<div class="detail-inner">' + overviewStatsHTML() +
        '<div class="empty">' + I.box + '<p class="big">No templates yet</p>' +
        '<p>Create a template to define a robot operation (pickup, dropoff, edge…).</p>' +
        '<div class="spacer-8"></div>' + btn('tpl:add', I.plus, 'Add your first template', 'btn-primary') + '</div></div>';
    }
    if (state.ti >= tpl.length) state.ti = tpl.length - 1;
    const t = tpl[state.ti], ti = state.ti;
    const nodeOpts = templateNodeRefs(t);
    const refOpts = nodeOpts.map((n) => ({ value: n, label: n + ' (node)' })).concat((t.edges || []).map((e) => ({ value: e.id, label: e.id + ' (edge)' })));

    return '<div class="detail-inner">' +
      '<div class="card"><div class="card-head"><h3>' + I.box + 'Template</h3>' +
        '<div class="row-actions">' + btnIdx('tpl:dup', I.copy, 'Duplicate', 'btn-outline btn-sm', ti) +
          btnIdx('tpl:del', I.trash, 'Delete', 'btn-outline btn-sm btn-danger-ghost', ti) + '</div></div>' +
        '<div class="card-body"><div class="field"><label>Template ID</label>' +
          '<input type="text" data-path="templates.' + ti + '.id" data-refresh="list" value="' + esc(t.id) + '" placeholder="e.g. TUSK_PICKUP" />' +
          '<div class="hint">Mappings reference this exact ID.</div></div></div></div>' +
      '<div class="card"><div class="card-head"><h3>' + I.node + 'Nodes <span class="sub">' + (t.nodes ? t.nodes.length : 0) + '</span></h3>' +
        btn('node:add', I.plus, 'Add node', 'btn-secondary btn-sm') + '</div><div class="card-body tight">' + nodesHTML(t, ti) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>' + I.edge + 'Edges <span class="sub">' + (t.edges ? t.edges.length : 0) + '</span></h3>' +
        btn('edge:add', I.plus, 'Add edge', 'btn-secondary btn-sm') + '</div><div class="card-body tight">' + edgesHTML(t, ti, t.nodes) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>' + I.layers + 'Steps <span class="sub">' + t.steps.length + '</span></h3>' +
        btn('step:add', I.plus, 'Add step', 'btn-secondary btn-sm') + '</div><div class="card-body">' + stepsHTML(t, ti, refOpts) + '</div></div>' +
      '</div>';
  }

  function nodesHTML(t, ti) {
    if (!t.nodes || !t.nodes.length) return '<div class="empty" style="padding:18px;">No declared node placeholders. (Node references also come from “node” steps below.)</div>';
    return '<div class="rows">' + t.nodes.map((n, i) =>
      '<div class="row"><input type="text" class="grow mono" data-path="templates.' + ti + '.nodes.' + i + '" data-token data-orig="' + esc(n) + '" value="' + esc(n) + '" placeholder="Node name e.g. A" />' +
      delBtn('node:del', i) + '</div>').join('') + '</div>';
  }
  function edgesHTML(t, ti, nodeOpts) {
    if (!t.edges || !t.edges.length) return '<div class="empty" style="padding:18px;">No edges. An edge connects two nodes (e.g. A → B).</div>';
    const head = '<div class="row edge" style="border:0;background:transparent;padding:2px 8px;"><span class="row-label">Edge ID</span><span class="row-label">Start node</span><span class="row-label">End node</span><span></span></div>';
    return '<div class="rows">' + head + t.edges.map((e, i) =>
      '<div class="row edge"><input type="text" class="mono" data-path="templates.' + ti + '.edges.' + i + '.id" value="' + esc(e.id) + '" placeholder="AB" />' +
        '<select data-path="templates.' + ti + '.edges.' + i + '.startNode">' + optionTags(nodeOpts, e.startNode) + '</select>' +
        '<select data-path="templates.' + ti + '.edges.' + i + '.endNode">' + optionTags(nodeOpts, e.endNode) + '</select>' + delBtn('edge:del', i) + '</div>').join('') + '</div>';
  }
  function stepsHTML(t, ti, refOpts) {
    if (!t.steps.length) return '<div class="empty">No steps yet. A step attaches actions/attributes to a node or edge.</div>';
    return t.steps.map((s, si) => {
      const isEdge = s.type === 'edge';
      return '<div class="subsection"><div class="subsection-head" data-act="collapse"><span class="chev">' + I.chev + '</span>' +
        '<span class="title"><span class="badge ' + (isEdge ? 'edge' : 'node') + '">' + (isEdge ? 'EDGE' : 'NODE') + '</span> Step ' + (si + 1) +
          ' <span class="muted mono">' + esc(s.reference || '—') + '</span></span>' +
        '<span class="row-actions" data-stop>' + iconBtnIdx('step:up', I.up, si, 'Move up') + iconBtnIdx('step:down', I.down, si, 'Move down') +
          iconBtnIdx('step:del', I.trash, si, 'Delete step', 'btn-danger-ghost') + '</span></div>' +
        '<div class="subsection-body"><div class="grid-2">' +
          '<div class="field"><label>Reference</label><select data-path="templates.' + ti + '.steps.' + si + '.reference">' + optionTags(refOpts, s.reference) + '</select></div>' +
          '<div class="field"><label>Type</label><select data-path="templates.' + ti + '.steps.' + si + '.type">' + optionTags(['node', 'edge'], s.type) + '</select></div></div>' +
          actionsHTML(s, ti, si) + attributesHTML(s.attributes, 'templates.' + ti + '.steps.' + si + '.attributes', si) + '</div></div>';
    }).join('');
  }
  function actionsHTML(s, ti, si) {
    const head = '<div class="card-head" style="padding:6px 0;border:0;"><h4 style="font-size:13px;">Actions <span class="sub">' + s.actions.length + '</span></h4>' +
      '<button class="btn btn-secondary btn-sm" data-act="act:add" data-s="' + si + '">' + I.plus + '<span>Add action</span></button></div>';
    const body = !s.actions.length
      ? '<div class="muted" style="font-size:12px;padding:2px 0 8px;">No actions (typical for plain navigation nodes/edges).</div>'
      : s.actions.map((a, ai) => {
        const ths = a.targetHandlingStationCondition;
        return '<div class="subsection" style="margin-bottom:10px;"><div class="subsection-head" data-act="collapse"><span class="chev">' + I.chev + '</span>' +
          '<span class="title">' + I.code + ' <span class="mono">' + esc(a.actionName || 'action') + '</span></span>' +
          '<span class="row-actions" data-stop>' + iconBtn2('act:del', I.trash, si, ai, 'Delete action', 'btn-danger-ghost') + '</span></div>' +
          '<div class="subsection-body"><div class="grid-2">' +
            '<div class="field"><label>Action name</label><input type="text" class="mono" data-path="templates.' + ti + '.steps.' + si + '.actions.' + ai + '.actionName" value="' + esc(a.actionName) + '" placeholder="$PICK" /></div>' +
            '<div class="field"><label>Blocking type</label><select data-path="templates.' + ti + '.steps.' + si + '.actions.' + ai + '.blockingType">' + optionTags(BLOCKING_TYPES, a.blockingType) + '</select></div></div>' +
            '<div class="field"><label>Action parameters</label>' + paramsHTML(a.actionParameters, 'templates.' + ti + '.steps.' + si + '.actions.' + ai + '.actionParameters', si, ai) +
              '<button class="btn btn-secondary btn-sm inline-add" data-act="param:add" data-s="' + si + '" data-a="' + ai + '">' + I.plus + '<span>Add parameter</span></button>' +
              '<div class="hint">Set <b>Value</b> to a placeholder token (e.g. <span class="mono">DROP_CONTAINERX_A</span>). Mappings supply the real value.</div></div>' +
            thsHTML(ths, ti, si, ai) + '</div></div>';
      }).join('');
    return '<div style="margin-top:6px;">' + head + body + '</div>';
  }
  function paramsHTML(params, basePath, si, ai) {
    if (!params || !params.length) return '<div class="muted" style="font-size:12px;margin:4px 0;">No parameters.</div>';
    const head = '<div class="row kvt" style="border:0;background:transparent;padding:2px 8px;"><span class="row-label">Key</span><span class="row-label">Value / placeholder</span><span class="row-label">Data type</span><span></span></div>';
    return '<div class="rows">' + head + params.map((p, i) =>
      '<div class="row kvt"><input type="text" class="mono" data-path="' + basePath + '.' + i + '.key" value="' + esc(p.key) + '" placeholder="containerX" />' +
        '<input type="text" class="mono" data-path="' + basePath + '.' + i + '.value" data-token data-orig="' + esc(p.value) + '" value="' + esc(p.value) + '" placeholder="DROP_CONTAINERX_A" />' +
        '<select data-path="' + basePath + '.' + i + '.dataType">' + optionTags(DATA_TYPES, p.dataType || 'string') + '</select>' +
        '<button class="btn btn-ghost btn-icon btn-sm btn-danger-ghost" data-act="param:del" data-s="' + si + '" data-a="' + ai + '" data-i="' + i + '" title="Remove">' + I.trash + '</button></div>').join('') + '</div>';
  }
  function thsHTML(ths, ti, si, ai) {
    if (!ths) return '<div class="field"><label>Target handling station condition</label><button class="btn btn-outline btn-sm" data-act="ths:on" data-s="' + si + '" data-a="' + ai + '">' + I.plus + '<span>Add condition</span></button></div>';
    const loadedVal = ths.loaded === null || ths.loaded === undefined ? 'null' : (ths.loaded ? 'true' : 'false');
    return '<div class="field"><label>Target handling station condition</label><div class="subsection"><div class="subsection-body"><div class="grid-2">' +
        '<div class="field" style="margin:0;"><label>External ID</label><input type="text" class="mono" data-path="templates.' + ti + '.steps.' + si + '.actions.' + ai + '.targetHandlingStationCondition.externalId" data-token data-orig="' + esc(ths.externalId || '') + '" value="' + esc(ths.externalId || '') + '" placeholder="DROP_EXTERNAL_STATION_ID_A" /></div>' +
        '<div class="field" style="margin:0;"><label>Loaded</label><select data-path="templates.' + ti + '.steps.' + si + '.actions.' + ai + '.targetHandlingStationCondition.loaded" data-type="ths-loaded">' +
          optionTags([{ value: 'null', label: 'null (any)' }, { value: 'true', label: 'true (loaded)' }, { value: 'false', label: 'false (empty)' }], loadedVal) + '</select></div></div>' +
        '<div style="margin-top:10px;"><button class="btn btn-ghost btn-sm btn-danger-ghost" data-act="ths:off" data-s="' + si + '" data-a="' + ai + '">' + I.trash + '<span>Remove condition</span></button></div></div></div></div>';
  }
  function attributesHTML(attrs, basePath, si) {
    const head = '<div class="card-head" style="padding:6px 0;border:0;"><h4 style="font-size:13px;">Attributes <span class="sub">' + (attrs ? attrs.length : 0) + '</span></h4>' +
      '<button class="btn btn-secondary btn-sm" data-act="attr:add" data-s="' + si + '">' + I.plus + '<span>Add attribute</span></button></div>';
    let body;
    if (!attrs || !attrs.length) body = '<div class="muted" style="font-size:12px;padding:2px 0 4px;">No attributes (e.g. mapTheta, orientation…).</div>';
    else {
      const labels = '<div class="row kv" style="border:0;background:transparent;padding:2px 8px;"><span class="row-label">Key</span><span class="row-label">Value / placeholder</span><span></span></div>';
      body = '<div class="rows">' + labels + attrs.map((at, i) =>
        '<div class="row kv"><input type="text" class="mono" data-path="' + basePath + '.' + i + '.key" value="' + esc(at.key) + '" placeholder="mapTheta" />' +
          '<input type="text" class="mono" data-path="' + basePath + '.' + i + '.value" data-token data-orig="' + esc(at.value) + '" value="' + esc(at.value) + '" placeholder="MAPTHETA_A" />' +
          '<button class="btn btn-ghost btn-icon btn-sm btn-danger-ghost" data-act="attr:del" data-s="' + si + '" data-i="' + i + '" title="Remove">' + I.trash + '</button></div>').join('') + '</div>';
    }
    return '<div style="margin-top:6px;">' + head + body + '</div>';
  }

  // ====================================================== MAPPINGS: sidebar
  function mappingSidebarHTML() {
    const n = state.sel.size;
    const selBar = n > 0
      ? '<div class="sel-bar"><span><b>' + n + '</b> selected</span><span class="row-actions">' +
          '<button class="btn btn-ghost btn-sm" data-act="sel:clear">Clear</button>' +
          '<button class="btn btn-ghost btn-sm btn-danger-ghost" data-act="bulk:del">' + I.trash + '<span>Delete</span></button></span></div>' : '';
    const fromMap = curGraph()
      ? '<button class="btn btn-ghost btn-icon btn-sm" data-act="map:generate" title="Generate mappings from the map (edges + handling stations)">' + I.refresh + '</button>' : '';
    return '<aside class="sidebar"><div class="sidebar-head"><h2>Mappings</h2><div class="row-actions">' +
        fromMap +
        '<button class="btn btn-ghost btn-icon btn-sm" data-act="rename:all" title="Auto-rename ALL mapping IDs from their template + node values">' + I.wand + '</button>' +
        btn('map:add', I.plus, 'Add', 'btn-secondary btn-sm') + '</div></div>' +
      '<div class="sidebar-search"><input type="text" placeholder="Search mappings…" data-search="m" value="' + esc(state.mSearch) + '" /></div>' +
      selBar + '<div class="sidebar-list">' + mappingListItems() + '</div></aside>';
  }
  function mappingItemHTML(m, i) {
    const active = (i === state.mi && state.sel.size < 2) ? ' active' : '';
    const seld = state.sel.has(m) ? ' selected-row' : '';
    return '<div class="list-item' + active + seld + '" data-act="map:select" data-i="' + i + '">' +
      '<input type="checkbox" class="li-check" data-act="map:toggle" data-i="' + i + '"' + (state.sel.has(m) ? ' checked' : '') + ' title="Select for bulk edit" />' +
      '<span class="li-dot ' + (m.actionMapping ? 'edge' : 'node') + '"></span>' +
      '<div class="li-main"><div class="li-title">' + esc(m.id) + '</div><div class="li-sub">' + (m.entries ? m.entries.length : 0) + ' entries · ' + esc(m.navigationGraphId || 'no graph') + '</div></div></div>';
  }
  function groupHeadHTML(label, items, tplKey, canAdd) {
    const all = items.length > 0 && items.every((x) => state.sel.has(x.m));
    return '<div class="group-head"><input type="checkbox" class="li-check" data-act="grp:toggle" data-tpl="' + esc(tplKey) + '"' + (all ? ' checked' : '') + ' title="Select all in this group" />' +
      '<span class="group-title">' + esc(label) + '</span><span class="group-count">' + items.length + '</span>' +
      (canAdd ? '<button class="btn btn-ghost btn-icon btn-sm" data-act="map:addFor" data-tpl="' + esc(tplKey) + '" title="Add mapping for ' + esc(label) + '">' + I.plus + '</button>' : '') + '</div>';
  }
  function mappingListItems() {
    const q = state.mSearch.toLowerCase();
    const tpls = state.bundle.templates;
    const match = (m) => !q || m.id.toLowerCase().includes(q) || (m.template || '').toLowerCase().includes(q);
    const byTpl = {}; tpls.forEach((t) => { byTpl[t.id] = []; });
    const orphans = [];
    state.bundle.mappings.forEach((m, i) => { if (!match(m)) return; if (byTpl[m.template]) byTpl[m.template].push({ m, i }); else orphans.push({ m, i }); });
    let html = '';
    tpls.forEach((t) => {
      const items = byTpl[t.id];
      if (q && !items.length && !t.id.toLowerCase().includes(q)) return;
      html += groupHeadHTML(t.id, items, t.id, true);
      html += items.length ? items.map(({ m, i }) => mappingItemHTML(m, i)).join('') : '<div class="group-empty" data-act="map:addFor" data-tpl="' + esc(t.id) + '">No mappings yet — click to add one</div>';
    });
    if (orphans.length) { html += groupHeadHTML('— Orphan / unknown template', orphans, '__orphan__', false); html += orphans.map(({ m, i }) => mappingItemHTML(m, i)).join(''); }
    if (!html) html = '<div class="empty" style="margin:8px;">' + I.layers + '<p>No templates yet — add a template first.</p></div>';
    return html;
  }

  // ====================================================== MAPPINGS: detail
  function bulkDetailHTML() {
    const sel = [...state.sel];
    const tplsUsed = [...new Set(sel.map((m) => m.template))];
    const single = tplsUsed.length === 1 ? state.bundle.templates.find((t) => t.id === tplsUsed[0]) : null;
    const keys = [];
    const addK = (k) => { if (!keys.includes(k)) keys.push(k); };
    if (single) allPlaceholders(single).forEach(addK);
    sel.forEach((m) => m.entries.forEach((e) => addK(e.key)));
    const valStatus = (getter) => { const vals = sel.map(getter); const same = vals.every((v) => v === vals[0]); return { same, value: same && vals[0] != null ? vals[0] : '' }; };
    const entryStatus = (k) => valStatus((m) => { const e = m.entries.find((x) => x.key === k); return e ? e.value : undefined; });
    const chips = sel.map((m) => '<span class="badge outline">' + esc(m.id) + '</span>').join(' ');
    const tplLabel = single ? '<span class="badge node">' + esc(single.id) + '</span>' : '<span class="badge warn">' + tplsUsed.length + ' templates</span>';
    const ngid = valStatus((m) => m.navigationGraphId);
    const am = valStatus((m) => !!m.actionMapping);
    const entryRows = keys.length
      ? '<div class="rows"><div class="row kv" style="border:0;background:transparent;padding:2px 8px;"><span class="row-label">Key (placeholder)</span><span class="row-label">Value — applied to all selected</span><span></span></div>' +
        keys.map((k) => { const st = entryStatus(k); return '<div class="row kv"><input type="text" class="mono" value="' + esc(k) + '" readonly />' +
            '<input type="text" class="mono" data-bulk="entry" data-key="' + esc(k) + '" value="' + esc(st.value) + '" placeholder="' + (st.same ? 'value for all' : '(varies — type to set all)') + '" />' +
            (st.same ? '<span></span>' : '<span class="badge warn" style="align-self:center;">varies</span>') + '</div>'; }).join('') + '</div>'
      : '<div class="empty" style="padding:18px;">The selected mappings have no entries.</div>';
    return '<div class="detail-inner">' +
      '<div class="warn-banner" style="background:hsl(var(--accent));border-color:hsl(var(--border));color:inherit;">' + I.layers +
        '<div>Bulk editing <b>' + sel.length + ' mappings</b> ' + tplLabel + '. Type in any field to set it on <b>all</b> selected.</div></div>' +
      '<div class="card"><div class="card-head"><h3>' + I.layers + 'Selected mappings</h3><div class="row-actions">' +
          '<button class="btn btn-outline btn-sm" data-act="rename:selected">' + I.wand + '<span>Auto-rename IDs</span></button>' +
          '<button class="btn btn-ghost btn-sm" data-act="sel:clear">Clear selection</button>' +
          '<button class="btn btn-outline btn-sm btn-danger-ghost" data-act="bulk:del">' + I.trash + '<span>Delete selected</span></button></div></div>' +
        '<div class="card-body"><div class="chips">' + chips + '</div></div></div>' +
      '<div class="card"><div class="card-head"><h3>Common fields</h3></div><div class="card-body"><div class="grid-2">' +
        '<div class="field"><label>Navigation graph ID</label><input type="text" class="mono" data-bulk="ngid" value="' + esc(ngid.value) + '" placeholder="' + (ngid.same ? 'tusk' : '(varies)') + '" /></div>' +
        '<div class="field"><label>Action mapping</label><select data-bulk="actionMapping"><option value="__leave__">— leave unchanged' + (am.same ? ' (' + am.value + ')' : ' (varies)') + '</option>' +
          '<option value="true">set all → true</option><option value="false">set all → false</option></select></div></div></div></div>' +
      '<div class="card"><div class="card-head"><h3>' + I.wand + 'Entry values <span class="sub">' + keys.length + ' keys</span></h3>' +
        (single ? '<button class="btn btn-outline btn-sm" data-act="bulk:fill">' + I.wand + '<span>Fill keys from template</span></button>' : '') +
        '</div><div class="card-body tight">' + entryRows + '</div></div></div>';
  }

  function mappingDetailHTML() {
    if (state.sel.size >= 2) return bulkDetailHTML();
    const map = state.bundle.mappings;
    if (!map.length) {
      const genHint = curGraph() ? '<div class="spacer-8"></div>' + btn('map:generate', I.refresh, 'Generate from map', 'btn-outline') : '';
      return '<div class="detail-inner">' + overviewStatsHTML() +
        '<div class="empty">' + I.layers + '<p class="big">No mappings yet</p>' +
        '<p>A mapping fills a template’s placeholders with real values for a specific node/edge.</p>' +
        '<div class="spacer-8"></div>' + btn('map:add', I.plus, 'Add your first mapping', 'btn-primary') + genHint + '</div></div>';
    }
    if (state.mi >= map.length) state.mi = map.length - 1;
    const m = map[state.mi], mi = state.mi;
    const tplIds = state.bundle.templates.map((t) => t.id);
    const tpl = state.bundle.templates.find((t) => t.id === m.template);
    const cond = m.conditions;
    let coverage = '';
    if (tpl) {
      const need = allPlaceholders(tpl);
      const have = new Set((m.entries || []).map((e) => e.key));
      const missing = need.filter((k) => !have.has(k));
      if (missing.length) coverage = '<div class="warn-banner">' + I.warn + '<div>This template expects values for: ' +
        missing.map((k) => '<span class="mono">' + esc(k) + '</span>').join(', ') +
        '. <button class="btn btn-outline btn-sm" style="margin-left:6px;" data-act="entry:fill">' + I.wand + '<span>Fill keys from template</span></button></div></div>';
    } else if (m.template) {
      coverage = '<div class="warn-banner">' + I.warn + '<div>Template <span class="mono">' + esc(m.template) + '</span> was not found (orphan mapping).</div></div>';
    }
    return '<div class="detail-inner">' + coverage +
      '<div class="card"><div class="card-head"><h3>' + I.layers + 'Mapping</h3><div class="row-actions">' +
          '<span class="dup-group" title="How many copies to make"><label>×</label><input type="number" min="1" max="200" value="' + (state.dupN || 1) + '" data-dupcount /></span>' +
          btnIdx('map:dup', I.copy, 'Duplicate', 'btn-outline btn-sm', mi) +
          btnIdx('map:del', I.trash, 'Delete', 'btn-outline btn-sm btn-danger-ghost', mi) + '</div></div>' +
        '<div class="card-body"><div class="field"><label>Mapping ID</label>' +
          '<div class="id-row"><input type="text" class="mono" data-path="mappings.' + mi + '.id" data-refresh="list" value="' + esc(m.id) + '" placeholder="TUSK_PICKUP_0003_mapping" />' +
            '<button class="btn btn-outline btn-sm" data-act="rename:one" data-i="' + mi + '" title="Rebuild ID from template + node values">' + I.wand + '<span>Auto</span></button></div>' +
          '<div class="hint">Auto-built as <span class="mono">&lt;template&gt;_&lt;node values&gt;_mapping</span>.</div></div>' +
          '<div class="field"><label>Navigation graph ID</label><input type="text" class="mono" data-path="mappings.' + mi + '.navigationGraphId" value="' + esc(m.navigationGraphId) + '" placeholder="tusk" /></div>' +
          '<div class="grid-2"><div class="field"><label>Template</label><select data-path="mappings.' + mi + '.template" data-refresh="all">' + optionTags(tplIds, m.template) + '</select></div>' +
            '<div class="field"><label>Action mapping</label><div style="height:36px;display:flex;align-items:center;"><label class="switch"><input type="checkbox" data-path="mappings.' + mi + '.actionMapping" data-type="bool"' + (m.actionMapping ? ' checked' : '') + ' /><span class="track"></span><span class="muted" style="font-size:12px;">' + (m.actionMapping ? 'true' : 'false') + '</span></label></div></div></div></div></div>' +
      conditionsHTML(cond, mi) +
      '<div class="card"><div class="card-head"><h3>' + I.wand + 'Entries (the values you type) <span class="sub">' + (m.entries ? m.entries.length : 0) + '</span></h3><div class="row-actions">' +
          (tpl ? '<button class="btn btn-outline btn-sm" data-act="entry:fill">' + I.wand + '<span>Fill from template</span></button>' : '') +
          '<button class="btn btn-secondary btn-sm" data-act="entry:add">' + I.plus + '<span>Add entry</span></button></div></div>' +
        '<div class="card-body tight">' + entriesHTML(m, mi) + '</div></div></div>';
  }

  function isThetaKey(key) { return /theta/i.test(key || ''); }
  function paramDataType(m, key) {
    const tpl = state.bundle.templates.find((t) => t.id === m.template);
    if (!tpl) return null;
    for (const s of tpl.steps || []) for (const a of s.actions || []) for (const p of a.actionParameters || []) if (p.value === key) return p.dataType || null;
    return null;
  }
  function entryPlaceholder(m, key) {
    if (isThetaKey(key)) return 'e.g. 1.57  (−π … π)';
    const dt = paramDataType(m, key);
    if (dt === 'string') return '';
    if (dt === 'boolean') return 'true or false';
    if (dt === 'number') return 'e.g. 20.5';
    return '';
  }
  const THETA_LIMIT = 3.14159265359;
  const THETA_MSG = 'The value must be in range from -3.14159265359 to 3.14159265359.';
  function thetaError(v) { const s = String(v == null ? '' : v).trim(); if (s === '') return null; const n = Number(s); if (!isFinite(n) || n < -THETA_LIMIT || n > THETA_LIMIT) return THETA_MSG; return null; }
  function roundTheta(v) { const n = Number(String(v).trim()); if (!isFinite(n)) return v; return String(parseFloat(n.toFixed(2))); }
  function showRowError(el, msg) { const row = el.closest('.row'); if (!row) return; let next = row.nextElementSibling; if (!next || !next.classList.contains('field-error')) { next = document.createElement('div'); next.className = 'field-error'; row.insertAdjacentElement('afterend', next); } next.textContent = msg; }
  function clearRowError(el) { const row = el.closest('.row'); if (!row) return; const next = row.nextElementSibling; if (next && next.classList.contains('field-error')) next.remove(); }

  function entriesHTML(m, mi) {
    if (!m.entries || !m.entries.length) return '<div class="empty" style="padding:22px;">No entries yet. Click <b>Fill from template</b> to auto-create the keys, then type each value.</div>';
    const head = '<div class="row kv" style="border:0;background:transparent;padding:2px 8px;"><span class="row-label">Key (placeholder)</span><span class="row-label">Value</span><span></span></div>';
    return '<div class="rows">' + head + m.entries.map((e, i) => {
      const theta = isThetaKey(e.key);
      const err = theta ? thetaError(e.value) : null;
      const valAttrs = theta ? ' data-kind="theta" inputmode="decimal" title="Must be between −π and π; rounded to 2 decimals"' : '';
      return '<div class="row kv"><input type="text" class="mono" data-path="mappings.' + mi + '.entries.' + i + '.key" value="' + esc(e.key) + '" placeholder="DROP_CONTAINERX_A" />' +
        '<input type="text" class="mono' + (err ? ' invalid' : '') + '" data-path="mappings.' + mi + '.entries.' + i + '.value"' + valAttrs + ' value="' + esc(e.value) + '" placeholder="' + esc(entryPlaceholder(m, e.key)) + '" />' +
        '<button class="btn btn-ghost btn-icon btn-sm btn-danger-ghost" data-act="entry:del" data-i="' + i + '" title="Remove">' + I.trash + '</button></div>' +
        (err ? '<div class="field-error">' + esc(err) + '</div>' : '');
    }).join('') + '</div>';
  }
  function conditionsHTML(cond, mi) {
    if (!cond) return '<div class="card"><div class="card-head"><h3>Conditions <span class="sub">optional · not set</span></h3>' +
        '<button class="btn btn-outline btn-sm" data-act="cond:on">' + I.plus + '<span>Add conditions</span></button></div>' +
        '<div class="card-body"><div class="muted" style="font-size:12px;">Optional — exported as <span class="mono">"conditions": null</span> when off.</div></div></div>';
    const f = (key, label, ph) => '<div class="field"><label>' + label + '</label><input type="text" data-path="mappings.' + mi + '.conditions.' + key + '" data-type="csv" value="' + esc((cond[key] || []).join(', ')) + '" placeholder="' + ph + '" /><div class="hint">Comma-separated (optional).</div></div>';
    return '<div class="card"><div class="card-head"><h3>Conditions <span class="sub">optional</span></h3><button class="btn btn-ghost btn-sm btn-danger-ghost" data-act="cond:off">' + I.trash + '<span>Remove (set to null)</span></button></div>' +
      '<div class="card-body"><div class="grid-2">' + f('milestoneTypes', 'Milestone types', 'PICKUP, DROPOFF') + f('targetActions', 'Target actions', '') + f('agvTypes', 'AGV types', '') + f('usages', 'Usages', '') + '</div></div></div>';
  }

  // -------------------------------------------------------------- modals
  function samplesModalHTML() {
    const samples = allSamples();
    const items = samples.map((s, idx) => {
      const b = s.bundle || {};
      return '<div class="sample-item" data-act="sample:edit" data-i="' + idx + '">' +
        '<div class="sample-main"><div class="sample-name">' + esc(s.name) + (s.builtIn ? ' <span class="badge outline">built-in</span>' : ' <span class="badge outline">custom</span>') + '</div>' +
        '<div class="sample-sub">' + (b.templates || []).length + ' templates · ' + (b.mappings || []).length + ' mappings</div></div>' +
        (s.builtIn ? '' : '<button class="btn btn-ghost btn-icon btn-sm btn-danger-ghost" data-act="sample:del" data-name="' + esc(s.name) + '" title="Delete this saved sample">' + I.trash + '</button>') + '</div>';
    }).join('');
    return '<div class="modal-overlay" data-act="samples:close"><div class="modal" data-stop style="width:min(560px,100%);">' +
      '<div class="modal-head"><h3>' + I.box + ' Sample route templates</h3><button class="btn btn-ghost btn-icon" data-act="samples:close" title="Close">✕</button></div>' +
      '<div class="modal-body" style="padding:14px 18px;"><div class="muted" style="font-size:12px;margin-bottom:10px;">Click one to open it in the editor (templates + mappings). Built-in samples open as a copy you can re-save under a new name.</div>' +
        '<div class="sample-list">' + items + '</div></div></div></div>';
  }
  function saveDialogHTML() {
    const g = curGraph();
    const def = state.editingSample ? state.editingSample.name : (g ? g.graphId + ' route templates' : 'Sample - ' + today());
    return '<div class="modal-overlay" data-act="save:close"><div class="modal" data-stop style="width:min(520px,100%);">' +
      '<div class="modal-head"><h3>' + I.save + ' Save as sample</h3><button class="btn btn-ghost btn-icon" data-act="save:close" title="Close">✕</button></div>' +
      '<div class="modal-body" style="padding:16px 18px;"><div style="font-size:13px;margin-bottom:12px;">Save the current templates + mappings as a reusable sample (appears under <b>Samples</b> on this PC).</div>' +
        '<div class="field" style="margin:0;"><label>Sample name</label><input type="text" id="sample-name-input" value="' + esc(def) + '" placeholder="My sample" /></div></div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" data-act="save:close">Cancel</button>' +
        '<button class="btn btn-primary" data-act="save:confirm">' + I.box + '<span>Save sample</span></button></div></div></div>';
  }
  // pick-which-graph export dialog
  function exportModalHTML() {
    const rows = state.graphs.map((g, i) => {
      if (g.noRouteTemplate) {
        return '<div class="sample-item" style="opacity:.55;cursor:default;">' +
          '<input type="checkbox" class="li-check" tabindex="-1" disabled />' +
          '<div class="sample-main"><div class="sample-name">' + esc(g.graphId) + '</div>' +
          '<div class="sample-sub">no route template — skipped</div></div><span class="gp-badge none">no template</span></div>';
      }
      const checked = state.exportSel.has(i) ? ' checked' : '';
      const badge = g.matched ? '<span class="gp-badge ok">' + I.check + 'matched</span>' : '<span class="gp-badge warn">' + I.warn + 'new</span>';
      return '<div class="sample-item" data-act="export:toggle" data-i="' + i + '">' +
        '<input type="checkbox" class="li-check" tabindex="-1"' + checked + ' />' +
        '<div class="sample-main"><div class="sample-name">' + esc(g.graphId) + '</div>' +
        '<div class="sample-sub">' + g.bundle.templates.length + ' templates · ' + g.bundle.mappings.length + ' mappings → ' + esc(graphFileName(g)) + '</div></div>' + badge + '</div>';
    }).join('');
    const mapRow = state.map ? '<div class="sample-item" data-act="export:map">' +
      '<input type="checkbox" class="li-check" tabindex="-1"' + (state.exportMap ? ' checked' : '') + ' />' +
      '<div class="sample-main"><div class="sample-name">Map (full navigation map)</div>' +
      '<div class="sample-sub">' + (state.map.navigationGraphs || []).length + ' graphs · ' + allStations().length + ' stations → ' + esc(mapFileName()) + '</div></div>' + I.map + '</div>' : '';
    const depsRow = state.deps.length ? '<div class="sample-item" data-act="export:deps">' +
      '<input type="checkbox" class="li-check" tabindex="-1"' + (state.exportDeps ? ' checked' : '') + ' />' +
      '<div class="sample-main"><div class="sample-name">Reservation dependencies</div>' +
      '<div class="sample-sub">' + state.deps.length + ' dependenc' + (state.deps.length === 1 ? 'y' : 'ies') + ' → ' + esc(depsFileName()) + '</div></div>' + I.link + '</div>' : '';
    const n = state.exportSel.size + (state.map && state.exportMap ? 1 : 0) + (state.deps.length && state.exportDeps ? 1 : 0);
    return '<div class="modal-overlay" data-act="export:close"><div class="modal" data-stop style="width:min(600px,100%);">' +
      '<div class="modal-head"><h3>Export</h3><button class="btn btn-ghost btn-icon" data-act="export:close" title="Close">✕</button></div>' +
      '<div class="modal-body" style="padding:14px 18px;"><div class="muted" style="font-size:12px;margin-bottom:10px;">Pick what to export. Each item becomes one file, written into the folder you choose next.</div>' +
        '<div class="sample-list">' + mapRow + depsRow + rows + '</div></div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" data-act="export:close">Cancel</button>' +
        '<button class="btn btn-primary" data-act="export:confirm"' + (n ? '' : ' disabled') + '>' + I.download + '<span>Export ' + n + ' file' + (n === 1 ? '' : 's') + '</span></button></div></div></div>';
  }
  function mapFileName() { const base = safeName(String(state.mapName || (state.map && state.map.name) || 'map').replace(/\.json$/i, '')); return base + '_map_' + today() + '.json'; }
  // Docked, live-updating JSON panel on the right of the editor.
  function previewPanelHTML() {
    const json = JSON.stringify(canonicalize(state.bundle), null, 2);
    const who = curGraph() ? esc(curGraph().graphId) : (state.editingSample ? esc(state.editingSample.name) : '');
    return '<aside class="preview-panel">' +
      '<div class="preview-head"><h3>' + (who ? who + ' — ' : '') + 'route-template JSON</h3>' +
        '<div class="row-actions">' +
          '<button class="btn btn-ghost btn-icon btn-sm" data-act="copyjson" title="Copy to clipboard">' + I.copy + '</button>' +
          '<button class="btn btn-ghost btn-icon btn-sm" data-act="preview:close" title="Close preview">✕</button>' +
        '</div></div>' +
      '<div class="preview-body"><pre class="mono" id="preview-pre">' + esc(json) + '</pre></div></aside>';
  }
  function mapPreviewHTML() {
    const json = JSON.stringify(canonicalizeMap(state.map), null, 2);
    return '<div class="modal-overlay" data-act="preview:close"><div class="modal" data-stop>' +
      '<div class="modal-head"><h3>' + esc(state.mapName || 'map') + ' — map JSON</h3><button class="btn btn-ghost btn-icon" data-act="preview:close" title="Close">✕</button></div>' +
      '<div class="modal-body"><pre class="mono">' + esc(json) + '</pre></div>' +
      '<div class="modal-foot"><button class="btn btn-outline" data-act="copyMapJson">' + I.copy + '<span>Copy</span></button>' +
        '<button class="btn btn-primary" data-act="exportAll">' + I.download + '<span>Export</span></button></div></div></div>';
  }

  // ===========================================================================
  // ACTIONS
  // ===========================================================================
  function curTpl() { return state.bundle.templates[state.ti]; }
  function curMap() { return state.bundle.mappings[state.mi]; }
  function tplStruct(mutate) { const t = curTpl(); if (!t) return; const before = placeholderSet(t); mutate(t); propagateDiff(t, before); persist(); render(); }

  function handleAction(act, ctx) {
    const i = ctx.i, s = ctx.s, a = ctx.a;
    switch (act) {
      // ---- landing / global ----
      case 'loadMap': doLoadMap(); return;
      case 'loadExample': loadMapData(clone(window.EXAMPLE_MAP), 'example map'); return;
      case 'resume': { const sess = loadSession(); if (sess) { state.map = normalizeMap(sess.map); state.mapName = sess.mapName || 'map'; state.graphs = sess.graphs; state.gi = sess.gi || 0; state.deps = normalizeDeps(sess.deps); state.editingSample = null; resetEditState(); if (sess.mapEd) { if (Number.isFinite(sess.mapEd.decimals)) state.mapEd.decimals = sess.mapEd.decimals; state.mapEd.ungroupedStations = Array.isArray(sess.mapEd.ungroupedStations) ? sess.mapEd.ungroupedStations : []; state.mapEd.bg = sess.mapEd.bg || null; } state.view = 'route'; state.mapEd._fitted = false; render(); } return; }
      case 'theme': toggleTheme(); return;
      case 'home': {
        // Back to the start screen. Work is saved first, so "Resume last session" restores it.
        if (state.view === 'map' && state.map) reconcileGraphsAfterMapEdit();
        clearTimeout(saveTimer); persistNow();
        state.map = null; state.mapName = ''; state.graphs = []; state.gi = 0; state.deps = [];
        state.editingSample = null; state.preview = false; state.samplesModal = false; state.saveDialog = false; state.exportModal = false;
        const ed = state.mapEd;
        ed.selset = []; ed.dialog = null; ed.areaDraft = null; ed.edgeFrom = null; ed.depSel = null; ed.depPickFrom = false; ed.wsSel = null;
        ed.viewMenu = false; ed.translatePanel = false; ed.overlap = null; ed.mode = 'select'; ed.ungroupedStations = []; ed.bg = null; ed._fitted = false; ed._dirty = false;
        resetEditState();
        state.view = 'landing';
        render();
        toast('Back at the main menu', 'Your work is saved — “Resume last session” brings it back.', 'success');
        return;
      }
      case 'preview': state.preview = !state.preview; render(); return;
      case 'preview:close': state.preview = false; render(); return;
      case 'copyjson': copyJSON(); return;

      // ---- map editor: entry / navigation ----
      case 'newMap': { state.map = normalizeMap(emptyMap()); state.map.navigationGraphs.push(newGraph('graph1')); state.mapName = 'untitled map'; state.deps = []; state.mapEd.depSel = null; state.mapEd.depPickFrom = false; state.mapEd.wsSel = null; state.mapEd.overlap = null; state.mapEd.gi = 0; state.mapEd.selset = []; state.mapEd.mode = 'select'; state.mapEd.ungroupedStations = []; state.mapEd.bg = null; state.mapEd._fitted = false; state.mapEd._dirty = true; state.preview = false; reconcileGraphsAfterMapEdit(); state.view = 'map'; persist(); render(); return; }
      case 'mapEdit': { if (!state.map) { toast('No map', 'Load or create a map first.', 'error'); return; } collectUngrouped(); state.mapEd._fitted = false; state.preview = false; state.view = 'map'; render(); return; }
      case 'route': { if (state.map) { const r = reconcileGraphsAfterMapEdit(); if (state.mapEd._dirty) { toast('Map applied', r.kept + ' graph(s) kept · ' + r.added + ' new', 'success'); state.mapEd._dirty = false; } } state.preview = false; state.view = 'route'; render(); return; }
      case 'copyMapJson': { const j = JSON.stringify(canonicalizeMap(state.map), null, 2); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(j).then(() => toast('Copied', '', 'success'), () => {}); return; }

      // ---- map editor: tools ----
      case 'mapMode': { const m2 = ctx.el.dataset.mode; state.mapEd.mode = (state.mapEd.mode === m2 && m2 !== 'select') ? 'select' : m2; // clicking the active tool again toggles back to Select (closes its panel)
        state.mapEd.edgeFrom = null; state.mapEd.depPickFrom = false; state.mapEd.overlap = null; if (state.mapEd.mode !== 'area' && state.mapEd.mode !== 'earea') state.mapEd.areaDraft = null; render(); return; }
      case 'mapGraphSel': { state.mapEd.gi = +ctx.el.value || 0; state.mapEd.selset = []; state.mapEd.edgeFrom = null; state.mapEd.overlap = null; render(); return; }
      case 'graphAdd': { const used = new Set(state.map.navigationGraphs.map((g) => g.id)); let i = 1, id; do { id = 'graph' + i; i++; } while (used.has(id)); state.map.navigationGraphs.push(newGraph(id)); state.mapEd.gi = state.map.navigationGraphs.length - 1; state.mapEd.dialog = { kind: 'graph', id }; mapDirty(); persist(); render(); return; }
      case 'graphRemove': { const g = mapGraph(); if (!g) return; if (!confirm('Remove graph "' + g.id + '" with its nodes and edges?')) return; cleanAccessNodes(g.id); state.map.navigationGraphs.splice(state.mapEd.gi, 1); if (state.mapEd.gi >= state.map.navigationGraphs.length) state.mapEd.gi = Math.max(0, state.map.navigationGraphs.length - 1); state.mapEd.selset = []; mapDirty(); persist(); render(); return; }
      case 'graphTranslate': { if (mapGraph()) { state.mapEd.translatePanel = !state.mapEd.translatePanel; render(); } return; }
      case 'graphEditFull': { const g = mapGraph(); if (g) { state.mapEd.dialog = { kind: 'graph', id: g.id }; render(); } return; }
      case 'trans': { const g = mapGraph(); if (g) { const v = +ctx.el.value || 0, ax = ctx.el.dataset.axis; if (ax === 'x') g.graphToMapTransformation.xTranslation = v; else if (ax === 'y') g.graphToMapTransformation.yTranslation = v; else g.graphToMapTransformation.zRotation = v; mapDirty(); persist(); paintCanvas(); } return; }
      case 'edgeBidir': { state.mapEd.edgeBidir = !!ctx.el.checked; return; }
      case 'areaFinish': finishArea(); return;
      case 'decimals': { state.mapEd.decimals = Math.max(0, Math.min(6, parseInt(ctx.el.value, 10) || 0)); persist(); const box = document.getElementById('map-info'); if (box) box.innerHTML = mapInfoInner(); return; }
      case 'gridToggle': { state.mapEd.grid = !!ctx.el.checked; paintCanvas(); return; }
      case 'coordsToggle': { state.mapEd.coords = !!ctx.el.checked; paintCanvas(); return; }
      case 'mapClearSel': { state.mapEd.selset = []; state.mapEd.overlap = null; render(); return; }
      case 'viewMenu': { state.mapEd.viewMenu = !state.mapEd.viewMenu; render(); return; }

      // ---- overlapping-objects picker ----
      case 'ovSelect': { setSel({ type: ctx.el.dataset.t, id: ctx.el.dataset.n, graphId: ctx.el.dataset.g || undefined }); render(); return; }
      case 'ovEdit': { state.mapEd.overlap = null; openMapDialogFor({ type: ctx.el.dataset.t, id: ctx.el.dataset.n, graphId: ctx.el.dataset.g || undefined }); return; }
      case 'ovClose': { state.mapEd.overlap = null; render(); return; }
      case 'resetView': { const svg = document.getElementById('map-svg'); const st = svg ? svg.parentElement : null; fitView(st ? st.clientWidth : 800, st ? st.clientHeight : 600); paintCanvas(); return; }
      case 'mapEditSel': { const o = selOne(); if (o) openMapDialogFor(o); return; }
      case 'mapDeleteSel': deleteMapSelection(); return;
      case 'bgOpen': doOpenBackground(); return;
      case 'bgEdit': { if (state.mapEd.bg) { state.mapEd.dialog = { kind: 'bg' }; render(); } return; }
      case 'bgDelete': { state.mapEd.bg = null; persist(); render(); return; }
      case 'groupsEdit': { state.mapEd.dialog = { kind: 'groups', groupSel: (state.map.handlingStationGroups[0] || {}).id || null, availSel: null, assignedSel: null }; render(); return; }

      // ---- map editor: dialogs ----
      case 'mapDlg:ok': applyMapDialog(); return;
      case 'mapDlg:cancel': { state.mapEd.dialog = null; render(); return; }
      case 'grpSelect': { state.mapEd.dialog.groupSel = ctx.el.dataset.id; state.mapEd.dialog.assignedSel = null; render(); return; }
      case 'availSelect': { state.mapEd.dialog.availSel = ctx.el.dataset.id; render(); return; }
      case 'assignedSelect': { state.mapEd.dialog.assignedSel = ctx.el.dataset.id; render(); return; }
      case 'grpAdd': { const used = new Set(state.map.handlingStationGroups.map((g) => g.id)); let i = 1, id; do { id = 'group' + i; i++; } while (used.has(id)); state.map.handlingStationGroups.push({ id, controlled: false, justInSequence: false, stationAutomaticSelectionMode: 'ALWAYS', handlingStations: [], waitingSpots: [] }); state.mapEd.dialog.groupSel = id; mapDirty(); persist(); render(); return; }
      case 'grpDelete': { const d = state.mapEd.dialog; const gi = state.map.handlingStationGroups.findIndex((g) => g.id === d.groupSel); if (gi < 0) return; const grp = state.map.handlingStationGroups[gi]; state.mapEd.ungroupedStations.push.apply(state.mapEd.ungroupedStations, grp.handlingStations); state.map.handlingStationGroups.splice(gi, 1); d.groupSel = (state.map.handlingStationGroups[0] || {}).id || null; mapDirty(); persist(); render(); return; }
      case 'grpRename': { const d = state.mapEd.dialog; const grp = state.map.handlingStationGroups.find((g) => g.id === d.groupSel); const v = (document.getElementById('md-grpid') || {}).value; if (grp && v && !state.map.handlingStationGroups.some((g) => g.id === v)) { grp.id = v; d.groupSel = v; mapDirty(); persist(); render(); } return; }
      case 'grpControlled': { const grp = state.map.handlingStationGroups.find((g) => g.id === state.mapEd.dialog.groupSel); if (grp) { grp.controlled = !!ctx.el.checked; mapDirty(); persist(); } return; }
      case 'grpJis': { const grp = state.map.handlingStationGroups.find((g) => g.id === state.mapEd.dialog.groupSel); if (grp) { grp.justInSequence = !!ctx.el.checked; mapDirty(); persist(); } return; }
      case 'grpMode': { const grp = state.map.handlingStationGroups.find((g) => g.id === state.mapEd.dialog.groupSel); if (grp) { grp.stationAutomaticSelectionMode = ctx.el.value; mapDirty(); persist(); } return; }
      case 'grpAssign': { const d = state.mapEd.dialog; const grp = state.map.handlingStationGroups.find((g) => g.id === d.groupSel); if (!grp || !d.availSel) return; const idx = state.mapEd.ungroupedStations.findIndex((s) => s.id === d.availSel); if (idx < 0) return; grp.handlingStations.push(state.mapEd.ungroupedStations.splice(idx, 1)[0]); d.availSel = null; mapDirty(); persist(); render(); return; }
      case 'grpUnassign': { const d = state.mapEd.dialog; const grp = state.map.handlingStationGroups.find((g) => g.id === d.groupSel); if (!grp || !d.assignedSel) return; const idx = grp.handlingStations.findIndex((s) => s.id === d.assignedSel); if (idx < 0) return; state.mapEd.ungroupedStations.push(grp.handlingStations.splice(idx, 1)[0]); d.assignedSel = null; mapDirty(); persist(); render(); return; }
      case 'grpWs': { const grp = state.map.handlingStationGroups.find((g) => g.id === state.mapEd.dialog.groupSel); if (!grp) return; const id = ctx.el.dataset.id; grp.waitingSpots = grp.waitingSpots || []; if (ctx.el.checked) { if (!grp.waitingSpots.some((x) => x && x.id === id)) grp.waitingSpots.push({ id }); } else grp.waitingSpots = grp.waitingSpots.filter((x) => (x && x.id) !== id); mapDirty(); persist(); return; }

      // ---- emergency detectors ----
      case 'detectorsEdit': { state.mapEd.dialog = { kind: 'detectors' }; render(); return; }
      case 'detAdd': { const used = new Set(state.map.emergencyDetectors.map((x) => x.id)); let k = 1, id; do { id = 'detector' + k; k++; } while (used.has(id)); state.map.emergencyDetectors.push({ id, areas: [] }); mapDirty(); persist(); render(); return; }
      case 'detDel': { state.map.emergencyDetectors.splice(i, 1); mapDirty(); persist(); render(); return; }
      case 'detId': { const det = state.map.emergencyDetectors[i]; if (det) { const v = ctx.el.value.trim(); if (v && v !== det.id) { det.id = v; mapDirty(); persist(); } } return; }
      case 'detArea': { const det = state.map.emergencyDetectors[i]; if (!det) return; const aid = ctx.el.dataset.area; det.areas = det.areas || []; if (ctx.el.checked) { if (!det.areas.includes(aid)) det.areas.push(aid); } else det.areas = det.areas.filter((x) => x !== aid); mapDirty(); persist(); paintCanvas(); return; }

      // ---- reservation dependencies (deps tool) ----
      case 'depNew': { state.mapEd.depSel = null; state.mapEd.depPickFrom = false; toast('New dependency', 'Click a node on the map — it becomes the first node.', 'success'); render(); return; }
      case 'depSelect': { state.mapEd.depSel = i; state.mapEd.depPickFrom = false; render(); return; }
      case 'depClearSel': { state.mapEd.depSel = null; state.mapEd.depPickFrom = false; render(); return; }
      case 'depPickFrom': { state.mapEd.depSel = i; state.mapEd.depPickFrom = true; render(); return; }
      case 'depDup': { const src = state.deps[i]; if (!src) return; state.deps.splice(i + 1, 0, clone(src)); state.mapEd.depSel = i + 1; state.mapEd.depPickFrom = true; persist(); render(); toast('Duplicated', 'Click a node to set the copy’s first node, or edit its dependents.', 'success'); return; }
      case 'depDel': { state.deps.splice(i, 1); if (state.mapEd.depSel != null) { if (state.mapEd.depSel === i) { state.mapEd.depSel = null; state.mapEd.depPickFrom = false; } else if (state.mapEd.depSel > i) state.mapEd.depSel--; } persist(); render(); return; }
      case 'depTargetRm': { const dep = state.deps[i]; if (dep) { toggleDepTarget(dep, ctx.el.dataset.g, ctx.el.dataset.n); persist(); render(); } return; }
      case 'depsImport': doImportDeps(); return;

      // ---- waiting spots (waiting tool) ----
      case 'wsNew': { state.map.waitingSpots.push({ id: nextWsId(), nodes: [] }); state.mapEd.wsSel = state.map.waitingSpots.length - 1; mapDirty(); persist(); render(); return; }
      case 'wsSelect': { state.mapEd.wsSel = i; render(); return; }
      case 'wsClearSel': { state.mapEd.wsSel = null; render(); return; }
      case 'wsDup': { const src = state.map.waitingSpots[i]; if (!src) return; const copy = clone(src); const used = new Set(state.map.waitingSpots.map((w) => w.id)); copy.id = uniqueId(used, src.id + '_copy'); state.map.waitingSpots.splice(i + 1, 0, copy); state.mapEd.wsSel = i + 1; mapDirty(); persist(); render(); return; }
      case 'wsDel': { const w = state.map.waitingSpots[i]; if (!w) return; if (!confirm('Delete waiting spot "' + w.id + '"? It is also removed from all station groups.')) return; removeWaitingSpotRefs(w.id); state.map.waitingSpots.splice(i, 1); if (state.mapEd.wsSel != null) { if (state.mapEd.wsSel === i) state.mapEd.wsSel = null; else if (state.mapEd.wsSel > i) state.mapEd.wsSel--; } mapDirty(); persist(); render(); return; }
      case 'wsNodeRm': { const w = state.map.waitingSpots[i]; if (w) { w.nodes = (w.nodes || []).filter((n) => !(n.navigationGraphId === ctx.el.dataset.g && n.nodeId === ctx.el.dataset.n)); mapDirty(); persist(); render(); } return; }
      case 'wsId': { const w = state.map.waitingSpots[i]; if (!w) return; const v = ctx.el.value.trim(); if (!v || v === w.id) return; if (state.map.waitingSpots.some((x, xi) => xi !== i && x.id === v)) { toast('Name in use', 'Waiting-spot ids must be unique.', 'error'); ctx.el.value = w.id; return; } renameWaitingSpotRefs(w.id, v); w.id = v; mapDirty(); persist(); return; }
      case 'tab': state.tab = ctx.el.dataset.tab; render(); return;
      case 'collapse': ctx.el.closest('.subsection').classList.toggle('collapsed'); return;

      // ---- graphs ----
      case 'graph:select': if (i !== state.gi) { state.gi = i; resetEditState(); render(); } return;
      case 'base:pack': { const g = curGraph(); const pack = (window.TEMPLATE_PACKS || []).find((p) => p.key === ctx.el.dataset.key); if (g && pack) { g.bundle.templates = clone(pack.templates); g.baseChosen = true; normalize(g.bundle); persist(); render(); toast('Base loaded', pack.name, 'success'); } return; }
      case 'base:blank': { const g = curGraph(); if (g) { g.baseChosen = true; g.noRouteTemplate = false; persist(); render(); } return; }
      case 'base:none': { const g = curGraph(); if (g) { g.baseChosen = true; g.noRouteTemplate = true; state.exportSel.delete(state.gi); persist(); render(); toast('No route template', '“' + g.graphId + '” will be skipped on export.', 'success'); } return; }
      case 'graph:noTemplate': { const g = curGraph(); if (g) { g.noRouteTemplate = true; state.exportSel.delete(state.gi); persist(); render(); } return; }
      case 'graph:withTemplate': { const g = curGraph(); if (g) { g.noRouteTemplate = false; if ((g.bundle.templates || []).length === 0 && !g.matched) g.baseChosen = false; persist(); render(); } return; }
      case 'graph:saveSample': state.saveDialog = true; render(); return;
      case 'map:generate': { if (!curGraph()) return; const n = generateFromMap(); persist(); render(); toast(n ? 'Generated ' + n + ' mappings' : 'Nothing to add', n ? 'From the map’s edges & handling stations. Review the values.' : 'All map-derived mappings already exist.', 'success'); return; }
      case 'exportAll': openExport(); return;
      case 'export:toggle': { if (state.exportSel.has(i)) state.exportSel.delete(i); else state.exportSel.add(i); render(); return; }
      case 'export:map': { state.exportMap = !state.exportMap; render(); return; }
      case 'export:deps': { state.exportDeps = !state.exportDeps; render(); return; }
      case 'export:confirm': doExportSelected(); return;
      case 'export:close': state.exportModal = false; render(); return;

      // ---- samples ----
      case 'samples': state.samplesModal = true; render(); return;
      case 'samples:close': state.samplesModal = false; render(); return;
      case 'sample:edit': { const sm = allSamples()[i]; if (!sm) return; state.editingSample = { name: sm.name, bundle: normalize(clone(sm.bundle || {})), builtIn: !!sm.builtIn }; state.samplesModal = false; resetEditState(); render(); return; }
      case 'sample:del': { const name = ctx.el.dataset.name; if (!confirm('Delete saved sample "' + name + '"?')) return; const arr = loadUserSamples().filter((x) => x.name !== name); saveUserSamples(arr); render(); return; }
      case 'sample:close': state.editingSample = null; resetEditState(); render(); return;
      case 'sample:saveAs': state.saveDialog = true; render(); return;
      case 'sample:download': doDownloadSingle(); return;
      case 'save:close': state.saveDialog = false; render(); return;
      case 'save:confirm': {
        const inp = document.querySelector('#sample-name-input');
        let name = inp ? inp.value.trim() : '';
        if (!name) name = 'Sample - ' + today();
        upsertUserSample(name, state.bundle);
        if (state.editingSample) state.editingSample.name = name;
        state.saveDialog = false; render();
        toast('Sample saved', '"' + name + '" is now under Samples', 'success');
        return;
      }

      // ---- templates ----
      case 'tpl:add': { state.bundle.templates.push({ id: 'NEW_TEMPLATE', nodes: ['A'], edges: [], steps: [{ reference: 'A', type: 'node', actions: [], attributes: [] }] }); state.ti = state.bundle.templates.length - 1; pendingFocus = 'templates.' + state.ti + '.id'; persist(); render(); return; }
      case 'tpl:select': state.ti = i; render(); return;
      case 'tpl:dup': { const copy = clone(state.bundle.templates[i]); copy.id = copy.id + '_copy'; state.bundle.templates.splice(i + 1, 0, copy); state.ti = i + 1; persist(); render(); return; }
      case 'tpl:del': { const t = state.bundle.templates[i]; if (!confirm('Delete template "' + t.id + '"? Mappings that reference it become orphans.')) return; state.bundle.templates.splice(i, 1); if (state.ti >= state.bundle.templates.length) state.ti = Math.max(0, state.bundle.templates.length - 1); persist(); render(); return; }
      case 'node:add': tplStruct((t) => { t.nodes = t.nodes || []; t.nodes.push('N' + (t.nodes.length + 1)); pendingFocus = 'templates.' + state.ti + '.nodes.' + (t.nodes.length - 1); }); return;
      case 'node:del': tplStruct((t) => t.nodes.splice(i, 1)); return;
      case 'edge:add': tplStruct((t) => { const n = (t.nodes || [])[0] || ''; t.edges = t.edges || []; t.edges.push({ id: '', startNode: n, endNode: n }); }); return;
      case 'edge:del': tplStruct((t) => t.edges.splice(i, 1)); return;
      case 'step:add': tplStruct((t) => { const ref = (t.nodes || [])[0] || ''; t.steps.push({ reference: ref, type: 'node', actions: [], attributes: [] }); }); return;
      case 'step:del': tplStruct((t) => t.steps.splice(i, 1)); return;
      case 'step:up': if (i > 0) tplStruct((t) => { const a2 = t.steps;[a2[i - 1], a2[i]] = [a2[i], a2[i - 1]]; }); return;
      case 'step:down': tplStruct((t) => { const a2 = t.steps; if (i < a2.length - 1)[a2[i + 1], a2[i]] = [a2[i], a2[i + 1]]; }); return;
      case 'act:add': tplStruct((t) => t.steps[s].actions.push({ actionName: '$ACTION', blockingType: 'HARD', actionParameters: [], targetHandlingStationCondition: null })); return;
      case 'act:del': tplStruct((t) => t.steps[s].actions.splice(i, 1)); return;
      case 'param:add': tplStruct((t) => t.steps[s].actions[a].actionParameters.push({ key: '', value: '', dataType: 'string' })); return;
      case 'param:del': tplStruct((t) => t.steps[s].actions[a].actionParameters.splice(i, 1)); return;
      case 'ths:on': tplStruct((t) => { t.steps[s].actions[a].targetHandlingStationCondition = { externalId: '', loaded: null }; }); return;
      case 'ths:off': tplStruct((t) => { t.steps[s].actions[a].targetHandlingStationCondition = null; }); return;
      case 'attr:add': tplStruct((t) => t.steps[s].attributes.push({ key: '', value: '' })); return;
      case 'attr:del': tplStruct((t) => t.steps[s].attributes.splice(i, 1)); return;

      // ---- mappings ----
      case 'map:add': { const firstTpl = state.bundle.templates[0]; const m = { id: (firstTpl ? firstTpl.id : 'mapping') + '_new_mapping', template: firstTpl ? firstTpl.id : '', actionMapping: false, conditions: null, entries: [], navigationGraphId: curGraph() ? curGraph().graphId : '' }; state.bundle.mappings.push(m); state.mi = state.bundle.mappings.length - 1; state.sel.clear(); pendingFocus = 'mappings.' + state.mi + '.id'; persist(); render(); return; }
      case 'map:addFor': { const tpl = ctx.el.dataset.tpl; const m = { id: tpl + '_new_mapping', template: tpl, actionMapping: false, conditions: null, entries: [], navigationGraphId: curGraph() ? curGraph().graphId : '' }; state.bundle.mappings.push(m); state.mi = state.bundle.mappings.length - 1; state.sel.clear(); pendingFocus = 'mappings.' + state.mi + '.id'; persist(); render(); return; }
      case 'map:select': state.mi = i; render(); return;
      case 'map:toggle': { const m = state.bundle.mappings[i]; if (state.sel.has(m)) state.sel.delete(m); else state.sel.add(m); if (state.sel.size === 1) state.mi = state.bundle.mappings.indexOf([...state.sel][0]); render(); return; }
      case 'grp:toggle': { const tpl = ctx.el.dataset.tpl; const q = state.mSearch.toLowerCase(); const ids = new Set(state.bundle.templates.map((t) => t.id)); let items = state.bundle.mappings.filter((m) => tpl === '__orphan__' ? !ids.has(m.template) : m.template === tpl); if (q) items = items.filter((m) => m.id.toLowerCase().includes(q) || (m.template || '').toLowerCase().includes(q)); const allSel = items.length > 0 && items.every((m) => state.sel.has(m)); items.forEach((m) => { if (allSel) state.sel.delete(m); else state.sel.add(m); }); if (state.sel.size === 1) state.mi = state.bundle.mappings.indexOf([...state.sel][0]); render(); return; }
      case 'sel:clear': state.sel.clear(); render(); return;
      case 'bulk:del': { const n = state.sel.size; if (!n) return; if (!confirm('Delete ' + n + ' selected mapping' + (n === 1 ? '' : 's') + '?')) return; state.bundle.mappings = state.bundle.mappings.filter((m) => !state.sel.has(m)); state.sel.clear(); if (state.mi >= state.bundle.mappings.length) state.mi = Math.max(0, state.bundle.mappings.length - 1); persist(); render(); toast('Deleted', n + ' removed', 'success'); return; }
      case 'bulk:fill': { const sel = [...state.sel]; const used = [...new Set(sel.map((m) => m.template))]; if (used.length !== 1) { toast('Mixed templates', 'Select mappings of one template.', 'error'); return; } const tpl = state.bundle.templates.find((t) => t.id === used[0]); if (!tpl) { toast('Unknown template', '', 'error'); return; } const keys = allPlaceholders(tpl); let added = 0; sel.forEach((m) => { const have = new Set(m.entries.map((e) => e.key)); keys.forEach((k) => { if (!have.has(k)) { m.entries.push({ key: k, value: '' }); added++; } }); }); persist(); render(); toast(added ? 'Added ' + added + ' entries' : 'Already complete', '', 'success'); return; }
      case 'map:dup': {
        const src = state.bundle.mappings[i];
        const n = Math.max(1, Math.min(200, parseInt((document.querySelector('[data-dupcount]') || {}).value, 10) || 1));
        for (let k = 0; k < n; k++) { const copy = clone(src); copy.id = src.id + '_copy' + (k === 0 ? '' : (k + 1)); state.bundle.mappings.splice(i + 1 + k, 0, copy); }
        state.mi = i + 1; state.dupN = n; persist(); render();
        toast('Duplicated', n + ' cop' + (n === 1 ? 'y' : 'ies') + ' of "' + src.id + '"', 'success');
        return;
      }
      case 'map:del': { const m = state.bundle.mappings[i]; if (!confirm('Delete mapping "' + m.id + '"?')) return; state.sel.delete(m); state.bundle.mappings.splice(i, 1); if (state.mi >= state.bundle.mappings.length) state.mi = Math.max(0, state.bundle.mappings.length - 1); persist(); render(); return; }
      case 'entry:add': curMap().entries.push({ key: '', value: '' }); pendingFocus = 'mappings.' + state.mi + '.entries.' + (curMap().entries.length - 1) + '.key'; persist(); render(); return;
      case 'entry:del': curMap().entries.splice(i, 1); persist(); render(); return;
      case 'entry:fill': { const m = curMap(); const tpl = state.bundle.templates.find((t) => t.id === m.template); if (!tpl) { toast('No template', 'Pick a valid template first.', 'error'); return; } const have = new Set(m.entries.map((e) => e.key)); let added = 0; allPlaceholders(tpl).forEach((k) => { if (!have.has(k)) { m.entries.push({ key: k, value: '' }); added++; } }); persist(); render(); toast(added ? 'Added ' + added + ' entr' + (added === 1 ? 'y' : 'ies') : 'Already complete', added ? 'Now type the values.' : '', 'success'); return; }
      case 'rename:one': { const m = state.bundle.mappings[i]; if (m) { m.id = autoMappingId(m); persist(); render(); } return; }
      case 'rename:all': { let n = 0; state.bundle.mappings.forEach((m) => { const id = autoMappingId(m); if (id !== m.id) { m.id = id; n++; } }); persist(); render(); toast('Auto-renamed', n + ' updated', 'success'); return; }
      case 'rename:selected': { let n = 0;[...state.sel].forEach((m) => { const id = autoMappingId(m); if (id !== m.id) { m.id = id; n++; } }); persist(); render(); toast('Auto-renamed', n + ' updated', 'success'); return; }
      case 'cond:on': curMap().conditions = { milestoneTypes: [], targetActions: [], agvTypes: [], usages: [] }; persist(); render(); return;
      case 'cond:off': curMap().conditions = null; persist(); render(); return;
    }
  }

  // ----------------------------------------------------------------- field edits
  function onField(e) {
    const el = e.target.closest('[data-path], [data-bulk], [data-dupcount]');
    if (!el) return;
    if (el.hasAttribute('data-dupcount')) { state.dupN = Math.max(1, Math.min(200, parseInt(el.value, 10) || 1)); return; }
    if (el.dataset.bulk != null) { onBulk(el, e); return; }
    let v; const ty = el.dataset.type;
    if (ty === 'bool') v = el.checked;
    else if (ty === 'csv') v = el.value.split(',').map((x) => x.trim()).filter(Boolean);
    else if (ty === 'ths-loaded') v = el.value === 'null' ? null : el.value === 'true';
    else v = el.value;
    setByPath(state.bundle, el.dataset.path, v);
    if (el.dataset.kind === 'theta' && e.type === 'change') {
      const terr = thetaError(el.value);
      if (terr) { el.classList.add('invalid'); showRowError(el, terr); toast('Invalid value', terr, 'error'); }
      else { const r = roundTheta(el.value); if (r !== el.value) { el.value = r; setByPath(state.bundle, el.dataset.path, r); } el.classList.remove('invalid'); clearRowError(el); }
    }
    if (el.dataset.token != null && e.type === 'change') { const t = curTpl(); if (t) propagateTokenRename(t, el.dataset.orig || '', el.value); el.dataset.orig = el.value; }
    const path = el.dataset.path || '';
    const pmE = path.match(/^mappings\.(\d+)\.entries\./);
    const pmT = path.match(/^mappings\.(\d+)\.template$/);
    if (pmE) applyAutoRename(+pmE[1]);
    else if (pmT) { const mm = state.bundle.mappings[+pmT[1]]; if (mm) mm.id = autoMappingId(mm); }
    persist();
    const r = el.dataset.refresh;
    if (r === 'list') refreshList();
    else if (r === 'all') render();
    else if (ty === 'bool') render();
    refreshPreview();
  }
  function onBulk(el, e) {
    const sel = [...state.sel];
    const kind = el.dataset.bulk;
    if (kind === 'ngid') sel.forEach((m) => { m.navigationGraphId = el.value; });
    else if (kind === 'entry') {
      const k = el.dataset.key; let val = el.value;
      if (isThetaKey(k)) { if (!e || e.type !== 'change') return; const terr = thetaError(val); if (terr) { el.classList.add('invalid'); toast('Invalid value', terr, 'error'); return; } val = roundTheta(val); el.value = val; el.classList.remove('invalid'); }
      sel.forEach((m) => { const en = m.entries.find((x) => x.key === k); if (en) en.value = val; else m.entries.push({ key: k, value: val }); });
    } else if (kind === 'actionMapping') { if (el.value !== '__leave__') { const b = el.value === 'true'; sel.forEach((m) => { m.actionMapping = b; }); persist(); render(); return; } }
    persist();
    refreshPreview();
  }
  function refreshList() { const l = $('.sidebar-list'); if (l) l.innerHTML = state.tab === 'templates' ? templateListItems() : mappingListItems(); }
  function refreshPreview() { if (!state.preview) return; const pre = $('#preview-pre'); if (pre) pre.textContent = JSON.stringify(canonicalize(state.bundle), null, 2); }
  function onSearch(e) { const el = e.target.closest('[data-search]'); if (!el) return; if (el.dataset.search === 't') state.tSearch = el.value; else state.mSearch = el.value; refreshList(); }

  // ------------------------------------------------------------- file commands
  async function doLoadMap() {
    if (window.electronAPI && window.electronAPI.openMapDialog) {
      try { const res = await window.electronAPI.openMapDialog(); if (res && res.success) loadMapData(res.map, baseName(res.filePath)); else if (res && !res.canceled) toast('Open failed', res.error || '', 'error'); }
      catch (err) { toast('Open failed', String(err), 'error'); }
    } else { $('#map-input').click(); }
  }
  function baseName(p) { return String(p || '').split(/[\\/]/).pop() || 'map'; }
  function loadMapData(map, name) {
    if (!map || !Array.isArray(map.navigationGraphs)) { toast('Not a map', 'This file has no "navigationGraphs".', 'error'); return; }
    state.map = normalizeMap(map); state.mapName = name || 'map'; state.graphs = graphsFromMap(state.map); state.gi = 0; state.editingSample = null; resetEditState();
    state.deps = []; state.mapEd.depSel = null; state.mapEd.depPickFrom = false; state.mapEd.wsSel = null; state.mapEd.overlap = null;
    state.view = 'route'; state.mapEd.gi = 0; state.mapEd.selset = []; state.mapEd.dialog = null; state.mapEd.ungroupedStations = []; state.mapEd.bg = null; state.mapEd._fitted = false; state.mapEd._dirty = false;
    persist(); render();
    const matched = state.graphs.filter((g) => g.matched).length;
    toast('Map loaded', state.graphs.length + ' graph(s) · ' + matched + ' matched known layout(s)', 'success');
  }
  function collectUngrouped() { if (!Array.isArray(state.mapEd.ungroupedStations)) state.mapEd.ungroupedStations = []; }
  async function doOpenBackground() {
    if (!(window.electronAPI && window.electronAPI.openImageDialog)) { toast('Background', 'Image picking needs the desktop app.', 'error'); return; }
    try {
      const res = await window.electronAPI.openImageDialog();
      if (!res || !res.success) { if (res && !res.canceled) toast('Background failed', res.error || '', 'error'); return; }
      const img = new Image();
      img.onload = () => {
        state.mapEd.bg = { path: res.path, name: res.name, dataUrl: res.dataUrl, metersPerPixel: 0.05, offsetX: 0, offsetY: 0, imgW: img.naturalWidth, imgH: img.naturalHeight, opacity: 0.6 };
        state.mapEd._fitted = false; persist(); render();
        toast('Background added', res.name + ' — set the scale with the background ✥ button', 'success');
      };
      img.onerror = () => toast('Background failed', 'Could not decode image.', 'error');
      img.src = res.dataUrl;
    } catch (err) { toast('Background failed', String(err), 'error'); }
  }

  function graphFileName(g) { return safeName(g.graphId) + '_route_templates_' + today() + '.json'; }

  // ---- import an existing reservation-dependencies file (replaces the current list) ----
  async function doImportDeps() {
    const apply = (data, name) => {
      const arr = normalizeDeps(data);
      if (!Array.isArray(data) || (data.length && !arr.length)) { toast('Not a dependencies file', 'Expected an array of { fromNode, fromNavigationGraph, to[] }.', 'error'); return; }
      state.deps = arr; state.mapEd.depSel = null; state.mapEd.depPickFrom = false;
      persist(); render();
      toast('Dependencies loaded', arr.length + ' entr' + (arr.length === 1 ? 'y' : 'ies') + (name ? ' from ' + name : ''), 'success');
      const known = new Set();
      ((state.map && state.map.navigationGraphs) || []).forEach((g) => (g.nodes || []).forEach((n) => known.add(g.id + ' ' + n.id)));
      let missing = 0;
      arr.forEach((d) => { if (!known.has(d.fromNavigationGraph + ' ' + d.fromNode)) missing++; (d.to || []).forEach((t) => (t.nodes || []).forEach((n) => { if (!known.has(t.navigationGraph + ' ' + n)) missing++; })); });
      if (missing) toast('Check the file', missing + ' node reference(s) don’t exist on this map.', 'error');
    };
    if (window.electronAPI && window.electronAPI.openBundleDialog) {
      try { const res = await window.electronAPI.openBundleDialog(); if (res && res.success) apply(res.bundle, baseName(res.filePath)); else if (res && !res.canceled) toast('Open failed', res.error || '', 'error'); }
      catch (err) { toast('Open failed', String(err), 'error'); }
    } else {
      const fi = $('#file-input'); if (!fi) return;
      fi.onchange = (e) => {
        const file = e.target.files && e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { try { apply(JSON.parse(reader.result), file.name); } catch (err) { toast('Invalid JSON', String(err.message || err), 'error'); } };
        reader.readAsText(file); fi.value = '';
      };
      fi.click();
    }
  }

  function openExport() {
    if (state.editingSample) { doDownloadSingle(); return; }
    if (state.view === 'map' && state.map) reconcileGraphsAfterMapEdit();
    if (!state.graphs.length && !state.map) { toast('Nothing to export', 'Load or create a map first.', 'error'); return; }
    state.exportSel = new Set(state.graphs.map((_, i) => i).filter((i) => !state.graphs[i].noRouteTemplate));
    state.exportDeps = state.deps.length > 0;
    state.exportModal = true; render();
  }
  async function doExportSelected() {
    const idxs = [...state.exportSel].sort((x, y) => x - y);
    const files = [];
    if (state.map && state.exportMap) files.push({ fileName: mapFileName(), bundle: canonicalizeMap(state.map) });
    if (state.deps.length && state.exportDeps) files.push({ fileName: depsFileName(), bundle: canonicalizeDeps(state.deps) });
    idxs.forEach((i) => files.push({ fileName: graphFileName(state.graphs[i]), bundle: canonicalize(state.graphs[i].bundle) }));
    if (!files.length) return;
    state.exportModal = false; render();
    if (window.electronAPI && window.electronAPI.exportGraphsDialog) {
      try {
        const res = await window.electronAPI.exportGraphsDialog({ files });
        if (res && res.success) toast('Exported ' + res.written.length + ' file(s)', res.dir, 'success');
        else if (res && !res.canceled) toast('Export failed', res.error || '', 'error');
      } catch (err) { toast('Export failed', String(err), 'error'); }
    } else {
      files.forEach((f) => downloadBlob(JSON.stringify(f.bundle, null, 2), f.fileName));
      toast('Downloaded', files.length + ' file(s)', 'success');
    }
  }
  async function doDownloadSingle() {
    const data = canonicalize(state.bundle);
    const json = JSON.stringify(data, null, 2);
    const fname = (state.editingSample ? safeName(state.editingSample.name) : (curGraph() ? safeName(curGraph().graphId) + '_route_templates' : 'route-templates')) + '.json';
    if (window.electronAPI && window.electronAPI.saveBundleDialog) {
      try { const res = await window.electronAPI.saveBundleDialog({ bundle: data, defaultFileName: fname }); if (res && res.success) toast('Saved', res.filePath, 'success'); else if (res && !res.canceled) toast('Save failed', res.error || '', 'error'); }
      catch (err) { toast('Save failed', String(err), 'error'); }
    } else { downloadBlob(json, fname); toast('Downloaded', fname, 'success'); }
  }
  function downloadBlob(text, fname) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function copyJSON() {
    const json = JSON.stringify(canonicalize(state.bundle), null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json).then(() => toast('Copied', '', 'success'), () => toast('Copy failed', '', 'error'));
    else { const ta = document.createElement('textarea'); ta.value = json; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Copied', '', 'success'); } catch (_) { toast('Copy failed', '', 'error'); } ta.remove(); }
  }

  // ===========================================================================
  // MAP EDITOR — view shell, toolbar, info, dialogs
  // ===========================================================================
  function mapEditorHTML() {
    const side = state.mapEd.mode === 'deps' ? depsPanelHTML() : (state.mapEd.mode === 'wspot' ? wsPanelHTML() : '');
    return mapHeaderHTML() + mapToolbarHTML() +
      '<div class="map-stage"><svg id="map-svg" xmlns="http://www.w3.org/2000/svg"></svg>' +
      '<div id="map-xh-v" class="map-xh map-xh-v"></div><div id="map-xh-h" class="map-xh map-xh-h"></div>' +
      (state.mapEd.translatePanel ? translatePanelHTML() : '') +
      (side ? '<div id="map-side" class="map-side">' + side + '</div>' : '') +
      (state.mapEd.overlap ? '<div id="map-overlap" class="map-overlap">' + overlapPanelHTML() + '</div>' : '') +
      '<div id="map-info" class="map-info">' + mapInfoInner() + '</div>' +
      '<div id="map-readout" class="map-readout">x —   y —</div></div>';
  }
  // Picker shown when several map objects share (≈) one position — choose which one you mean.
  function overlapPanelHTML() {
    const ov = state.mapEd.overlap; if (!ov) return '';
    const typeIcon = { node: I.node, station: I.box, charger: I.bolt, light: I.bulb };
    const typeName = { node: '', station: 'handling station', charger: 'charging station', light: 'traffic light' };
    const rows = ov.items.map((c) => {
      const dataAttrs = ' data-t="' + esc(c.type) + '" data-n="' + esc(c.id) + '"' + (c.graphId ? ' data-g="' + esc(c.graphId) + '"' : '');
      const sub = c.type === 'node' ? c.graphId : typeName[c.type];
      return '<div class="ov-item ' + esc(c.type) + (isSel(c.type, c.id, c.graphId) ? ' active' : '') + '" data-act="ovSelect"' + dataAttrs + '>' +
        '<span class="ov-icon ' + esc(c.type) + '">' + (typeIcon[c.type] || I.node) + '</span>' +
        '<div class="ov-main"><b class="mono">' + esc(c.id) + '</b><span class="muted">' + esc(sub) + '</span></div>' +
        '<button class="btn btn-ghost btn-icon btn-sm" data-act="ovEdit"' + dataAttrs + ' title="Edit this ' + esc(c.type === 'node' ? 'node' : typeName[c.type]) + '">' + I.wand + '</button>' +
      '</div>';
    }).join('');
    return '<div class="side-head">' + I.node + '<b>' + ov.items.length + ' objects at this spot</b>' +
        '<button class="btn btn-ghost btn-icon btn-sm" data-act="ovClose" title="Close">✕</button></div>' +
      '<div class="side-hint muted">These objects overlap here. Click one to select it — drag on the map then moves it — or use ' + I.wand + ' to edit it directly.</div>' +
      '<div class="side-list">' + rows + '</div>';
  }
  // ---- docked side panel: reservation dependencies (deps tool) ----
  function depsPanelHTML() {
    const ed = state.mapEd;
    const items = (state.deps || []).map((d, i) => {
      const act = ed.depSel === i;
      const chips = (d.to || []).map((t) => (t.nodes || []).map((n) =>
        '<span class="chip" data-act="depTargetRm" data-i="' + i + '" data-g="' + esc(t.navigationGraph) + '" data-n="' + esc(n) + '" title="Click to remove this dependent node">' + esc(t.navigationGraph) + ':' + esc(n) + ' ×</span>').join('')).join('');
      return '<div class="side-item' + (act ? ' active' : '') + '" data-act="depSelect" data-i="' + i + '">' +
        '<div class="side-item-head"><b class="mono">' + esc(depLabel(d)) + '</b><span class="muted">' + depTargetCount(d) + '</span>' +
          '<span class="row-actions">' +
            iconBtnIdx('depPickFrom', I.target, i, 'Change the first node (then click a node on the map)') +
            iconBtnIdx('depDup', I.copy, i, 'Duplicate this dependency') +
            iconBtnIdx('depDel', I.trash, i, 'Delete this dependency', 'btn-danger-ghost') + '</span></div>' +
        (chips ? '<div class="side-chips">' + chips + '</div>' : '<div class="muted" style="font-size:11px;margin-top:3px;">no dependent nodes yet</div>') +
        '</div>';
    }).join('');
    const hint = ed.depSel == null
      ? 'Click a node on the map to start a dependency — it becomes the <b>first node</b>. Click an entry below to edit it.'
      : (ed.depPickFrom
        ? 'Now click a node on the map to set the <b>first node</b> of the highlighted entry.'
        : 'Click nodes on the map (any graph) to add / remove them as <b>dependent nodes</b> of the highlighted entry.');
    return '<div class="side-head">' + I.link + '<b>Reservation dependencies</b><span class="muted">' + (state.deps || []).length + '</span></div>' +
      '<div class="side-hint muted">' + hint + '</div>' +
      '<div class="side-actions">' + btn('depNew', I.plus, 'New', 'btn-secondary btn-sm', 'Start a new dependency (click its first node on the map)') +
        btn('depsImport', I.open, 'Import…', 'btn-outline btn-sm', 'Load an existing reservation-dependencies .json') +
        (ed.depSel != null ? btn('depClearSel', I.check, 'Done', 'btn-ghost btn-sm', 'Finish editing this entry') : '') + '</div>' +
      '<div class="side-list">' + (items || '<div class="muted" style="font-size:12px;padding:4px 2px;">No dependencies yet.</div>') + '</div>';
  }
  // ---- docked side panel: waiting spots (waiting tool) ----
  function wsPanelHTML() {
    const ed = state.mapEd, spots = (state.map.waitingSpots || []);
    const items = spots.map((w, i) => {
      const act = ed.wsSel === i;
      const chips = (w.nodes || []).map((n) =>
        '<span class="chip" data-act="wsNodeRm" data-i="' + i + '" data-g="' + esc(n.navigationGraphId) + '" data-n="' + esc(n.nodeId) + '" title="Click to remove this node">' + esc(n.navigationGraphId) + ':' + esc(n.nodeId) + ' ×</span>').join('');
      const groups = (state.map.handlingStationGroups || []).filter((g) => (g.waitingSpots || []).some((x) => x && x.id === w.id)).map((g) => g.id);
      return '<div class="side-item ws' + (act ? ' active' : '') + '" data-act="wsSelect" data-i="' + i + '">' +
        '<div class="side-item-head"><input type="text" class="mono ws-id" data-act="wsId" data-i="' + i + '" value="' + esc(w.id) + '" title="Waiting-spot ID" />' +
          '<span class="muted">' + (w.nodes || []).length + '</span>' +
          '<span class="row-actions">' + iconBtnIdx('wsDup', I.copy, i, 'Duplicate this waiting spot') +
            iconBtnIdx('wsDel', I.trash, i, 'Delete this waiting spot', 'btn-danger-ghost') + '</span></div>' +
        (chips ? '<div class="side-chips">' + chips + '</div>' : '<div class="muted" style="font-size:11px;margin-top:3px;">no nodes yet — click nodes on the map</div>') +
        '<div class="muted" style="font-size:11px;margin-top:3px;">' + (groups.length ? 'used by group(s): ' + esc(groups.join(', ')) : 'not assigned to any station group yet') + '</div></div>';
    }).join('');
    const hint = ed.wsSel == null
      ? 'Click a node on the map to create a waiting spot with it (or pick a spot below). Assign spots to a station by double-clicking the station.'
      : 'Click nodes on the map (any graph) to add / remove them in the highlighted waiting spot.';
    return '<div class="side-head">' + I.clock + '<b>Waiting spots</b><span class="muted">' + spots.length + '</span></div>' +
      '<div class="side-hint muted">' + hint + '</div>' +
      '<div class="side-actions">' + btn('wsNew', I.plus, 'New', 'btn-secondary btn-sm') +
        (ed.wsSel != null ? btn('wsClearSel', I.check, 'Done', 'btn-ghost btn-sm', 'Finish editing this spot') : '') + '</div>' +
      '<div class="side-list">' + (items || '<div class="muted" style="font-size:12px;padding:4px 2px;">No waiting spots yet.</div>') + '</div>';
  }
  function translatePanelHTML() {
    const g = mapGraph(); if (!g) return '';
    const t = g.graphToMapTransformation;
    return '<div class="map-translate"><div class="mtp-head">' + I.translate + '<b>Translate</b> <span class="muted mono">' + esc(g.id) + '</span>' +
      '<button class="btn btn-ghost btn-icon btn-sm" data-act="graphTranslate" title="Close">✕</button></div>' +
      '<div class="mtp-rows">' +
        '<label>Translation X [m]<input type="number" step="0.1" data-act="trans" data-axis="x" value="' + rnd(t.xTranslation) + '" /></label>' +
        '<label>Translation Y [m]<input type="number" step="0.1" data-act="trans" data-axis="y" value="' + rnd(t.yTranslation) + '" /></label>' +
        '<label>Rotation Z [rad]<input type="number" step="0.01" data-act="trans" data-axis="z" value="' + rnd(t.zRotation) + '" /></label>' +
      '</div>' +
      '<div class="mtp-hint muted">The graph moves live. Local node coords are unchanged; only its place in the shared map frame.</div>' +
      '<div class="mtp-foot"><button class="btn btn-outline btn-sm" data-act="graphEditFull">' + I.box + '<span>Name &amp; AGV types…</span></button>' +
        '<button class="btn btn-ghost btn-sm" data-act="resetView">Fit</button></div></div>';
  }
  function mapHeaderHTML() {
    return '<header class="app-header"><div class="brand"><div class="logo">' + I.logo + '</div>' +
      '<div class="brand-text"><h1>Map editor</h1><p>' + esc(state.mapName || 'untitled map') + '</p></div></div>' +
      '<div class="header-spacer"></div><div class="header-actions">' +
        btn('home', I.home, 'Menu', 'btn-ghost', 'Back to the start screen — your work is auto-saved') +
        themeBtn() +
        btn('route', I.layers, 'Route templates', 'btn-ghost', 'Back to route-template editor') +
        btn('preview', I.code, 'Preview map', state.preview ? 'btn-secondary' : 'btn-ghost') +
        btn('exportAll', I.download, 'Export', 'btn-primary') +
      '</div></header>';
  }
  function mapToolbarHTML() {
    const ed = state.mapEd, graphs = state.map.navigationGraphs || [];
    const gopts = graphs.map((g, i) => '<option value="' + i + '"' + (i === ed.gi ? ' selected' : '') + '>' + esc(g.id) + '</option>').join('') || '<option>(no graphs)</option>';
    const mode = (m, icon, label) => '<button class="btn btn-sm btn-icon mt-tool ' + (ed.mode === m ? 'btn-secondary' : 'btn-ghost') + '" data-act="mapMode" data-mode="' + m + '" title="' + esc(label) + '">' + icon + '</button>';
    return '<div class="map-toolbar">' +
      '<div class="mt-group"><span class="mt-label">Graph</span>' +
        '<select class="mt-graph" data-act="mapGraphSel">' + gopts + '</select>' +
        '<button class="btn btn-ghost btn-icon btn-sm" data-act="graphAdd" title="Add graph">' + I.plus + '</button>' +
        '<button class="btn btn-ghost btn-icon btn-sm" data-act="graphTranslate" title="Translate / edit graph">' + I.translate + '</button>' +
        '<button class="btn btn-ghost btn-icon btn-sm btn-danger-ghost" data-act="graphRemove" title="Remove graph">' + I.trash + '</button>' +
      '</div>' +
      '<div class="mt-group"><span class="mt-label">Tools</span>' +
        mode('select', I.cursor, 'Select — left-click selects · drag moves · Shift+drag box-selects') +
        mode('node', I.node, 'Node — right-click the canvas to place one') +
        mode('edge', I.edge, 'Edge — right-click the start node, then the end node') +
        mode('station', I.box, 'Station — right-click to place · left-click nodes to set access nodes') +
        mode('charger', I.bolt, 'Charger — right-click to place · left-click nodes to set access nodes') +
        mode('light', I.bulb, 'Traffic light — right-click the canvas to place one') +
        mode('earea', I.warn, 'Emergency area — click 4+ points on the map, then click the first point to close') +
        mode('deps', I.link, 'Reservation dependencies — click the first node, then its dependent nodes. Click this button again to close') +
        mode('wspot', I.clock, 'Waiting spots — click nodes to build named waiting spots. Click this button again to close') +
      '</div>' +
      (ed.mode === 'edge' ? '<div class="mt-group"><label class="mt-check"><input type="checkbox" data-act="edgeBidir"' + (ed.edgeBidir ? ' checked' : '') + ' /> Bidirectional</label></div>' : '') +
      (ed.areaDraft && ed.areaDraft.length ? '<div class="mt-group"><button class="btn btn-primary btn-sm" data-act="areaFinish">' + I.check + '<span>Finish area (' + ed.areaDraft.length + ' point' + (ed.areaDraft.length === 1 ? '' : 's') + ')</span></button></div>' : '') +
      '<div class="mt-group"><span class="mt-label">Manage</span>' +
        '<button class="btn btn-ghost btn-sm" data-act="groupsEdit" title="Station groups">' + I.layers + '<span>Groups</span></button>' +
        '<button class="btn btn-ghost btn-sm" data-act="detectorsEdit" title="Group areas under emergency detectors">' + I.warn + '<span>Detectors</span></button>' +
      '</div>' +
      '<div class="mt-group mt-view">' +
        '<button class="btn btn-sm ' + (ed.viewMenu ? 'btn-secondary' : 'btn-ghost') + '" data-act="viewMenu" title="Grid, coordinates, decimals, background image">' + I.grid + '<span>View</span>' + I.chev + '</button>' +
        (ed.viewMenu ? viewMenuHTML() : '') +
      '</div></div>';
  }
  // Dropdown with the display / background options (kept out of the toolbar to save space).
  function viewMenuHTML() {
    const ed = state.mapEd, bg = ed.bg;
    return '<div id="view-menu" class="mt-menu">' +
      '<label class="mt-check"><input type="checkbox" data-act="gridToggle"' + (ed.grid ? ' checked' : '') + ' /> Grid + rulers</label>' +
      '<label class="mt-check"><input type="checkbox" data-act="coordsToggle"' + (ed.coords ? ' checked' : '') + ' /> Node coordinates</label>' +
      '<label class="mt-menu-row">Decimals <input class="mt-dec" type="number" min="0" max="6" value="' + ed.decimals + '" data-act="decimals" /></label>' +
      '<button class="btn btn-outline btn-sm" data-act="resetView">' + I.target + '<span>Fit view</span></button>' +
      '<div class="mt-menu-sep"></div>' +
      '<div class="mt-menu-h">Background image</div>' +
      '<div class="mt-menu-btns">' +
        '<button class="btn btn-outline btn-sm" data-act="bgOpen">' + I.image + '<span>' + (bg ? 'Replace…' : 'Open…') + '</span></button>' +
        (bg ? '<button class="btn btn-ghost btn-icon btn-sm" data-act="bgEdit" title="Scale / position">' + I.translate + '</button><button class="btn btn-ghost btn-icon btn-sm btn-danger-ghost" data-act="bgDelete" title="Remove background">' + I.trash + '</button>' : '') +
      '</div>' +
      (bg ? '<div class="mt-menu-note muted">' + esc(bg.name || 'image') + '</div>' : '') +
      '</div>';
  }
  function mapInfoInner() {
    const ed = state.mapEd, ss = ed.selset || [];
    if (!ss.length) {
      const toolName = { deps: 'dependencies', wspot: 'waiting spots', earea: 'emergency area' }[ed.mode] || ed.mode;
      let hint = 'Left-click = select · right-click = ' + esc(ed.mode === 'select' ? 'add (pick a tool)' : 'add ' + ed.mode) + ' · drag = move · Shift+drag = box-select · wheel = zoom · Space+drag = pan';
      if (ed.mode === 'deps') hint = 'Click a node = first node, then click its dependent nodes. Manage entries in the left panel.';
      else if (ed.mode === 'wspot') hint = 'Pick / create a waiting spot in the left panel, then click nodes to add them.';
      else if (ed.mode === 'earea') {
        const n = (ed.areaDraft || []).length;
        if (!n) hint = 'Left-click 4 or more points on the map to outline the emergency area. An emergency detector is created automatically.';
        else if (n < 4) hint = '<b>' + n + '</b> point' + (n === 1 ? '' : 's') + ' placed — click at least ' + (4 - n) + ' more. Esc cancels.';
        else hint = '<b>' + n + '</b> points placed — click the highlighted first point, press Enter, or use the Finish button to close the area. Esc cancels.';
      }
      return '<div class="mi-row"><span>Tool</span><b>' + esc(toolName) + '</b></div><div class="mi-hint muted">' + hint + '</div>';
    }
    if (ss.length > 1) {
      const types = [...new Set(ss.map((s) => s.type))];
      return '<div class="mi-row"><span>Selected</span><b>' + ss.length + '</b></div>' +
        '<div class="mi-row"><span>Types</span><b>' + esc(types.join(', ')) + '</b></div>' +
        '<div class="mi-hint muted">Drag any one to move all · Delete to remove.</div>' +
        '<div class="mi-actions"><button class="btn btn-outline btn-sm" data-act="mapClearSel">Clear</button>' +
        '<button class="btn btn-outline btn-sm btn-danger-ghost" data-act="mapDeleteSel">' + I.trash + '<span>Delete ' + ss.length + '</span></button></div>';
    }
    const sel = ss[0]; let x = '-', y = '-', extra = '';
    const accHint = (el, kind) => '<div class="mi-row"><span>Access</span><b>' + (el.accessNodes || []).length + ' node(s)</b></div>' + (state.mapEd.mode === kind ? '<div class="mi-hint muted">Left-click a node to add/remove it as an access node.</div>' : '<div class="mi-hint muted">Pick the ' + (kind === 'station' ? 'Station' : 'Charger') + ' tool to assign access nodes.</div>');
    if (sel.type === 'node') { const g = (state.map.navigationGraphs || []).find((gg) => gg.id === sel.graphId); const n = g && nodeById(g, sel.id); if (n) { x = rnd(n.graphX); y = rnd(n.graphY); } }
    else if (sel.type === 'station') { const f = allStations().find((s) => s.st.id === sel.id); if (f) { x = rnd(f.st.mapX); y = rnd(f.st.mapY); extra = accHint(f.st, 'station'); const grp = groupOfStation(sel.id); const wsIds = grp ? (grp.waitingSpots || []).map((w) => w && w.id).filter(Boolean) : []; extra += '<div class="mi-row"><span>Waiting</span><b>' + (wsIds.length ? esc(wsIds.join(', ')) : '—') + '</b></div>' + (wsIds.length ? '<div class="mi-hint muted">Waiting-spot nodes are highlighted orange. Double-click the station to change them.</div>' : ''); } }
    else if (sel.type === 'charger') { const c = (state.map.chargingStations || []).find((c) => c.id === sel.id); if (c) { x = rnd(c.mapX); y = rnd(c.mapY); extra = accHint(c, 'charger'); } }
    else if (sel.type === 'light') { const l = (state.map.trafficLights || []).find((l) => l.id === sel.id); if (l) { x = rnd(l.mapX); y = rnd(l.mapY); } }
    return '<div class="mi-row"><span>' + esc(sel.type) + '</span><b>' + esc(sel.id) + '</b></div>' +
      '<div class="mi-row"><span>X</span><b>' + x + '</b></div><div class="mi-row"><span>Y</span><b>' + y + '</b></div>' + extra +
      '<div class="mi-actions"><button class="btn btn-outline btn-sm" data-act="mapEditSel">' + I.wand + '<span>Edit</span></button>' +
      '<button class="btn btn-outline btn-sm btn-danger-ghost" data-act="mapDeleteSel">' + I.trash + '<span>Delete</span></button></div>';
  }

  // ---- map dialogs ----
  function mdField(label, id, val, type) { return '<div class="field"><label>' + label + '</label><input id="' + id + '" type="' + (type || 'text') + '" value="' + esc(val) + '" /></div>'; }
  function mdRO(label, val) { return '<div class="field"><label>' + label + '</label><input value="' + esc(val) + '" readonly /></div>'; }
  function mapDialogHTML() {
    const d = state.mapEd.dialog; if (!d) return '';
    if (d.kind === 'groups') return groupsDialogHTML();
    if (d.kind === 'detectors') return detectorsDialogHTML();
    let title = '', body = '';
    if (d.kind === 'node') {
      const g = (state.map.navigationGraphs || []).find((x) => x.id === d.graphId); const n = g && nodeById(g, d.id);
      if (!n) { state.mapEd.dialog = null; return ''; }
      title = 'Edit node'; body = mdField('ID', 'md-id', n.id) + '<div class="grid-2">' + mdField('Graph X', 'md-x', rnd(n.graphX), 'number') + mdField('Graph Y', 'md-y', rnd(n.graphY), 'number') + '</div>' +
        '<label class="mt-check"><input id="md-park" type="checkbox"' + (n.parkingSpot ? ' checked' : '') + ' /> Parking spot</label> ' +
        '<label class="mt-check"><input id="md-emerg" type="checkbox"' + (n.emergencySpot ? ' checked' : '') + ' /> Emergency spot</label>';
    } else if (d.kind === 'edge') {
      const g = (state.map.navigationGraphs || []).find((x) => x.id === d.graphId); const e = g && g.edges.find((x) => x.id === d.id);
      if (!e) { state.mapEd.dialog = null; return ''; }
      const rev = g.edges.some((x) => x.startNodeId === e.endNodeId && x.endNodeId === e.startNodeId);
      title = 'Edit edge'; body = mdField('ID', 'md-id', e.id) + '<div class="grid-2">' + mdRO('Start', e.startNodeId) + mdRO('End', e.endNodeId) + '</div>' +
        '<label class="mt-check"><input id="md-bidir" type="checkbox"' + (rev ? ' checked' : '') + ' /> Bidirectional (keep reverse edge ' + esc(e.endNodeId) + '→' + esc(e.startNodeId) + ')</label>';
    } else if (d.kind === 'station' || d.kind === 'charger') {
      const isCh = d.kind === 'charger';
      const el = isCh ? (state.map.chargingStations || []).find((c) => c.id === d.id) : (allStations().find((s) => s.st.id === d.id) || {}).st;
      if (!el) { state.mapEd.dialog = null; return ''; }
      const acc = (el.accessNodes || []).map((a) => a.navigationGraphId + ':' + a.nodeId).join('\n');
      title = isCh ? 'Edit charging station' : 'Edit station';
      let wsBody = '';
      if (!isCh) {
        const grpSt = groupOfStation(el.id), wsAll = state.map.waitingSpots || [];
        wsBody = grpSt
          ? '<div class="field"><label>Waiting spots (stored on group ' + esc(grpSt.id) + ')</label><div class="ws-checks">' +
            (wsAll.length ? wsAll.map((w) => '<label class="mt-check"><input type="checkbox" class="md-ws" data-ws="' + esc(w.id) + '"' + ((grpSt.waitingSpots || []).some((x) => x && x.id === w.id) ? ' checked' : '') + ' /> ' + esc(w.id) + ' <span class="muted">(' + (w.nodes || []).length + ' node' + ((w.nodes || []).length === 1 ? '' : 's') + ')</span></label>').join('')
              : '<span class="muted">No waiting spots defined yet — use the Waiting tool on the map.</span>') + '</div></div>'
          : '<div class="hint">Ungrouped station — assign it to a group (Stations → Groups) to attach waiting spots.</div>';
      }
      body = mdField('ID', 'md-id', el.id) + '<div class="grid-2">' + mdField('Map X', 'md-x', rnd(el.mapX), 'number') + mdField('Map Y', 'md-y', rnd(el.mapY), 'number') + '</div>' +
        (isCh ? '<label class="mt-check"><input id="md-ctrl" type="checkbox"' + (el.controlled ? ' checked' : '') + ' /> Controlled</label>' : '') +
        '<div class="field"><label>Access nodes (one per line — graphId:nodeId)</label><textarea id="md-acc" rows="3">' + esc(acc) + '</textarea></div>' + wsBody;
    } else if (d.kind === 'light') {
      const l = (state.map.trafficLights || []).find((l) => l.id === d.id); if (!l) { state.mapEd.dialog = null; return ''; }
      title = 'Edit traffic light'; body = mdField('ID', 'md-id', l.id) + '<div class="grid-2">' + mdField('Map X', 'md-x', rnd(l.mapX), 'number') + mdField('Map Y', 'md-y', rnd(l.mapY), 'number') + '</div>';
    } else if (d.kind === 'area') {
      const a = (state.map.areas || []).find((a) => a.id === d.id); if (!a) { state.mapEd.dialog = null; return ''; }
      const dets = (state.map.emergencyDetectors || []).filter((x) => (x.areas || []).includes(a.id)).map((x) => x.id);
      title = 'Edit area';
      body = mdField('ID', 'md-id', a.id) +
        '<label class="mt-check"><input id="md-earea" type="checkbox"' + (dets.length ? ' checked' : '') + ' /> Emergency area (watched by an emergency detector)</label>' +
        (dets.length ? '<div class="hint">Detector(s): ' + esc(dets.join(', ')) + ' — manage them under <b>Detectors</b> in the toolbar.</div>' : '<div class="hint">Ticking this creates a detector named “' + esc(a.id) + ' Detector”.</div>') +
        '<div class="hint">' + (a.points || []).length + ' points. Delete the area from the info panel; redraw with the Area / Emergency tool.</div>';
    } else if (d.kind === 'graph') {
      const g = (state.map.navigationGraphs || []).find((x) => x.id === d.id) || mapGraph(); if (!g) { state.mapEd.dialog = null; return ''; }
      const tf = g.graphToMapTransformation; const agv = (g.agvTypes || []).map((a) => a.vendorName + ':' + a.typeName).join('\n');
      title = 'Edit / translate graph';
      body = mdField('Graph ID', 'md-id', g.id) +
        '<div class="card-subtitle muted" style="margin:6px 0;">Transformation to map coordinates</div>' +
        '<div class="grid-3">' + mdField('Translation X [m]', 'md-tx', rnd(tf.xTranslation), 'number') + mdField('Translation Y [m]', 'md-ty', rnd(tf.yTranslation), 'number') + mdField('Rotation Z [rad]', 'md-rz', rnd(tf.zRotation), 'number') + '</div>' +
        '<div class="field"><label>AGV types (one per line — vendor:typeName)</label><textarea id="md-agv" rows="2">' + esc(agv) + '</textarea></div>';
    } else if (d.kind === 'bg') {
      const bg = state.mapEd.bg; if (!bg) { state.mapEd.dialog = null; return ''; }
      title = 'Background scale & position';
      body = '<div class="hint">' + esc(bg.name || 'image') + ' · ' + bg.imgW + '×' + bg.imgH + ' px</div>' +
        mdField('Meters per pixel', 'md-mpp', bg.metersPerPixel, 'number') +
        '<div class="grid-2">' + mdField('Offset X [m]', 'md-ox', bg.offsetX, 'number') + mdField('Offset Y [m]', 'md-oy', bg.offsetY, 'number') + '</div>' +
        mdField('Opacity (0–1)', 'md-op', bg.opacity != null ? bg.opacity : 0.6, 'number');
    } else { state.mapEd.dialog = null; return ''; }
    return '<div class="modal-overlay" data-act="mapDlg:cancel"><div class="modal" data-stop style="width:min(460px,100%);">' +
      '<div class="modal-head"><h3>' + esc(title) + '</h3><button class="btn btn-ghost btn-icon" data-act="mapDlg:cancel" title="Close">✕</button></div>' +
      '<div class="modal-body" style="padding:16px 18px;">' + body + '</div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" data-act="mapDlg:cancel">Cancel</button><button class="btn btn-primary" data-act="mapDlg:ok">Save</button></div></div></div>';
  }
  function applyMapDialog() {
    const d = state.mapEd.dialog; if (!d) return;
    const val = (id) => { const e = document.getElementById(id); return e ? e.value : ''; };
    const chk = (id) => { const e = document.getElementById(id); return !!(e && e.checked); };
    if (d.kind === 'node') {
      const g = (state.map.navigationGraphs || []).find((x) => x.id === d.graphId); const n = g && nodeById(g, d.id); if (!n) return;
      const newId = String(val('md-id')).trim() || n.id;
      if (newId !== n.id && !g.nodes.some((x) => x.id === newId)) { const old = n.id; n.id = newId; g.edges.forEach((e) => { if (e.startNodeId === old) e.startNodeId = newId; if (e.endNodeId === old) e.endNodeId = newId; }); allStations().forEach(({ st }) => (st.accessNodes || []).forEach((a) => { if (a.navigationGraphId === g.id && a.nodeId === old) a.nodeId = newId; })); renameNodeInExtras(g.id, old, newId); }
      n.graphX = rnd(+val('md-x') || 0); n.graphY = rnd(+val('md-y') || 0);
      if (chk('md-park')) { if (!n.parkingSpot) n.parkingSpot = { allowLoadedAgvs: false }; } else delete n.parkingSpot;
      if (chk('md-emerg')) { if (!n.emergencySpot) n.emergencySpot = {}; } else delete n.emergencySpot;
      setSel({ type: 'node', id: n.id, graphId: g.id });
    } else if (d.kind === 'edge') {
      const g = (state.map.navigationGraphs || []).find((x) => x.id === d.graphId); const e = g && g.edges.find((x) => x.id === d.id); if (!e) return;
      const newId = String(val('md-id')).trim() || e.id; if (newId !== e.id && !g.edges.some((x) => x.id === newId)) e.id = newId;
      const rev = g.edges.find((x) => x.startNodeId === e.endNodeId && x.endNodeId === e.startNodeId);
      if (chk('md-bidir') && !rev) { const ids = new Set(g.edges.map((x) => x.id)); g.edges.push({ id: uniqueId(ids, edgeIdFor(g, e.endNodeId, e.startNodeId)), startNodeId: e.endNodeId, endNodeId: e.startNodeId }); }
      else if (!chk('md-bidir') && rev) g.edges = g.edges.filter((x) => x !== rev);
    } else if (d.kind === 'station' || d.kind === 'charger') {
      const isCh = d.kind === 'charger';
      const el = isCh ? (state.map.chargingStations || []).find((c) => c.id === d.id) : (allStations().find((s) => s.st.id === d.id) || {}).st; if (!el) return;
      el.id = String(val('md-id')).trim() || el.id; el.mapX = rnd(+val('md-x') || 0); el.mapY = rnd(+val('md-y') || 0);
      if (isCh) el.controlled = chk('md-ctrl');
      el.accessNodes = String(val('md-acc')).split('\n').map((s) => s.trim()).filter(Boolean).map((line) => { const i = line.indexOf(':'); return { navigationGraphId: i >= 0 ? line.slice(0, i) : '', nodeId: i >= 0 ? line.slice(i + 1) : line }; });
      if (!isCh) {
        const grpSt = groupOfStation(el.id);
        const checks = [...document.querySelectorAll('.md-ws')];
        if (grpSt && checks.length) grpSt.waitingSpots = checks.filter((c) => c.checked).map((c) => ({ id: c.dataset.ws }));
      }
      setSel({ type: d.kind, id: el.id });
    } else if (d.kind === 'light') {
      const l = (state.map.trafficLights || []).find((l) => l.id === d.id); if (!l) return;
      l.id = String(val('md-id')).trim() || l.id; l.mapX = rnd(+val('md-x') || 0); l.mapY = rnd(+val('md-y') || 0);
    } else if (d.kind === 'area') {
      const a = (state.map.areas || []).find((a) => a.id === d.id); if (!a) return; const old = a.id; const newId = String(val('md-id')).trim() || a.id;
      if (newId !== old && !state.map.areas.some((x) => x.id === newId)) { a.id = newId; (state.map.emergencyDetectors || []).forEach((det) => { det.areas = (det.areas || []).map((n) => n === old ? newId : n); }); }
      const wantEm = chk('md-earea');
      const covering = (state.map.emergencyDetectors || []).filter((x) => (x.areas || []).includes(a.id));
      if (wantEm && !covering.length) state.map.emergencyDetectors.push({ id: a.id + ' Detector', areas: [a.id] });
      else if (!wantEm && covering.length) { covering.forEach((x) => { x.areas = (x.areas || []).filter((n) => n !== a.id); }); state.map.emergencyDetectors = state.map.emergencyDetectors.filter((x) => (x.areas || []).length); }
    } else if (d.kind === 'graph') {
      const g = (state.map.navigationGraphs || []).find((x) => x.id === d.id) || mapGraph(); if (!g) return;
      const old = g.id; const newId = String(val('md-id')).trim() || g.id;
      if (newId !== old && !state.map.navigationGraphs.some((x) => x.id === newId)) { g.id = newId; allStations().forEach(({ st }) => (st.accessNodes || []).forEach((a) => { if (a.navigationGraphId === old) a.navigationGraphId = newId; })); renameGraphInExtras(old, newId); }
      g.graphToMapTransformation.xTranslation = +val('md-tx') || 0; g.graphToMapTransformation.yTranslation = +val('md-ty') || 0; g.graphToMapTransformation.zRotation = +val('md-rz') || 0;
      g.agvTypes = String(val('md-agv')).split('\n').map((s) => s.trim()).filter(Boolean).map((line) => { const i = line.indexOf(':'); return { vendorName: i >= 0 ? line.slice(0, i) : line, typeName: i >= 0 ? line.slice(i + 1) : '' }; });
      state.mapEd._fitted = false;
    } else if (d.kind === 'bg') {
      const bg = state.mapEd.bg; if (!bg) return;
      bg.metersPerPixel = +val('md-mpp') || bg.metersPerPixel; bg.offsetX = +val('md-ox') || 0; bg.offsetY = +val('md-oy') || 0; bg.opacity = Math.max(0, Math.min(1, +val('md-op')));
    }
    state.mapEd.dialog = null; mapDirty(); persist(); render();
  }

  // ---- station-group editing dialog ----
  function groupsDialogHTML() {
    const d = state.mapEd.dialog, m = state.map;
    const grp = (m.handlingStationGroups || []).find((g) => g.id === d.groupSel) || null;
    const groupList = (m.handlingStationGroups || []).map((g) => '<div class="lb-item' + (grp && g.id === grp.id ? ' active' : '') + '" data-act="grpSelect" data-id="' + esc(g.id) + '">' + esc(g.id) + ' <span class="muted">(' + g.handlingStations.length + ')</span></div>').join('') || '<div class="muted" style="padding:8px;">No groups yet</div>';
    const avail = (state.mapEd.ungroupedStations || []).map((s) => '<div class="lb-item' + (d.availSel === s.id ? ' active' : '') + '" data-act="availSelect" data-id="' + esc(s.id) + '">' + esc(s.id) + '</div>').join('') || '<div class="muted" style="padding:8px;">none</div>';
    const assigned = grp ? (grp.handlingStations.map((s) => '<div class="lb-item' + (d.assignedSel === s.id ? ' active' : '') + '" data-act="assignedSelect" data-id="' + esc(s.id) + '">' + esc(s.id) + '</div>').join('') || '<div class="muted" style="padding:8px;">none</div>') : '<div class="muted" style="padding:8px;">select a group</div>';
    const modes = ['ALWAYS', 'ONLY_PICK', 'ONLY_DROP', 'NEVER'];
    const info = grp ? '<div class="field"><label>Group ID</label><div class="id-row"><input id="md-grpid" value="' + esc(grp.id) + '" /><button class="btn btn-outline btn-sm" data-act="grpRename">Rename</button></div></div>' +
        '<label class="mt-check"><input type="checkbox" data-act="grpControlled"' + (grp.controlled ? ' checked' : '') + ' /> Controlled</label> ' +
        '<label class="mt-check"><input type="checkbox" data-act="grpJis"' + (grp.justInSequence ? ' checked' : '') + ' /> JustInSequence</label>' +
        '<div class="field"><label>Station selection mode</label><select data-act="grpMode">' + modes.map((x) => '<option' + (grp.stationAutomaticSelectionMode === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Waiting spots</label><div class="ws-checks">' + ((m.waitingSpots || []).length
          ? (m.waitingSpots || []).map((w) => '<label class="mt-check"><input type="checkbox" data-act="grpWs" data-id="' + esc(w.id) + '"' + ((grp.waitingSpots || []).some((x) => x && x.id === w.id) ? ' checked' : '') + ' /> ' + esc(w.id) + '</label>').join('')
          : '<span class="muted">none defined — use the Waiting tool on the map</span>') + '</div></div>'
      : '<div class="muted">Select or add a group to edit its settings.</div>';
    return '<div class="modal-overlay" data-act="mapDlg:cancel"><div class="modal" data-stop style="width:min(860px,100%);">' +
      '<div class="modal-head"><h3>Stations &amp; groups</h3><button class="btn btn-ghost btn-icon" data-act="mapDlg:cancel" title="Close">✕</button></div>' +
      '<div class="modal-body" style="padding:14px 18px;"><div class="groups-grid">' +
        '<div class="gg-col"><div class="gg-h">Groups</div><div class="listbox">' + groupList + '</div>' +
          '<div class="row-actions"><button class="btn btn-secondary btn-sm" data-act="grpAdd">' + I.plus + '<span>Add</span></button>' +
          '<button class="btn btn-ghost btn-sm btn-danger-ghost" data-act="grpDelete">' + I.trash + '<span>Delete</span></button></div></div>' +
        '<div class="gg-col">' + info + '</div>' +
        '<div class="gg-col"><div class="gg-h">Available stations</div><div class="listbox">' + avail + '</div>' +
          '<button class="btn btn-outline btn-sm" data-act="grpAssign">Assign →</button>' +
          '<div class="gg-h" style="margin-top:8px;">Assigned</div><div class="listbox">' + assigned + '</div>' +
          '<button class="btn btn-outline btn-sm" data-act="grpUnassign">← Remove</button></div>' +
      '</div></div>' +
      '<div class="modal-foot"><button class="btn btn-primary" data-act="mapDlg:cancel">Done</button></div></div></div>';
  }

  // ---- emergency-detectors dialog (live editing, like the groups dialog) ----
  function detectorsDialogHTML() {
    const areas = (state.map.areas || []).map((a) => a.id);
    const rows = (state.map.emergencyDetectors || []).map((det, i) =>
      '<div class="det-row"><div class="id-row"><input class="mono" data-act="detId" data-i="' + i + '" value="' + esc(det.id) + '" title="Detector ID" />' +
        '<button class="btn btn-ghost btn-icon btn-sm btn-danger-ghost" data-act="detDel" data-i="' + i + '" title="Delete detector">' + I.trash + '</button></div>' +
        '<div class="det-areas">' + (areas.length ? areas.map((aid) =>
          '<label class="mt-check"><input type="checkbox" data-act="detArea" data-i="' + i + '" data-area="' + esc(aid) + '"' + ((det.areas || []).includes(aid) ? ' checked' : '') + ' /> ' + esc(aid) + '</label>').join('')
          : '<span class="muted">no areas drawn yet</span>') + '</div></div>').join('')
      || '<div class="muted" style="padding:8px 0;">No emergency detectors yet. Draw one with the <b>Emergency</b> tool, or add one below.</div>';
    return '<div class="modal-overlay" data-act="mapDlg:cancel"><div class="modal" data-stop style="width:min(560px,100%);">' +
      '<div class="modal-head"><h3>' + I.warn + ' Emergency detectors</h3><button class="btn btn-ghost btn-icon" data-act="mapDlg:cancel" title="Close">✕</button></div>' +
      '<div class="modal-body" style="padding:14px 18px;"><div class="muted" style="font-size:12px;margin-bottom:6px;">Each detector watches one or more areas. Areas watched by any detector are drawn red on the map (emergency areas). Changes apply immediately.</div>' +
        rows + '<div style="margin-top:10px;">' + btn('detAdd', I.plus, 'Add detector', 'btn-secondary btn-sm') + '</div></div>' +
      '<div class="modal-foot"><button class="btn btn-primary" data-act="mapDlg:cancel">Done</button></div></div></div>';
  }

  // ===========================================================================
  // MAP EDITOR — canvas, view transforms, interaction
  // ===========================================================================
  function w2s(wx, wy) { const v = state.mapEd.view; return { x: wx * v.zoom + v.x, y: -wy * v.zoom + v.y }; }
  function s2w(sx, sy) { const v = state.mapEd.view; return { x: (sx - v.x) / v.zoom, y: -(sy - v.y) / v.zoom }; }
  function worldBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, any = false;
    const add = (x, y) => { any = true; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
    (state.map.navigationGraphs || []).forEach((g) => (g.nodes || []).forEach((n) => { const p = g2m(g, n.graphX, n.graphY); add(p.x, p.y); }));
    allStations().forEach(({ st }) => add(st.mapX, st.mapY));
    (state.map.chargingStations || []).forEach((c) => add(c.mapX, c.mapY));
    (state.map.trafficLights || []).forEach((l) => add(l.mapX, l.mapY));
    (state.map.areas || []).forEach((a) => (a.points || []).forEach((p) => add(p.mapX, p.mapY)));
    const bg = state.mapEd.bg; if (bg && bg.imgW) { add(bg.offsetX, bg.offsetY); add(bg.offsetX + bg.imgW * bg.metersPerPixel, bg.offsetY + bg.imgH * bg.metersPerPixel); }
    return any ? { minX, minY, maxX, maxY } : null;
  }
  function fitView(W, H) {
    const v = state.mapEd.view; const b = worldBounds();
    if (!b) { v.zoom = 30; v.x = W / 2; v.y = H / 2; return; }
    const w = Math.max(b.maxX - b.minX, 1), h = Math.max(b.maxY - b.minY, 1), pad = 70;
    v.zoom = Math.max(2, Math.min((W - 2 * pad) / w, (H - 2 * pad) / h, 300));
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    v.x = W / 2 - cx * v.zoom; v.y = H / 2 + cy * v.zoom;
  }
  function paintCanvas() {
    const svg = document.getElementById('map-svg'); if (!svg) return;
    const stage = svg.parentElement; const W = stage.clientWidth || 800, H = stage.clientHeight || 600;
    svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = mapCanvasInner(W, H);
  }
  function afterMapRender() {
    const svg = document.getElementById('map-svg'); if (!svg) return;
    const stage = svg.parentElement;
    if (!state.mapEd._fitted) { fitView(stage.clientWidth || 800, stage.clientHeight || 600); state.mapEd._fitted = true; }
    paintCanvas();
    reloadBackground();
  }
  // ---- selection (multi) ----
  function sameKey(a, b) { return a.type === b.type && a.id === b.id && a.graphId === b.graphId; }
  function isSel(type, id, graphId) { return (state.mapEd.selset || []).some((s) => s.type === type && s.id === id && (graphId === undefined || s.graphId === graphId)); }
  function isSelObj(o) { return (state.mapEd.selset || []).some((s) => sameKey(s, o)); }
  function selOne() { const ss = state.mapEd.selset || []; return ss.length === 1 ? ss[0] : null; }
  function setSel(o) { state.mapEd.selset = o ? [o] : []; }
  function toggleSel(o) { const ss = state.mapEd.selset || []; const i = ss.findIndex((s) => sameKey(s, o)); if (i >= 0) ss.splice(i, 1); else ss.push(o); state.mapEd.selset = ss; }

  // ---- grid + ruler ----
  function niceStep(px, zoom) { const raw = px / Math.max(zoom, 1e-6); const p = Math.pow(10, Math.floor(Math.log10(raw))); const m = raw / p; const n = m < 1.5 ? 1 : (m < 3.5 ? 2 : (m < 7.5 ? 5 : 10)); return n * p; }
  function fmtCoord(v) { const r = Math.round(v * 100) / 100; return Math.abs(r) < 1e-9 ? 0 : r; }
  function mapGridInner(W, H) {
    const step = niceStep(70, state.mapEd.view.zoom); if (!isFinite(step) || step <= 0) return '';
    const wl = s2w(0, 0).x, wr = s2w(W, 0).x, wb = s2w(0, H).y, wt = s2w(0, 0).y;
    let s = ''; const k0 = Math.ceil(wl / step), k1 = Math.floor(wr / step), j0 = Math.ceil(wb / step), j1 = Math.floor(wt / step);
    if (k1 - k0 > 1000 || j1 - j0 > 1000) return '';
    for (let k = k0; k <= k1; k++) { const x = w2s(k * step, 0).x; s += '<line class="m-grid' + (k === 0 ? ' axis' : (k % 5 === 0 ? ' major' : '')) + '" x1="' + x + '" y1="0" x2="' + x + '" y2="' + H + '"/>'; }
    for (let j = j0; j <= j1; j++) { const y = w2s(0, j * step).y; s += '<line class="m-grid' + (j === 0 ? ' axis' : (j % 5 === 0 ? ' major' : '')) + '" x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '"/>'; }
    return s;
  }
  function mapRulerInner(W, H) {
    const step = niceStep(70, state.mapEd.view.zoom); if (!isFinite(step) || step <= 0) return '';
    const RB = 18, LB = 42; let s = '';
    s += '<rect class="m-ruler-bg" x="0" y="0" width="' + W + '" height="' + RB + '"/>';
    s += '<rect class="m-ruler-bg" x="0" y="0" width="' + LB + '" height="' + H + '"/>';
    const wl = s2w(0, 0).x, wr = s2w(W, 0).x;
    for (let k = Math.ceil(wl / step); k <= Math.floor(wr / step); k++) { if (k % 5 !== 0) continue; const x = w2s(k * step, 0).x; if (x < LB) continue; s += '<line class="m-tick" x1="' + x + '" y1="' + (RB - 5) + '" x2="' + x + '" y2="' + RB + '"/><text class="m-rlbl" x="' + (x + 2) + '" y="' + (RB - 6) + '">' + fmtCoord(k * step) + '</text>'; }
    const wb = s2w(0, H).y, wt = s2w(0, 0).y;
    for (let j = Math.ceil(wb / step); j <= Math.floor(wt / step); j++) { if (j % 5 !== 0) continue; const y = w2s(0, j * step).y; if (y < RB) continue; s += '<line class="m-tick" x1="' + (LB - 5) + '" y1="' + y + '" x2="' + LB + '" y2="' + y + '"/><text class="m-rlbl" x="3" y="' + (y - 3) + '">' + fmtCoord(j * step) + '</text>'; }
    s += '<rect class="m-ruler-bg" x="0" y="0" width="' + LB + '" height="' + RB + '"/>';
    return s;
  }
  function mapCanvasInner(W, H) {
    const ed = state.mapEd, m = state.map, v = ed.view;
    let s = '<defs><marker id="medge" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="context-stroke" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>';
    if (ed.grid) s += mapGridInner(W, H);
    const bg = ed.bg;
    if (bg && bg.dataUrl && bg.imgW) {
      const wm = bg.imgW * bg.metersPerPixel, hm = bg.imgH * bg.metersPerPixel, tl = w2s(bg.offsetX, bg.offsetY + hm);
      s += '<image href="' + bg.dataUrl + '" x="' + tl.x + '" y="' + tl.y + '" width="' + (wm * v.zoom) + '" height="' + (hm * v.zoom) + '" preserveAspectRatio="none" opacity="' + (bg.opacity != null ? bg.opacity : 0.6) + '"/>';
    }
    const emergIds = emergencyAreaIds();
    (m.areas || []).forEach((a) => {
      if (!(a.points || []).length) return;
      const isEm = emergIds.has(a.id);
      const pts = a.points.map((p) => { const sc = w2s(p.mapX, p.mapY); return sc.x + ',' + sc.y; }).join(' ');
      s += '<polygon class="m-area' + (isEm ? ' emerg' : '') + (isSel('area', a.id) ? ' sel' : '') + '" points="' + pts + '" data-mt="area" data-mid="' + esc(a.id) + '"/>';
      const c = w2s(a.points[0].mapX, a.points[0].mapY); s += '<text class="m-lbl' + (isEm ? ' emerg' : '') + '" x="' + (c.x + 6) + '" y="' + (c.y - 6) + '">' + esc(a.id) + (isEm ? ' ⚠' : '') + '</text>';
    });
    if (ed.areaDraft && ed.areaDraft.length) {
      const dcls = ed.areaDraftKind === 'earea' ? ' emerg' : '';
      const closable = ed.areaDraft.length >= (ed.areaDraftKind === 'earea' ? 4 : 3);
      const pts = ed.areaDraft.map((p) => { const sc = w2s(p.x, p.y); return sc.x + ',' + sc.y; }).join(' ');
      s += '<polyline class="m-draft' + dcls + '" fill="none" points="' + pts + '"/>';
      if (closable && ed.areaDraft.length > 2) { // preview of the closing edge
        const a = w2s(ed.areaDraft[ed.areaDraft.length - 1].x, ed.areaDraft[ed.areaDraft.length - 1].y);
        const b = w2s(ed.areaDraft[0].x, ed.areaDraft[0].y);
        s += '<line class="m-draft' + dcls + ' faint" x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"/>';
      }
      ed.areaDraft.forEach((p, pi) => {
        const sc = w2s(p.x, p.y);
        if (pi === 0 && closable) s += '<circle class="m-draftpt' + dcls + ' close" cx="' + sc.x + '" cy="' + sc.y + '" r="8"/><text class="m-clbl" x="' + (sc.x + 11) + '" y="' + (sc.y + 4) + '">click to close</text>';
        s += '<circle class="m-draftpt' + dcls + '" cx="' + sc.x + '" cy="' + sc.y + '" r="3"/>';
      });
    }
    (m.navigationGraphs || []).forEach((g, gi) => {
      const active = gi === ed.gi, np = {};
      (g.nodes || []).forEach((n) => { np[n.id] = g2m(g, n.graphX, n.graphY); });
      (g.edges || []).forEach((e) => {
        const a = np[e.startNodeId], b = np[e.endNodeId]; if (!a || !b) return;
        const pa = w2s(a.x, a.y), pb = w2s(b.x, b.y);
        s += '<line class="m-edge' + (active ? '' : ' dim') + (isSel('edge', e.id, g.id) ? ' sel' : '') + '" x1="' + pa.x + '" y1="' + pa.y + '" x2="' + pb.x + '" y2="' + pb.y + '" marker-end="url(#medge)" data-mt="edge" data-mid="' + esc(e.id) + '" data-mg="' + esc(g.id) + '"/>';
      });
      (g.nodes || []).forEach((n) => {
        const p = w2s(np[n.id].x, np[n.id].y);
        const from = active && ed.mode === 'edge' && ed.edgeFrom === n.id;
        const cls = 'm-node' + (active ? '' : ' dim') + (isSel('node', n.id, g.id) ? ' sel' : '') + (from ? ' from' : '') + (n.parkingSpot ? ' park' : '') + (n.emergencySpot ? ' emerg' : '');
        s += '<circle class="' + cls + '" cx="' + p.x + '" cy="' + p.y + '" r="' + (active ? 6 : 5) + '" data-mt="node" data-mid="' + esc(n.id) + '" data-mg="' + esc(g.id) + '"/>';
        if (active) {
          s += '<text class="m-lbl" x="' + (p.x + 8) + '" y="' + (p.y - 8) + '" data-mt="node" data-mid="' + esc(n.id) + '" data-mg="' + esc(g.id) + '">' + esc(n.id) + '</text>';
          if (ed.coords) { const mp = np[n.id]; s += '<text class="m-clbl" x="' + (p.x + 8) + '" y="' + (p.y + 7) + '">loc ' + rnd(n.graphX) + ', ' + rnd(n.graphY) + '</text><text class="m-clbl" x="' + (p.x + 8) + '" y="' + (p.y + 18) + '">map ' + rnd(mp.x) + ', ' + rnd(mp.y) + '</text>'; }
        }
      });
    });
    allStations().forEach(({ st, group }) => {
      const p = w2s(st.mapX, st.mapY);
      s += '<rect class="m-station' + (isSel('station', st.id) ? ' sel' : '') + (group ? '' : ' ungrouped') + '" x="' + (p.x - 7) + '" y="' + (p.y - 7) + '" width="14" height="14" rx="4" data-mt="station" data-mid="' + esc(st.id) + '"/>';
      s += '<text class="m-lbl" x="' + (p.x + 10) + '" y="' + (p.y + 4) + '" data-mt="station" data-mid="' + esc(st.id) + '">' + esc(st.id) + '</text>';
    });
    (m.chargingStations || []).forEach((c) => {
      const p = w2s(c.mapX, c.mapY);
      s += '<polygon class="m-charger' + (isSel('charger', c.id) ? ' sel' : '') + '" points="' + p.x + ',' + (p.y - 8) + ' ' + (p.x + 6.93) + ',' + (p.y - 4) + ' ' + (p.x + 6.93) + ',' + (p.y + 4) + ' ' + p.x + ',' + (p.y + 8) + ' ' + (p.x - 6.93) + ',' + (p.y + 4) + ' ' + (p.x - 6.93) + ',' + (p.y - 4) + '" data-mt="charger" data-mid="' + esc(c.id) + '"/>';
      s += '<text class="m-lbl" x="' + (p.x + 10) + '" y="' + (p.y + 4) + '" data-mt="charger" data-mid="' + esc(c.id) + '">' + esc(c.id) + '</text>';
    });
    (m.trafficLights || []).forEach((l) => {
      const p = w2s(l.mapX, l.mapY);
      s += '<polygon class="m-light' + (isSel('light', l.id) ? ' sel' : '') + '" points="' + p.x + ',' + (p.y - 8) + ' ' + (p.x + 7) + ',' + (p.y + 5) + ' ' + (p.x - 7) + ',' + (p.y + 5) + '" data-mt="light" data-mid="' + esc(l.id) + '"/>';
      s += '<text class="m-lbl" x="' + (p.x + 10) + '" y="' + (p.y + 4) + '" data-mt="light" data-mid="' + esc(l.id) + '">' + esc(l.id) + '</text>';
    });
    const accSel = selOne();
    if (accSel && (accSel.type === 'station' || accSel.type === 'charger')) {
      const el = accessTarget(accSel);
      if (el) { const sp = w2s(el.mapX, el.mapY);
        (el.accessNodes || []).forEach((a) => { const wp = nodeMapPos(a.navigationGraphId, a.nodeId); if (wp) { const npm = w2s(wp.x, wp.y); s += '<line class="m-acc" x1="' + sp.x + '" y1="' + sp.y + '" x2="' + npm.x + '" y2="' + npm.y + '"/><circle class="m-accnode" cx="' + npm.x + '" cy="' + npm.y + '" r="9"/>'; } });
      }
    }
    // ---- reservation-dependency highlight (deps tool, or a selected first node) ----
    if (ed.mode === 'deps') {
      (state.deps || []).forEach((d, i) => { if (i === ed.depSel) return; const p0 = nodeMapPos(d.fromNavigationGraph, d.fromNode); if (p0) { const sp = w2s(p0.x, p0.y); s += '<circle class="m-depmark" cx="' + sp.x + '" cy="' + sp.y + '" r="9"/>'; } });
    }
    let depShow = ed.mode === 'deps' ? activeDep() : null;
    if (!depShow && accSel && accSel.type === 'node') depShow = (state.deps || []).find((d) => d.fromNavigationGraph === accSel.graphId && d.fromNode === accSel.id) || null;
    if (depShow) {
      const p0 = nodeMapPos(depShow.fromNavigationGraph, depShow.fromNode);
      if (p0) {
        const sp = w2s(p0.x, p0.y);
        (depShow.to || []).forEach((t) => (t.nodes || []).forEach((nid) => { const wp = nodeMapPos(t.navigationGraph, nid); if (wp) { const np2 = w2s(wp.x, wp.y); s += '<line class="m-dep" x1="' + sp.x + '" y1="' + sp.y + '" x2="' + np2.x + '" y2="' + np2.y + '"/><circle class="m-depto" cx="' + np2.x + '" cy="' + np2.y + '" r="9"/>'; } }));
        s += '<circle class="m-depfrom" cx="' + sp.x + '" cy="' + sp.y + '" r="10"/>';
      }
    }
    // ---- waiting-spot highlight (waiting tool, or a selected station's group spots) ----
    if (ed.mode === 'wspot') {
      const w0 = activeWs();
      if (w0) (w0.nodes || []).forEach((n) => { const wp = nodeMapPos(n.navigationGraphId, n.nodeId); if (wp) { const p = w2s(wp.x, wp.y); s += '<circle class="m-wsnode" cx="' + p.x + '" cy="' + p.y + '" r="10"/>'; } });
    }
    if (accSel && accSel.type === 'station') {
      const grp = groupOfStation(accSel.id), st0 = accessTarget(accSel);
      if (grp && st0) {
        const sp = w2s(st0.mapX, st0.mapY);
        (grp.waitingSpots || []).forEach((ref) => {
          const w1 = (m.waitingSpots || []).find((x) => x.id === (ref && ref.id)); if (!w1) return;
          (w1.nodes || []).forEach((n) => { const wp = nodeMapPos(n.navigationGraphId, n.nodeId); if (wp) { const p = w2s(wp.x, wp.y); s += '<line class="m-wslink" x1="' + sp.x + '" y1="' + sp.y + '" x2="' + p.x + '" y2="' + p.y + '"/><circle class="m-wsnode" cx="' + p.x + '" cy="' + p.y + '" r="9"/>'; } });
        });
      }
    }
    if (ed.marquee) { const q = ed.marquee; s += '<rect class="m-marquee" x="' + q.minX + '" y="' + q.minY + '" width="' + (q.maxX - q.minX) + '" height="' + (q.maxY - q.minY) + '"/>'; }
    if (ed.grid) s += mapRulerInner(W, H);
    return s;
  }

  // ---- canvas interaction ----  left = select/move/marquee/pan · right = create
  function svgPoint(e) { const svg = document.getElementById('map-svg'); const r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, W: r.width, H: r.height }; }
  function hitTarget(e) { const t = e.target.closest('[data-mt]'); return t ? { type: t.getAttribute('data-mt'), id: t.getAttribute('data-mid'), graphId: t.getAttribute('data-mg') || undefined } : null; }
  function mapDirty() { state.mapEd._dirty = true; }
  function paintAndInfo() { paintCanvas(); const box = document.getElementById('map-info'); if (box) box.innerHTML = mapInfoInner(); }
  function updateReadout(e) {
    const pt = svgPoint(e), w = s2w(pt.x, pt.y);
    const ro = document.getElementById('map-readout'); if (ro) ro.textContent = 'x ' + rnd(w.x) + '   y ' + rnd(w.y);
    const xv = document.getElementById('map-xh-v'); if (xv) xv.style.left = pt.x + 'px';
    const xh = document.getElementById('map-xh-h'); if (xh) xh.style.top = pt.y + 'px';
  }

  function onCanvasWheel(e) {
    e.preventDefault(); const pt = svgPoint(e), v = state.mapEd.view, before = s2w(pt.x, pt.y);
    v.zoom = Math.max(1, Math.min(2000, v.zoom * Math.exp(-e.deltaY * 0.0015)));
    v.x = pt.x - before.x * v.zoom; v.y = pt.y + before.y * v.zoom; paintCanvas();
  }
  function movableRef(sel) {
    if (sel.type === 'node') { const g = (state.map.navigationGraphs || []).find((x) => x.id === sel.graphId); const n = g && nodeById(g, sel.id); if (n) return { kind: 'node', g, n }; }
    else if (sel.type === 'station') { const f = allStations().find((x) => x.st.id === sel.id); if (f) return { kind: 'map', el: f.st }; }
    else if (sel.type === 'charger') { const c = (state.map.chargingStations || []).find((c) => c.id === sel.id); if (c) return { kind: 'map', el: c }; }
    else if (sel.type === 'light') { const l = (state.map.trafficLights || []).find((l) => l.id === sel.id); if (l) return { kind: 'map', el: l }; }
    return null;
  }
  function nodeMapPos(graphId, nodeId) { const g = (state.map.navigationGraphs || []).find((x) => x.id === graphId); if (!g) return null; const n = nodeById(g, nodeId); return n ? g2m(g, n.graphX, n.graphY) : null; }
  // Map-frame position of any point-like element (node / station / charger / light).
  function elMapPos(type, id, graphId) {
    if (type === 'node') return nodeMapPos(graphId, id);
    if (type === 'station') { const f = allStations().find((x) => x.st.id === id); return f ? { x: f.st.mapX, y: f.st.mapY } : null; }
    if (type === 'charger') { const c = (state.map.chargingStations || []).find((x) => x.id === id); return c ? { x: c.mapX, y: c.mapY } : null; }
    if (type === 'light') { const l = (state.map.trafficLights || []).find((x) => x.id === id); return l ? { x: l.mapX, y: l.mapY } : null; }
    return null;
  }
  const OVERLAP_TYPES = ['node', 'station', 'charger', 'light'];
  // All point objects — nodes of any graph, stations, chargers, traffic lights — within `radius`
  // metres of the clicked element. Default radius: 0.1 m, but never more than ~12 px at the current
  // zoom, so objects that are clearly separate on screen (high zoom) don't trigger the picker.
  // Nearest first; on ties, active-graph nodes first.
  function overlapCandidates(hit, radius) {
    const r = radius == null ? Math.min(0.1, 12 / ((state.mapEd.view && state.mapEd.view.zoom) || 30)) : radius;
    const p0 = elMapPos(hit.type, hit.id, hit.graphId); if (!p0) return [];
    const out = [];
    const add = (type, id, graphId, p) => { const d = Math.hypot(p.x - p0.x, p.y - p0.y); if (d <= r) out.push({ type, id, graphId, dist: d }); };
    (state.map.navigationGraphs || []).forEach((g) => (g.nodes || []).forEach((n) => add('node', n.id, g.id, g2m(g, n.graphX, n.graphY))));
    allStations().forEach(({ st }) => add('station', st.id, undefined, { x: st.mapX, y: st.mapY }));
    (state.map.chargingStations || []).forEach((c) => add('charger', c.id, undefined, { x: c.mapX, y: c.mapY }));
    (state.map.trafficLights || []).forEach((l) => add('light', l.id, undefined, { x: l.mapX, y: l.mapY }));
    const ag = (mapGraph() || {}).id;
    out.sort((a, b) => (a.dist - b.dist) || ((b.type === 'node' && b.graphId === ag) - (a.type === 'node' && a.graphId === ag)));
    return out;
  }
  function accessTarget(sel) {
    if (!sel) return null;
    if (sel.type === 'station') { const f = allStations().find((x) => x.st.id === sel.id); return f ? f.st : null; }
    if (sel.type === 'charger') return (state.map.chargingStations || []).find((c) => c.id === sel.id) || null;
    return null;
  }
  function toggleAccessNode(sel, graphId, nodeId) {
    const el = accessTarget(sel); if (!el) return;
    el.accessNodes = el.accessNodes || [];
    const i = el.accessNodes.findIndex((a) => a.navigationGraphId === graphId && a.nodeId === nodeId);
    if (i >= 0) el.accessNodes.splice(i, 1); else el.accessNodes.push({ navigationGraphId: graphId, nodeId: nodeId });
  }
  // ---- dependencies / waiting-spot node clicks ----
  function sidePanelRefresh() {
    const sideEl = document.getElementById('map-side');
    if (sideEl) sideEl.innerHTML = state.mapEd.mode === 'deps' ? depsPanelHTML() : wsPanelHTML();
    paintAndInfo();
  }
  function onDepNodeClick(graphId, nodeId) {
    const ed = state.mapEd, d = activeDep();
    if (!d) {
      const i = state.deps.findIndex((x) => x.fromNavigationGraph === graphId && x.fromNode === nodeId);
      if (i >= 0) ed.depSel = i;
      else { state.deps.push({ fromNode: nodeId, fromNavigationGraph: graphId, to: [] }); ed.depSel = state.deps.length - 1; toast('First node set', graphId + ' : ' + nodeId + ' — now click its dependent nodes.', 'success'); }
    } else if (ed.depPickFrom) { d.fromNode = nodeId; d.fromNavigationGraph = graphId; ed.depPickFrom = false; }
    else if (d.fromNavigationGraph === graphId && d.fromNode === nodeId) { toast('That is the first node', 'Click other nodes to toggle dependents, or Done to finish this entry.', ''); }
    else toggleDepTarget(d, graphId, nodeId);
    persist(); sidePanelRefresh();
  }
  function onWsNodeClick(graphId, nodeId) {
    const ed = state.mapEd; let w = activeWs();
    if (!w) {
      const i = (state.map.waitingSpots || []).findIndex((x) => (x.nodes || []).some((n) => n.navigationGraphId === graphId && n.nodeId === nodeId));
      if (i >= 0) { ed.wsSel = i; sidePanelRefresh(); return; }
      state.map.waitingSpots.push({ id: nextWsId(), nodes: [] });
      ed.wsSel = state.map.waitingSpots.length - 1; w = activeWs();
      toast('Waiting spot created', w.id + ' — keep clicking nodes to add them.', 'success');
    }
    const j = (w.nodes || []).findIndex((n) => n.navigationGraphId === graphId && n.nodeId === nodeId);
    if (j >= 0) w.nodes.splice(j, 1); else w.nodes.push({ navigationGraphId: graphId, nodeId: nodeId });
    mapDirty(); persist(); sidePanelRefresh();
  }
  function onCanvasDown(e) {
    const ed = state.mapEd, pt = svgPoint(e), hit = hitTarget(e);
    const pan = (e.button === 1) || (e.button === 0 && ed._space);
    if (e.button !== 0 && !pan) return; // right button handled by contextmenu (create)
    if (pan) { e.preventDefault(); ed.drag = { kind: 'pan', sx: pt.x, sy: pt.y, vx: ed.view.x, vy: ed.view.y }; return; }
    // Emergency-area drawing: left-click places points; clicking the first point again closes the area.
    if (ed.mode === 'earea') {
      const d0 = ed.areaDraft;
      if (d0 && d0.length >= 4) {
        const p0 = w2s(d0[0].x, d0[0].y);
        if (Math.hypot(pt.x - p0.x, pt.y - p0.y) <= 14) { finishArea(); return; }
      }
      const wpt = s2w(pt.x, pt.y);
      if (!d0 || !d0.length) { ed.areaDraftKind = 'earea'; ed.areaDraft = []; }
      ed.areaDraft.push({ x: rnd(wpt.x), y: rnd(wpt.y) });
      render(); // refresh the Finish button, point count and canvas
      return;
    }
    if (hit) {
      const obj = { type: hit.type, id: hit.id, graphId: hit.graphId };
      if (e.shiftKey) { toggleSel(obj); ed.drag = null; paintAndInfo(); return; }
      // dependencies / waiting-spot tools consume node clicks
      if (hit.type === 'node' && ed.mode === 'deps') { onDepNodeClick(hit.graphId, hit.id); return; }
      if (hit.type === 'node' && ed.mode === 'wspot') { onWsNodeClick(hit.graphId, hit.id); return; }
      // assign access nodes by clicking — only while the matching tool (Station/Charger) is active
      const oneSel = selOne();
      if (hit.type === 'node' && oneSel && (oneSel.type === 'station' || oneSel.type === 'charger') && ed.mode === oneSel.type) { toggleAccessNode(oneSel, hit.graphId, hit.id); persist(); mapDirty(); paintAndInfo(); return; }
      // several objects on one spot (nodes/stations/chargers/lights) → open the picker instead of
      // guessing; if one of them is already selected (picked from the panel), treat the click as
      // that object so dragging moves the chosen one
      if (OVERLAP_TYPES.includes(hit.type)) {
        const cands = overlapCandidates(hit);
        if (cands.length > 1) {
          const selCand = cands.find((c) => isSel(c.type, c.id, c.graphId));
          if (!selCand) {
            ed.overlap = { items: cands };
            setSel({ type: hit.type, id: hit.id, graphId: hit.graphId });
            ed.drag = null; render(); return;
          }
          obj.type = selCand.type; obj.id = selCand.id; obj.graphId = selCand.graphId;
        }
      }
      if (!isSelObj(obj)) setSel(obj);
      const startMouse = s2w(pt.x, pt.y);
      const items = (ed.selset || []).map(movableRef).filter(Boolean).map((r) => { let sx, sy; if (r.kind === 'node') { const p = g2m(r.g, r.n.graphX, r.n.graphY); sx = p.x; sy = p.y; } else { sx = r.el.mapX; sy = r.el.mapY; } return { r, sx, sy }; });
      ed.drag = items.length ? { kind: 'move', items, startMouse, moved: false } : null;
      paintAndInfo();
    } else if (e.shiftKey) { ed.drag = { kind: 'marquee', x0: pt.x, y0: pt.y, add: true }; ed.marquee = { minX: pt.x, minY: pt.y, maxX: pt.x, maxY: pt.y }; }
    else { setSel(null); ed.drag = { kind: 'pan', sx: pt.x, sy: pt.y, vx: ed.view.x, vy: ed.view.y }; if (ed.overlap) { ed.overlap = null; render(); } else paintAndInfo(); }
  }
  function onCanvasMove(e) {
    const ed = state.mapEd, d = ed.drag; if (!d) return; const pt = svgPoint(e);
    if (d.kind === 'pan') { ed.view.x = d.vx + (pt.x - d.sx); ed.view.y = d.vy + (pt.y - d.sy); paintCanvas(); return; }
    if (d.kind === 'marquee') { ed.marquee = { minX: Math.min(d.x0, pt.x), minY: Math.min(d.y0, pt.y), maxX: Math.max(d.x0, pt.x), maxY: Math.max(d.y0, pt.y) }; paintCanvas(); return; }
    if (d.kind === 'move') { const w = s2w(pt.x, pt.y), dx = w.x - d.startMouse.x, dy = w.y - d.startMouse.y; d.items.forEach((it) => { const nx = it.sx + dx, ny = it.sy + dy; if (it.r.kind === 'node') { const loc = m2g(it.r.g, nx, ny); it.r.n.graphX = rnd(loc.x); it.r.n.graphY = rnd(loc.y); } else { it.r.el.mapX = rnd(nx); it.r.el.mapY = rnd(ny); } }); d.moved = true; mapDirty(); paintAndInfo(); }
  }
  function onCanvasUp() {
    const ed = state.mapEd, d = ed.drag; if (!d) return;
    if (d.kind === 'marquee') { const rect = ed.marquee; ed.marquee = null; ed.drag = null; if (rect && (rect.maxX - rect.minX > 3 || rect.maxY - rect.minY > 3)) { marqueeSelect(rect, d.add); paintAndInfo(); } else paintCanvas(); return; }
    ed.drag = null; if (d.kind === 'move' && d.moved) persist();
  }
  function marqueeSelect(rect, add) {
    const inR = (p) => p.x >= rect.minX && p.x <= rect.maxX && p.y >= rect.minY && p.y <= rect.maxY;
    const res = []; const g = mapGraph();
    if (g) (g.nodes || []).forEach((n) => { const wp = g2m(g, n.graphX, n.graphY); if (inR(w2s(wp.x, wp.y))) res.push({ type: 'node', id: n.id, graphId: g.id }); });
    allStations().forEach(({ st }) => { if (inR(w2s(st.mapX, st.mapY))) res.push({ type: 'station', id: st.id }); });
    (state.map.chargingStations || []).forEach((c) => { if (inR(w2s(c.mapX, c.mapY))) res.push({ type: 'charger', id: c.id }); });
    (state.map.trafficLights || []).forEach((l) => { if (inR(w2s(l.mapX, l.mapY))) res.push({ type: 'light', id: l.id }); });
    if (add) res.forEach((o) => { if (!isSelObj(o)) state.mapEd.selset.push(o); });
    else state.mapEd.selset = res;
  }
  function onContextMenu(e) {
    if (state.view !== 'map' || !e.target.closest('#map-svg')) return;
    e.preventDefault();
    const ed = state.mapEd, g = mapGraph(), pt = svgPoint(e), hit = hitTarget(e), w = s2w(pt.x, pt.y), tool = ed.mode;
    if (tool === 'select') return;
    if (tool === 'node') { if (!g) { toast('No graph', 'Add a navigation graph first.', 'error'); return; } const local = m2g(g, w.x, w.y), id = nextNodeId(g); g.nodes.push({ id, graphX: rnd(local.x), graphY: rnd(local.y), graphZ: 0 }); setSel({ type: 'node', id, graphId: g.id }); persist(); mapDirty(); paintAndInfo(); }
    else if (tool === 'edge') { if (hit && hit.type === 'node' && g && hit.graphId === g.id) { if (!ed.edgeFrom) ed.edgeFrom = hit.id; else if (ed.edgeFrom !== hit.id) { addEdge(g, ed.edgeFrom, hit.id); ed.edgeFrom = null; persist(); mapDirty(); } } else ed.edgeFrom = null; paintCanvas(); }
    else if (tool === 'station') { addStationAt(rnd(w.x), rnd(w.y)); persist(); mapDirty(); paintAndInfo(); }
    else if (tool === 'charger') { addPointEl('chargingStations', rnd(w.x), rnd(w.y)); persist(); mapDirty(); paintAndInfo(); }
    else if (tool === 'light') { addPointEl('trafficLights', rnd(w.x), rnd(w.y)); persist(); mapDirty(); paintAndInfo(); }
    else if (tool === 'area' || tool === 'earea') { if (!ed.areaDraft || !ed.areaDraft.length) { ed.areaDraftKind = tool; ed.areaDraft = []; } ed.areaDraft.push({ x: rnd(w.x), y: rnd(w.y) }); render(); }
  }
  function onCanvasDblClick(e) {
    const ed = state.mapEd;
    if ((ed.mode === 'area' || ed.mode === 'earea') && ed.areaDraft && ed.areaDraft.length >= 3) { finishArea(); return; }
    const hit = hitTarget(e); if (!hit) return;
    if (OVERLAP_TYPES.includes(hit.type)) {
      const cands = overlapCandidates(hit);
      if (cands.length > 1) {
        // edit the candidate the user picked (selected); otherwise show the picker first
        const selCand = cands.find((c) => isSel(c.type, c.id, c.graphId));
        if (selCand) openMapDialogFor({ type: selCand.type, id: selCand.id, graphId: selCand.graphId });
        else { ed.overlap = { items: cands }; setSel({ type: hit.type, id: hit.id, graphId: hit.graphId }); render(); }
        return;
      }
    }
    openMapDialogFor(hit);
  }

  // ---- map mutations ----
  function addEdge(g, a, b) {
    const ids = new Set((g.edges || []).map((e) => e.id));
    const ex = (s, t) => g.edges.some((e) => e.startNodeId === s && e.endNodeId === t);
    if (!ex(a, b)) { const id = uniqueId(ids, edgeIdFor(g, a, b)); ids.add(id); g.edges.push({ id, startNodeId: a, endNodeId: b }); }
    if (state.mapEd.edgeBidir && !ex(b, a)) { const id = uniqueId(ids, edgeIdFor(g, b, a)); ids.add(id); g.edges.push({ id, startNodeId: b, endNodeId: a }); }
  }
  function addStationAt(x, y) {
    const used = new Set(allStations().map((s) => s.st.id)); let i = 1, id; do { id = 'S' + i; i++; } while (used.has(id));
    const st = { id, mapX: x, mapY: y, mapZ: 0, width: 5, height: 5, length: 5, accessNodes: [] };
    state.mapEd.ungroupedStations.push(st); setSel({ type: 'station', id });
  }
  function addPointEl(arrKey, x, y) {
    const arr = state.map[arrKey]; const used = new Set(arr.map((e) => e.id)); const pre = arrKey === 'chargingStations' ? 'C' : 'L';
    let i = 1, id; do { id = pre + i; i++; } while (used.has(id));
    const el = { id, mapX: x, mapY: y, mapZ: 0 };
    if (arrKey === 'chargingStations') { el.length = 5; el.width = 5; el.height = 5; el.controlled = true; el.accessNodes = []; }
    arr.push(el); setSel({ type: arrKey === 'chargingStations' ? 'charger' : 'light', id });
  }
  function finishArea() {
    const d = state.mapEd.areaDraft, kind = state.mapEd.areaDraftKind || 'area';
    const min = kind === 'earea' ? 4 : 3; // emergency areas need 4+ points
    if (!d || !d.length) { state.mapEd.areaDraft = null; paintCanvas(); return; }
    if (d.length < min) { toast('Need at least ' + min + ' points', 'Right-click to add more points, or press Esc to cancel.', 'error'); return; }
    const pre = kind === 'earea' ? 'earea' : 'area';
    const used = new Set((state.map.areas || []).map((a) => a.id)); let i = 1, id; do { id = pre + i; i++; } while (used.has(id));
    state.map.areas.push({ id, points: d.map((p) => ({ mapX: p.x, mapY: p.y })) });
    if (kind === 'earea') {
      state.map.emergencyDetectors.push({ id: id + ' Detector', areas: [id] });
      toast('Emergency area created', id + ' + "' + id + ' Detector". Double-click the area to rename it; use Detectors to group areas.', 'success');
    }
    state.mapEd.areaDraft = null; setSel({ type: 'area', id }); persist(); mapDirty(); render();
  }
  function cleanAccessNodes(graphId) {
    allStations().forEach(({ st }) => { st.accessNodes = (st.accessNodes || []).filter((a) => a.navigationGraphId !== graphId); });
    (state.map.chargingStations || []).forEach((c) => { c.accessNodes = (c.accessNodes || []).filter((a) => a.navigationGraphId !== graphId); });
    (state.map.limitedCapacityAreas || []).forEach((l) => { l.nodes = (l.nodes || []).filter((n) => n.navigationGraphId !== graphId); });
    removeGraphFromExtras(graphId);
  }
  function deleteOne(sel) {
    if (sel.type === 'node') {
      const g = (state.map.navigationGraphs || []).find((gg) => gg.id === sel.graphId); if (!g) return;
      g.nodes = g.nodes.filter((n) => n.id !== sel.id);
      g.edges = g.edges.filter((e) => e.startNodeId !== sel.id && e.endNodeId !== sel.id);
      allStations().forEach(({ st }) => { st.accessNodes = (st.accessNodes || []).filter((a) => !(a.navigationGraphId === g.id && a.nodeId === sel.id)); });
      removeNodeFromExtras(g.id, sel.id);
    } else if (sel.type === 'edge') {
      const g = (state.map.navigationGraphs || []).find((gg) => gg.id === sel.graphId); if (g) g.edges = g.edges.filter((e) => e.id !== sel.id);
    } else if (sel.type === 'station') {
      state.mapEd.ungroupedStations = state.mapEd.ungroupedStations.filter((s) => s.id !== sel.id);
      (state.map.handlingStationGroups || []).forEach((grp) => { grp.handlingStations = grp.handlingStations.filter((s) => s.id !== sel.id); });
    } else if (sel.type === 'charger') state.map.chargingStations = state.map.chargingStations.filter((c) => c.id !== sel.id);
    else if (sel.type === 'light') state.map.trafficLights = state.map.trafficLights.filter((l) => l.id !== sel.id);
    else if (sel.type === 'area') { state.map.areas = state.map.areas.filter((a) => a.id !== sel.id); (state.map.emergencyDetectors || []).forEach((d) => { d.areas = (d.areas || []).filter((n) => n !== sel.id); }); state.map.emergencyDetectors = (state.map.emergencyDetectors || []).filter((d) => (d.areas || []).length); }
  }
  function deleteMapSelection() {
    const sels = (state.mapEd.selset || []).slice(); if (!sels.length) return;
    if (sels.length > 1 && !confirm('Delete ' + sels.length + ' selected objects?')) return;
    sels.forEach(deleteOne);
    state.mapEd.selset = []; state.mapEd.overlap = null; persist(); mapDirty(); render();
  }
  function openMapDialogFor(hit) {
    const ed = state.mapEd; setSel({ type: hit.type, id: hit.id, graphId: hit.graphId });
    if (hit.type === 'node') ed.dialog = { kind: 'node', graphId: hit.graphId, id: hit.id };
    else if (hit.type === 'edge') ed.dialog = { kind: 'edge', graphId: hit.graphId, id: hit.id };
    else if (hit.type === 'station') ed.dialog = { kind: 'station', id: hit.id };
    else if (hit.type === 'charger') ed.dialog = { kind: 'charger', id: hit.id };
    else if (hit.type === 'light') ed.dialog = { kind: 'light', id: hit.id };
    else if (hit.type === 'area') ed.dialog = { kind: 'area', id: hit.id };
    else return;
    render();
  }

  // -------------------------------------------------------------------- wire-up
  function init() {
    loadTheme();
    render();

    document.addEventListener('click', (e) => {
      // close open dropdowns / floating panels when clicking anywhere outside them
      // (their toggle buttons are excluded here so their own click still toggles them closed)
      let closed = false;
      if (state.mapEd.viewMenu && !e.target.closest('#view-menu') && !e.target.closest('[data-act="viewMenu"]')) { state.mapEd.viewMenu = false; closed = true; }
      if (state.mapEd.translatePanel && !e.target.closest('.map-translate') && !e.target.closest('.modal-overlay') && !e.target.closest('[data-act="graphTranslate"]')) { state.mapEd.translatePanel = false; closed = true; }
      if (closed) render();
      const t = e.target.closest('[data-act]');
      if (!t) return;
      if (t.dataset.act === 'collapse' && e.target.closest('[data-stop]')) return;
      // clicking inside a [data-stop] modal body must not trigger the overlay's close action
      if (t.classList.contains('modal-overlay') && e.target.closest('[data-stop]')) return;
      // form controls (select/checkbox) are handled on 'change', not click
      if (t.tagName === 'SELECT' || (t.tagName === 'INPUT' && (t.type === 'checkbox' || t.type === 'number'))) return;
      e.preventDefault();
      handleAction(t.dataset.act, { i: t.dataset.i != null ? +t.dataset.i : null, s: t.dataset.s != null ? +t.dataset.s : null, a: t.dataset.a != null ? +t.dataset.a : null, el: t });
    });
    const routeFormControl = (e) => {
      const el = e.target.closest('[data-act]');
      if (el && (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) { handleAction(el.dataset.act, { el, i: el.dataset.i != null ? +el.dataset.i : null }); return true; }
      return false;
    };
    document.addEventListener('input', (e) => { if (e.target.closest('[data-search]')) return onSearch(e); const tr = e.target.closest('[data-act="trans"]'); if (tr) { handleAction('trans', { el: tr }); return; } if (e.target.closest('[data-act]')) return; onField(e); });
    document.addEventListener('change', (e) => { if (e.target.closest('[data-search]')) return; if (routeFormControl(e)) return; onField(e); });

    // ---- map editor canvas interaction ----
    const overSvg = (e) => e.target && e.target.closest && e.target.closest('#map-svg');
    document.addEventListener('wheel', (e) => { if (state.view !== 'map' || !overSvg(e)) return; onCanvasWheel(e); }, { passive: false });
    document.addEventListener('mousedown', (e) => { if (state.view !== 'map' || !overSvg(e)) return; onCanvasDown(e); });
    document.addEventListener('mousemove', (e) => { if (state.view !== 'map') return; if (overSvg(e)) updateReadout(e); if (state.mapEd.drag) onCanvasMove(e); });
    document.addEventListener('mouseup', () => { if (state.view !== 'map') return; onCanvasUp(); });
    document.addEventListener('dblclick', (e) => { if (state.view !== 'map' || !overSvg(e)) return; onCanvasDblClick(e); });
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keyup', (e) => { if (e.key === ' ') state.mapEd._space = false; });
    window.addEventListener('resize', () => { if (state.view === 'map') paintCanvas(); });

    const mi = $('#map-input');
    mi.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { try { loadMapData(JSON.parse(reader.result), file.name); } catch (err) { toast('Invalid JSON', String(err.message || err), 'error'); } };
      reader.readAsText(file); mi.value = '';
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' && state.view === 'map' && !state.mapEd.dialog && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) { state.mapEd._space = true; e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (state.editingSample) { state.saveDialog = true; render(); } else if (state.view === 'map' || state.graphs.length) openExport(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); doLoadMap(); }
      else if (e.key === 'Enter' && state.view === 'map' && !state.mapEd.dialog && state.mapEd.areaDraft && state.mapEd.areaDraft.length && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); finishArea(); }
      else if (e.key === 'Escape') {
        if (state.mapEd.dialog) { state.mapEd.dialog = null; render(); }
        else if (state.mapEd.viewMenu || state.mapEd.translatePanel) { state.mapEd.viewMenu = false; state.mapEd.translatePanel = false; render(); }
        else if (state.view === 'map' && (state.mapEd.edgeFrom || state.mapEd.areaDraft || state.mapEd.depPickFrom || state.mapEd.overlap)) { state.mapEd.edgeFrom = null; state.mapEd.areaDraft = null; state.mapEd.depPickFrom = false; state.mapEd.overlap = null; render(); }
        else if (state.samplesModal || state.saveDialog || state.exportModal || (state.view === 'map' && state.preview)) { state.samplesModal = false; state.saveDialog = false; state.exportModal = false; if (state.view === 'map') state.preview = false; render(); }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && state.view === 'map' && !state.mapEd.dialog && state.mapEd.selset.length && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); deleteMapSelection(); }
    });
  }

  // Test hook (harmless in production; used by the jsdom integration test).
  if (typeof window !== 'undefined') window.__rtm = { state, addEdge, mapGraph, normalizeMap, canonicalizeMap, reconcileGraphsAfterMapEdit, g2m, m2g, rnd, allStations, newGraph, emptyMap, edgeIdFor,
    normalizeDeps, canonicalizeDeps, toggleDepTarget, onDepNodeClick, onWsNodeClick, finishArea, groupOfStation, emergencyAreaIds, nextWsId, depsFileName, removeNodeFromExtras, renameNodeInExtras, renameGraphInExtras, removeGraphFromExtras, overlapCandidates, elMapPos, nodeMapPos };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
