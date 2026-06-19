/*
 * Background animation engine for rohangrover.xyz.
 *
 * Renders a fixed-position SVG behind the page content and runs a per-frame
 * `step()` for whichever motif is selected. Motifs are pluggable: any script
 * loaded after this one can call `window.Physics.register(name, motif)` to
 * add a new background pattern. The settings panel (rendered into <h1>)
 * picks them up automatically. See assets/js/motifs/README.md for the
 * full plugin contract.
 *
 * Co-developed by Rohan Grover <rohannng@gmail.com> and Claude (Anthropic, Opus 4.7 / claude-opus-4-7).
 */

(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var NS = 'http://www.w3.org/2000/svg';
  var COLOR = '#222';
  var STORAGE_KEY = 'physics-config-v2';
  var DEFAULT_MOTIF = 'starfield';

  function intFmt(v) { return ((v | 0)) + ''; }
  function fmt2(v) { return (+v).toFixed(2); }
  function fmt3(v) { return (+v).toFixed(3); }

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  var W = 0, H = 0, mx = -9999, my = -9999;

  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  var motifGroup = el('g');
  svg.appendChild(motifGroup);

  // ============================================================
  //   PLUGIN API   window.Physics
  //
  //   Register a motif from another script:
  //     Physics.register('name', {
  //       label, defaults, params,
  //       init(cfg), step(cfg),
  //       attach?(getCfg), detach?()
  //     });
  //
  //   Shared state (live, read-only):
  //     Physics.state.W / .H        viewport size
  //     Physics.state.mx / .my      pointer position (-9999 if absent)
  //     Physics.motifGroup          SVG <g> to draw into
  //     Physics.util.el(tag,attrs)  create namespaced SVG element
  //     Physics.util.clear(node)    remove all children
  //     Physics.util.COLOR / .NS    color constant and SVG namespace
  // ============================================================
  var motifs = {};
  var Physics = window.Physics = {
    util: { NS: NS, el: el, clear: clear, COLOR: COLOR },
    motifGroup: motifGroup,
    state: {},
    register: function (name, motif) {
      motifs[name] = motif;
      if (typeof rebuildMotifSelect === 'function') rebuildMotifSelect();
    },
    setMotif: function (name) { setMotif(name); }
  };
  Object.defineProperty(Physics.state, 'W',  { get: function () { return W; } });
  Object.defineProperty(Physics.state, 'H',  { get: function () { return H; } });
  Object.defineProperty(Physics.state, 'mx', { get: function () { return mx; } });
  Object.defineProperty(Physics.state, 'my', { get: function () { return my; } });

  // ---- Persistence ----
  var savedAll = {};
  try { savedAll = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) {}
  function saveAll() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedAll)); } catch (e) {} }

  var globalDefaults = { motif: DEFAULT_MOTIF, opacity: 0.55, paused: false, panelOpen: false };
  var globalCfg = {};
  for (var gk in globalDefaults) globalCfg[gk] = globalDefaults[gk];
  var savedGlobal = savedAll.__global || {};
  for (var gk2 in savedGlobal) if (gk2 in globalDefaults) globalCfg[gk2] = savedGlobal[gk2];
  function saveGlobal() { savedAll.__global = globalCfg; saveAll(); }

  function loadCfg(name, defaults) {
    var saved = savedAll['__m:' + name] || {};
    var c = {};
    for (var k in defaults) c[k] = (k in saved) ? saved[k] : defaults[k];
    return c;
  }
  function saveCfg(name, cfg) { savedAll['__m:' + name] = cfg; saveAll(); }

  // All motifs ship as plugins in assets/js/motifs/*.js — see motifs/README.md.

  // ============================================================
  //                          ENGINE
  // ============================================================
  var currentMotif = null, currentCfg = null, currentName = '';

  function setMotif(name) {
    if (currentMotif && currentMotif.detach) currentMotif.detach();
    if (!motifs[name]) name = DEFAULT_MOTIF;
    if (!motifs[name]) {
      // Default plugin failed to load — fall back to the first registered motif.
      for (var k in motifs) { name = k; break; }
    }
    if (!motifs[name]) {
      // No motifs registered at all — nothing to render.
      currentMotif = null; currentName = '';
      return;
    }
    currentName = name;
    currentMotif = motifs[name];
    currentCfg = loadCfg(name, currentMotif.defaults);
    currentMotif.init(currentCfg);
    if (currentMotif.attach) currentMotif.attach(function () { return currentCfg; });
    globalCfg.motif = name;
    saveGlobal();
    if (paramsHost) rebuildPanelRows();
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    if (currentMotif) currentMotif.init(currentCfg);
  }

  function applyOpacity() { svg.style.opacity = globalCfg.opacity; }

  function frame() {
    if (!globalCfg.paused && currentMotif) currentMotif.step(currentCfg);
    requestAnimationFrame(frame);
  }

  function onMove(e) {
    if (e.touches && e.touches[0]) { mx = e.touches[0].clientX; my = e.touches[0].clientY; }
    else { mx = e.clientX; my = e.clientY; }
  }

  // ============================================================
  //                          PANEL
  // ============================================================
  var panel, bodyEl, paramsHost, pauseBtn, motifSelect;

  function rebuildMotifSelect() {
    if (!motifSelect) return;
    var current = motifSelect.value || currentName;
    while (motifSelect.firstChild) motifSelect.removeChild(motifSelect.firstChild);
    for (var name in motifs) {
      var opt = document.createElement('option');
      opt.value = name; opt.textContent = motifs[name].label;
      motifSelect.appendChild(opt);
    }
    if (current && motifs[current]) motifSelect.value = current;
  }

  function buildPanel() {
    var style = document.createElement('style');
    style.textContent =
      '.phys-panel{position:relative;display:inline-block;vertical-align:middle;margin-left:10px;z-index:9999;font-family:monospace;font-size:11px;line-height:1.4;color:#222;font-weight:normal;}' +
      '.phys-toggle{background:#fff;color:#222;border:1px solid #999;width:22px;height:22px;border-radius:4px;cursor:pointer;font-size:12px;padding:0;line-height:1;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 1px 2px rgba(0,0,0,0.12);vertical-align:middle;}' +
      '.phys-toggle:hover{background:#f4f4f4;}' +
      '.phys-body{display:none;position:absolute;top:calc(100% + 6px);left:0;background:rgba(255,255,255,0.96);border:1px solid #999;border-radius:4px;padding:10px 12px;width:230px;max-width:calc(100vw - 24px);box-shadow:0 2px 6px rgba(0,0,0,0.18);}' +
      '.phys-body.open{display:block;}' +
      '.phys-row{display:flex;align-items:center;justify-content:space-between;margin:4px 0;gap:8px;}' +
      '.phys-row label{flex:0 0 58px;}' +
      '.phys-row input[type=range]{flex:1 1 auto;min-width:0;}' +
      '.phys-row .v{flex:0 0 42px;text-align:right;font-variant-numeric:tabular-nums;}' +
      '.phys-row select{flex:1 1 auto;font-family:monospace;font-size:11px;padding:1px 2px;}' +
      '.phys-actions{display:flex;gap:6px;margin-top:8px;}' +
      '.phys-actions button{flex:1;font-family:monospace;font-size:11px;padding:4px 6px;border:1px solid #999;background:#fff;color:#222;border-radius:3px;cursor:pointer;}' +
      '.phys-actions button:hover{background:#f4f4f4;}' +
      '.phys-sep{border-top:1px dashed #bbb;margin:8px 0;}';
    document.head.appendChild(style);

    panel = document.createElement('div');
    panel.className = 'phys-panel';
    panel.setAttribute('aria-label', 'animation controls');

    var toggle = document.createElement('button');
    toggle.className = 'phys-toggle';
    toggle.setAttribute('aria-label', 'toggle animation settings');
    toggle.textContent = '⚙';
    panel.appendChild(toggle);

    bodyEl = document.createElement('div');
    bodyEl.className = 'phys-body' + (globalCfg.panelOpen ? ' open' : '');
    panel.appendChild(bodyEl);

    // motif selector
    var mRow = document.createElement('div'); mRow.className = 'phys-row';
    var mLab = document.createElement('label'); mLab.textContent = 'motif'; mRow.appendChild(mLab);
    motifSelect = document.createElement('select');
    motifSelect.addEventListener('change', function () { setMotif(motifSelect.value); });
    rebuildMotifSelect();
    mRow.appendChild(motifSelect);
    bodyEl.appendChild(mRow);

    // global opacity
    var oRow = document.createElement('div'); oRow.className = 'phys-row';
    var oLab = document.createElement('label'); oLab.textContent = 'opacity'; oRow.appendChild(oLab);
    var oInp = document.createElement('input');
    oInp.type = 'range'; oInp.min = 0; oInp.max = 1; oInp.step = 0.01; oInp.value = globalCfg.opacity;
    var oVal = document.createElement('span'); oVal.className = 'v'; oVal.textContent = fmt2(globalCfg.opacity);
    oInp.addEventListener('input', function () {
      globalCfg.opacity = +oInp.value;
      oVal.textContent = fmt2(globalCfg.opacity);
      applyOpacity(); saveGlobal();
    });
    oRow.appendChild(oInp); oRow.appendChild(oVal);
    bodyEl.appendChild(oRow);

    var sep = document.createElement('div'); sep.className = 'phys-sep'; bodyEl.appendChild(sep);

    paramsHost = document.createElement('div');
    bodyEl.appendChild(paramsHost);

    var actions = document.createElement('div'); actions.className = 'phys-actions';
    pauseBtn = document.createElement('button');
    pauseBtn.textContent = globalCfg.paused ? 'play' : 'pause';
    pauseBtn.addEventListener('click', function () {
      globalCfg.paused = !globalCfg.paused;
      pauseBtn.textContent = globalCfg.paused ? 'play' : 'pause';
      saveGlobal();
    });
    var resetBtn = document.createElement('button');
    resetBtn.textContent = 'reset';
    resetBtn.addEventListener('click', function () {
      currentCfg = {};
      for (var k in currentMotif.defaults) currentCfg[k] = currentMotif.defaults[k];
      saveCfg(currentName, currentCfg);
      currentMotif.init(currentCfg);
      rebuildPanelRows();
    });
    actions.appendChild(pauseBtn); actions.appendChild(resetBtn);
    bodyEl.appendChild(actions);

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      globalCfg.panelOpen = bodyEl.classList.toggle('open');
      saveGlobal();
    });

    // Close on outside click
    document.addEventListener('mousedown', function (ev) {
      if (!bodyEl.classList.contains('open')) return;
      if (panel.contains(ev.target)) return;
      bodyEl.classList.remove('open');
      globalCfg.panelOpen = false;
      saveGlobal();
    });

    // Anchor next to the page title (h1) if present; fallback to body
    var anchor = document.querySelector('header h1') || document.querySelector('h1');
    if (anchor) anchor.appendChild(panel);
    else document.body.appendChild(panel);
  }

  function rebuildPanelRows() {
    clear(paramsHost);
    var rows = currentMotif.params;
    for (var i = 0; i < rows.length; i++) {
      (function (r) {
        var row = document.createElement('div'); row.className = 'phys-row';
        var lab = document.createElement('label'); lab.textContent = r.label; row.appendChild(lab);
        var inp = document.createElement('input');
        inp.type = 'range'; inp.min = r.min; inp.max = r.max; inp.step = r.step;
        inp.value = currentCfg[r.key];
        var val = document.createElement('span'); val.className = 'v'; val.textContent = r.fmt(currentCfg[r.key]);
        inp.addEventListener('input', function () {
          var v = +inp.value;
          currentCfg[r.key] = v;
          val.textContent = r.fmt(v);
          if (r.rebuild) currentMotif.init(currentCfg);
          saveCfg(currentName, currentCfg);
        });
        row.appendChild(inp); row.appendChild(val);
        paramsHost.appendChild(row);
      })(rows[i]);
    }
    if (motifSelect) motifSelect.value = currentName;
  }

  // ============================================================
  //                         STARTUP
  // ============================================================
  function supportsPassive() {
    var ok = false;
    try {
      var opts = Object.defineProperty({}, 'passive', { get: function () { ok = true; return true; } });
      window.addEventListener('_t', null, opts);
      window.removeEventListener('_t', null, opts);
    } catch (e) {}
    return ok;
  }

  function start() {
    document.body.insertBefore(svg, document.body.firstChild);
    resize();
    buildPanel();
    setMotif(globalCfg.motif || DEFAULT_MOTIF);
    applyOpacity();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, supportsPassive() ? { passive: true } : false);
    window.addEventListener('mouseleave', function () { mx = -9999; my = -9999; });
    requestAnimationFrame(frame);
  }

  // Wait for DOMContentLoaded so plugin scripts loaded with `defer`
  // (and registered after this file but before DCL) appear in the dropdown.
  if (document.readyState === 'complete') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
