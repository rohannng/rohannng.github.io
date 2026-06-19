<!--
Co-developed by Rohan Grover <rohannng@gmail.com> and Claude (Anthropic, Opus 4.7 / claude-opus-4-7).
-->

# Motif plugin guide

The background animation on this site is driven by `assets/js/physics.js`, a tiny
engine that renders SVG and runs a per-frame `step()` for whichever **motif** is
currently selected. Motifs are pluggable: any `<script defer>` loaded after
`physics.js` calls `Physics.register(...)` to add itself. The settings panel
(⚙ next to the page title) discovers them automatically.

**Every motif is a plugin** — the engine ships with no built-ins. This directory
holds all seven shipped motifs:

| File | Notes |
| --- | --- |
| `constellation.js` | Verlet particles with proximity links and mouse repulsion. |
| `orbits.js` | Newtonian gravity around a central mass; cursor as a moving mass. |
| `galaxy.js` | Spiral arms with differential rotation. |
| `starfield.js` | Parallax stars, twinkle, occasional shooting stars. **Site default.** |
| `pendulums.js` | Minimal example — only `init` + `step`. |
| `slingshot.js` | Interactive — `attach`/`detach` for global event listeners. |
| `flowfield.js` | Time-evolving simulation + mouse-velocity tracking. |

---

## Quick start: add a new motif

1. **Create a file** under `assets/js/motifs/your-motif.js`.
2. **Load it** by adding `<script defer src="…/motifs/your-motif.js"></script>`
   to `_includes/head.html`, *after* `physics.js`.
3. **Implement the contract** below, then call `Physics.register('your-motif', motif)`.

That's it — no engine changes, no panel wiring, no localStorage plumbing.

---

## The motif contract

```js
{
  label:    'shown in the dropdown',
  defaults: { paramKey: value, ... },
  params:   [
    {
      key:      'paramKey',          // must match a defaults key
      label:    'short slider label',
      min:      0,
      max:      1,
      step:     0.01,
      fmt:      function (v) { return (+v).toFixed(2); },
      rebuild:  false                // optional — if true, init() re-runs when slider moves
    },
    ...
  ],
  init: function (cfg) { /* build SVG into Physics.motifGroup */ },
  step: function (cfg) { /* advance one frame */ },

  // Optional — only if your motif needs global event listeners (mouse, keyboard, etc.)
  attach: function (getCfg) { /* called when this motif becomes active */ },
  detach: function ()       { /* called when switching away — clean up listeners */ }
}
```

### Field-by-field

- **`label`** — shown verbatim in the motif dropdown.
- **`defaults`** — initial values for every tunable parameter. Anything the
  user changes is overlaid on top and persisted to `localStorage` under
  `__m:<name>`.
- **`params`** — what shows up as a slider row in the panel. Order is preserved.
  - `key` must match a `defaults` key.
  - `rebuild: true` re-runs `init(cfg)` every time that slider moves (use for
    things like particle count, where the entity set changes).
  - `fmt(v)` returns the display string next to the slider. Common helpers:
    ```js
    function intFmt(v) { return ((v | 0)) + ''; }
    function fmt2(v)   { return (+v).toFixed(2); }
    function fmt3(v)   { return (+v).toFixed(3); }
    ```
- **`init(cfg)`** — runs once when this motif becomes active, on viewport
  resize, on a `rebuild` slider change, or on "reset". Build all your SVG nodes
  here, into `Physics.motifGroup`. Don't forget to clear it first:
  `Physics.util.clear(Physics.motifGroup)`.
- **`step(cfg)`** — runs once per animation frame while the motif is active and
  not paused. Read live state via `Physics.state.*`. Update positions; don't
  re-create DOM here.
- **`attach(getCfg)`** *(optional)* — runs when the motif becomes active. Use it
  to register `window` / `document` listeners. `getCfg()` returns the live cfg
  object, so handlers see current slider values even after they change.
- **`detach()`** *(optional)* — runs when the user switches away. Remove any
  listeners you added in `attach`. The engine clears `Physics.motifGroup` for
  you, so don't worry about DOM cleanup.

---

## The `Physics` API surface

Everything a plugin needs is on `window.Physics`:

| Symbol | What it is |
| --- | --- |
| `Physics.register(name, motif)` | Add (or replace) a motif. Late registrations update the dropdown. |
| `Physics.setMotif(name)` | Programmatically switch motifs. |
| `Physics.motifGroup` | SVG `<g>` element to draw into. |
| `Physics.state.W` / `.H` | Live viewport size (getters — read every frame, don't cache). |
| `Physics.state.mx` / `.my` | Live pointer position. `-9999` means absent / off-screen. |
| `Physics.util.el(tag, attrs)` | Create an SVG element in the right namespace. |
| `Physics.util.clear(node)` | Remove all children of a node. |
| `Physics.util.COLOR` | The site's foreground color (`#222`). Use this so dark-mode inversion works. |
| `Physics.util.NS` | The SVG namespace string, if you need `createElementNS` directly. |

---

## A minimal example

```js
// assets/js/motifs/spiral.js
(function () {
  var P = window.Physics;
  if (!P) return; // reduced-motion mode disables the engine entirely
  var u = P.util;

  function intFmt(v) { return ((v | 0)) + ''; }
  function fmt3(v)   { return (+v).toFixed(3); }

  var dots = [];

  P.register('spiral', {
    label: 'spiral',
    defaults: { count: 80, twist: 0.05 },
    params: [
      { key: 'count', label: 'count', min: 10, max: 300, step: 1,
        fmt: intFmt, rebuild: true },
      { key: 'twist', label: 'twist', min: 0,  max: 0.2, step: 0.005,
        fmt: fmt3 }
    ],

    init: function (cfg) {
      u.clear(P.motifGroup);
      dots = [];
      for (var i = 0; i < cfg.count; i++) {
        var c = u.el('circle', { r: 1.5, fill: u.COLOR });
        P.motifGroup.appendChild(c);
        dots.push({ i: i, el: c });
      }
    },

    step: function (cfg) {
      var t  = performance.now() * 0.001;
      var cx = P.state.W / 2;
      var cy = P.state.H / 2;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var r = d.i * 3 + 20;
        var a = d.i * cfg.twist + t;
        d.el.setAttribute('cx', (cx + r * Math.cos(a)).toFixed(1));
        d.el.setAttribute('cy', (cy + r * Math.sin(a)).toFixed(1));
      }
    }
  });
})();
```

---

## Behaviors you get for free

- **Settings panel.** Your `params` render as sliders in the ⚙ panel next to
  the page title. The "reset" button restores your `defaults`. The motif
  dropdown lists you alongside the built-ins.
- **Persistence.** User-tweaked values save to `localStorage` under
  `__m:<name>`. Each motif has its own slot — they don't trample each other.
  The currently selected motif is in `__global` under the same root key
  (`physics-config-v2`).
- **Accessibility.** The whole engine no-ops when
  `prefers-reduced-motion: reduce` is set. Your plugin should still call
  `if (!window.Physics) return;` at the top so it doesn't crash trying to use
  the missing global.
- **Dark mode.** The site's theme applies `filter: invert(1)` to the body in
  dark mode. Stick to `Physics.util.COLOR` (`#222`) and the inversion makes it
  light gray in dark mode automatically.

---

## Gotchas

- **Order matters in `head.html`.** Plugins must come *after* `physics.js`
  because they reference `window.Physics`. `defer` preserves source order.
- **Names are user-visible.** The first arg to `register()` is the
  `localStorage` key and the dropdown `<option>` value. Don't rename casually
  — existing users' saved configs are looked up by that string.
- **`rebuild: true` is destructive.** It re-runs `init`, which clears
  `Physics.motifGroup`. Animation state in module-level variables (arrays of
  particles, etc.) is reset. That's usually what you want for changes like
  particle count, but think twice before flagging continuous values.
- **`Physics.state.*` are getters.** Read them fresh each frame; don't cache
  `W` / `H` / `mx` in a closure that outlives a single `step` call.
- **Detach what you attach.** Anything in `attach()` must be undone in
  `detach()`, or you'll leak listeners every time someone switches motifs.
- **One source of `COLOR`.** Don't hard-code `#222` — use `Physics.util.COLOR`
  so a future theme change cascades.

---

## Where things live

```
assets/js/
├── physics.js              ← engine only (no built-in motifs)
└── motifs/
    ├── README.md           ← this file
    ├── constellation.js
    ├── orbits.js
    ├── galaxy.js
    ├── starfield.js        ← site default
    ├── pendulums.js        ← minimal example
    ├── slingshot.js        ← attach/detach example
    └── flowfield.js        ← stateful / time-evolving example
```

`_includes/head.html` loads them in order via `<script defer>`. The settings
panel injects itself into the page's `<h1>`.
