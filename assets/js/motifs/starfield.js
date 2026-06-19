/*
 * Plugin motif: starfield
 *
 * Parallax-depth stars drifting downward with twinkle, plus occasional
 * shooting stars with fading tails. Site default for first-time visitors.
 *
 * Immersive extras:
 *   - diffraction spikes on the brightest stars (telescope-photo look)
 *   - constellation lines that occasionally form between nearby bright stars
 *     and fade in/out over a few seconds
 *   - a slow comet that drifts across the field with a long curving trail
 *
 * Interactions (mouse / touch on supported devices):
 *   - cursor halo brightens nearby stars
 *   - depth-weighted parallax shift toward the cursor
 *   - click empty space to launch a shooting star from the cursor
 *
 * Co-developed by Rohan Grover <rohannng@gmail.com> and Claude (Anthropic, Opus 4.7 / claude-opus-4-7).
 */

(function () {
  var P = window.Physics;
  if (!P) return;
  var u = P.util;

  function intFmt(v) { return ((v | 0)) + ''; }
  function fmt2(v) { return (+v).toFixed(2); }
  function fmt3(v) { return (+v).toFixed(3); }

  var CURSOR_R = 160, CURSOR_R2 = CURSOR_R * CURSOR_R;

  var defaults = {
    stars: 140,
    speed: 0.5,
    twinkle: 0.4,
    shootChance: 0.005,
    cursor: 0.6,
    spikes: 6,
    constellations: 0.6,
    comets: 0.5
  };

  var stars, spikeStars, shootingStars, constellations, comet;
  var starG, spikeG, shootG, constG, cometG;

  function isInteractive(t) {
    while (t && t !== document.body && t !== document) {
      var tag = t.tagName;
      if (tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' || tag === 'SELECT' ||
          tag === 'TEXTAREA' || tag === 'LABEL' || tag === 'OPTION') return true;
      if (t.classList && (
            t.classList.contains('phys-panel') ||
            t.classList.contains('phys-toggle') ||
            t.classList.contains('phys-body'))) return true;
      t = t.parentNode;
    }
    return false;
  }

  function spawnShootingStarFrom(x, y, ang) {
    var sp = 6 + Math.random() * 4;
    var vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
    var line = u.el('line', {
      stroke: u.COLOR, 'stroke-width': '1', 'stroke-linecap': 'round',
      x1: x, y1: y, x2: x, y2: y, opacity: '0.9'
    });
    shootG.appendChild(line);
    shootingStars.push({ x: x, y: y, vx: vx, vy: vy, life: 0, el: line });
  }

  function spawnAutoShootingStar() {
    var W = P.state.W;
    var x0 = Math.random() * W;
    var ang = Math.PI * (0.3 + Math.random() * 0.4);
    spawnShootingStarFrom(x0, -10, ang);
  }

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (isInteractive(e.target)) return;
    // Outward shooting star from the cursor at a random angle
    var ang = Math.random() * Math.PI * 2;
    spawnShootingStarFrom(e.clientX, e.clientY, ang);
  }

  function spawnConstellation() {
    var bright = [];
    for (var i = 0; i < stars.length; i++) {
      if (stars[i].baseOp > 0.72) bright.push(stars[i]);
    }
    if (bright.length < 3) return;
    var seed = bright[Math.floor(Math.random() * bright.length)];
    var neighbors = [];
    for (var j = 0; j < bright.length; j++) {
      if (bright[j] === seed) continue;
      var dx = seed.x - bright[j].x, dy = seed.y - bright[j].y;
      var d = Math.sqrt(dx*dx + dy*dy);
      if (d > 60 && d < 280) neighbors.push({ s: bright[j], d: d });
    }
    if (neighbors.length === 0) return;
    neighbors.sort(function (a, b) { return a.d - b.d; });
    var count = Math.min(neighbors.length, 1 + Math.floor(Math.random() * 3));
    var chain = [seed];
    for (var k = 0; k < count; k++) chain.push(neighbors[k].s);
    for (var m = 0; m < chain.length - 1; m++) {
      var a = chain[m], b = chain[m+1];
      var line = u.el('line', {
        stroke: u.COLOR, 'stroke-width': '0.4', 'stroke-linecap': 'round',
        x1: a.x, y1: a.y, x2: b.x, y2: b.y, opacity: '0'
      });
      constG.appendChild(line);
      constellations.push({
        a: a, b: b, line: line, life: 0,
        max: 280 + Math.floor(Math.random() * 200)
      });
    }
  }

  function spawnComet() {
    if (comet) return;
    var W = P.state.W, H = P.state.H;
    var side = Math.floor(Math.random() * 4);
    var x, y, vx, vy;
    if (side === 0)      { x = W*0.2 + Math.random()*W*0.6; y = -20; vx = (Math.random()-0.5)*1.2; vy = 1.1 + Math.random()*0.5; }
    else if (side === 1) { x = W+20; y = H*0.2 + Math.random()*H*0.6; vx = -1.1 - Math.random()*0.5; vy = (Math.random()-0.5)*1.2; }
    else if (side === 2) { x = W*0.2 + Math.random()*W*0.6; y = H+20; vx = (Math.random()-0.5)*1.2; vy = -1.1 - Math.random()*0.5; }
    else                 { x = -20; y = H*0.2 + Math.random()*H*0.6; vx = 1.1 + Math.random()*0.5; vy = (Math.random()-0.5)*1.2; }
    var poly = u.el('polyline', {
      fill: 'none', stroke: u.COLOR, 'stroke-width': '0.8',
      'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      opacity: '0.7', points: ''
    });
    cometG.appendChild(poly);
    var head = u.el('circle', { r: 1.8, fill: u.COLOR, opacity: '0.95' });
    cometG.appendChild(head);
    comet = { x: x, y: y, vx: vx, vy: vy, poly: poly, head: head, trail: [], life: 0 };
  }

  function destroyComet() {
    if (!comet) return;
    if (comet.poly.parentNode) cometG.removeChild(comet.poly);
    if (comet.head.parentNode) cometG.removeChild(comet.head);
    comet = null;
  }

  P.register('starfield', {
    label: 'starfield',
    defaults: defaults,
    params: [
      { key:'stars',          label:'stars',    min:20, max:400,  step:10,    fmt:intFmt, rebuild:true },
      { key:'speed',          label:'drift',    min:0,  max:3,    step:0.05,  fmt:fmt2 },
      { key:'twinkle',        label:'twinkle',  min:0,  max:1,    step:0.02,  fmt:fmt2 },
      { key:'shootChance',    label:'shooting', min:0,  max:0.05, step:0.001, fmt:fmt3 },
      { key:'cursor',         label:'cursor',   min:0,  max:1,    step:0.02,  fmt:fmt2 },
      { key:'spikes',         label:'spikes',   min:0,  max:15,   step:1,     fmt:intFmt, rebuild:true },
      { key:'constellations', label:'patterns', min:0,  max:1,    step:0.02,  fmt:fmt2 },
      { key:'comets',         label:'comets',   min:0,  max:1,    step:0.02,  fmt:fmt2 }
    ],

    init: function (cfg) {
      u.clear(P.motifGroup);
      var W = P.state.W, H = P.state.H;
      // Layer order (back to front): constellations, comet, stars, spikes, shooting stars
      constG  = u.el('g'); P.motifGroup.appendChild(constG);
      cometG  = u.el('g'); P.motifGroup.appendChild(cometG);
      starG   = u.el('g'); P.motifGroup.appendChild(starG);
      spikeG  = u.el('g'); P.motifGroup.appendChild(spikeG);
      shootG  = u.el('g'); P.motifGroup.appendChild(shootG);

      stars = []; shootingStars = []; constellations = []; comet = null;
      var n = cfg.stars | 0;
      for (var i = 0; i < n; i++) {
        var depth = 0.3 + Math.random() * 1.0;
        var rad = depth * 1.3;
        var c = u.el('circle', { r: rad.toFixed(2), fill: u.COLOR });
        starG.appendChild(c);
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          dx: 0, dy: 0,
          depth: depth,
          phase: Math.random() * Math.PI * 2,
          baseOp: 0.4 + depth * 0.5,
          radius: rad,
          el: c
        });
      }

      // Diffraction spikes on the brightest N stars
      spikeStars = [];
      var sorted = stars.slice().sort(function (a, b) { return b.baseOp - a.baseOp; });
      var sCount = Math.min(cfg.spikes | 0, sorted.length);
      for (var s = 0; s < sCount; s++) {
        var st = sorted[s];
        var len = 8 + st.depth * 8;
        var h = u.el('line', { stroke: u.COLOR, 'stroke-width': '0.4', 'stroke-linecap': 'round', opacity: '0.5' });
        var v = u.el('line', { stroke: u.COLOR, 'stroke-width': '0.4', 'stroke-linecap': 'round', opacity: '0.5' });
        spikeG.appendChild(h); spikeG.appendChild(v);
        spikeStars.push({ star: st, h: h, v: v, len: len });
      }
    },

    step: function (cfg) {
      var W = P.state.W, H = P.state.H, mx = P.state.mx, my = P.state.my;
      var t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.003;
      var cursor = cfg.cursor || 0;
      var hasCursor = mx > -1000 && cursor > 0;

      // Stars: drift, twinkle, cursor halo, parallax shift
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.y += cfg.speed * s.depth;
        if (s.y > H + 5) { s.y = -5; s.x = Math.random() * W; }
        var op = s.baseOp + Math.sin(t + s.phase) * cfg.twinkle * 0.5;
        var dxr = 0, dyr = 0;
        if (hasCursor) {
          var dxc = s.x - mx, dyc = s.y - my;
          var d2 = dxc*dxc + dyc*dyc;
          if (d2 < CURSOR_R2) {
            var d = Math.sqrt(d2) || 0.001;
            var w = (1 - d / CURSOR_R);
            op += w * cursor * 0.55;                       // halo brightening
            var shiftAmt = w * cursor * 14 * s.depth;      // depth-weighted parallax
            dxr = -dxc / d * shiftAmt;
            dyr = -dyc / d * shiftAmt;
          }
        }
        if (op < 0.05) op = 0.05; if (op > 1) op = 1;
        s.dx = dxr; s.dy = dyr;
        s.el.setAttribute('cx', (s.x + dxr).toFixed(2));
        s.el.setAttribute('cy', (s.y + dyr).toFixed(2));
        s.el.setAttribute('opacity', op.toFixed(2));
      }

      // Diffraction spikes ride along with their host stars
      for (var sp = 0; sp < spikeStars.length; sp++) {
        var sps = spikeStars[sp];
        var ss = sps.star;
        var rx = ss.x + ss.dx, ry = ss.y + ss.dy;
        var half = sps.len * 0.5;
        sps.h.setAttribute('x1', (rx - half).toFixed(2));
        sps.h.setAttribute('y1', ry.toFixed(2));
        sps.h.setAttribute('x2', (rx + half).toFixed(2));
        sps.h.setAttribute('y2', ry.toFixed(2));
        sps.v.setAttribute('x1', rx.toFixed(2));
        sps.v.setAttribute('y1', (ry - half).toFixed(2));
        sps.v.setAttribute('x2', rx.toFixed(2));
        sps.v.setAttribute('y2', (ry + half).toFixed(2));
        var op2 = parseFloat(ss.el.getAttribute('opacity')) * 0.55;
        sps.h.setAttribute('opacity', op2.toFixed(2));
        sps.v.setAttribute('opacity', op2.toFixed(2));
      }

      // Auto shooting stars from the top edge
      if (Math.random() < cfg.shootChance) spawnAutoShootingStar();
      for (var j = shootingStars.length - 1; j >= 0; j--) {
        var sh = shootingStars[j];
        sh.x += sh.vx; sh.y += sh.vy; sh.life++;
        sh.el.setAttribute('x1', (sh.x - sh.vx * 6).toFixed(2));
        sh.el.setAttribute('y1', (sh.y - sh.vy * 6).toFixed(2));
        sh.el.setAttribute('x2', sh.x.toFixed(2));
        sh.el.setAttribute('y2', sh.y.toFixed(2));
        var fade = sh.life < 8 ? sh.life/8 : 1;
        sh.el.setAttribute('opacity', (0.9 * fade).toFixed(2));
        if (sh.y > H + 20 || sh.x > W + 20 || sh.x < -20 || sh.y < -20 || sh.life > 220) {
          shootG.removeChild(sh.el);
          shootingStars.splice(j, 1);
        }
      }

      // Constellation lines: occasional spawn, fade in / hold / fade out
      if (cfg.constellations > 0 && Math.random() < cfg.constellations * 0.004) {
        spawnConstellation();
      }
      for (var c = constellations.length - 1; c >= 0; c--) {
        var con = constellations[c];
        con.life++;
        var phase;
        if (con.life < 40)                phase = con.life / 40;
        else if (con.life > con.max - 80) phase = (con.max - con.life) / 80;
        else                              phase = 1;
        if (phase < 0) phase = 0;
        con.line.setAttribute('opacity', (phase * 0.45).toFixed(2));
        con.line.setAttribute('x1', (con.a.x + con.a.dx).toFixed(2));
        con.line.setAttribute('y1', (con.a.y + con.a.dy).toFixed(2));
        con.line.setAttribute('x2', (con.b.x + con.b.dx).toFixed(2));
        con.line.setAttribute('y2', (con.b.y + con.b.dy).toFixed(2));
        if (con.life >= con.max) {
          constG.removeChild(con.line);
          constellations.splice(c, 1);
        }
      }

      // Comet: rare, single in flight, gentle curve toward the field center
      if (!comet && cfg.comets > 0 && Math.random() < cfg.comets * 0.0009) {
        spawnComet();
      }
      if (comet) {
        var cx = W/2, cy = H/2;
        var dxc2 = cx - comet.x, dyc2 = cy - comet.y;
        var rrc = Math.sqrt(dxc2*dxc2 + dyc2*dyc2) || 1;
        comet.vx += dxc2/rrc * 0.008;
        comet.vy += dyc2/rrc * 0.008;
        comet.x += comet.vx; comet.y += comet.vy;
        comet.trail.push(comet.x.toFixed(1) + ',' + comet.y.toFixed(1));
        if (comet.trail.length > 80) comet.trail.shift();
        comet.poly.setAttribute('points', comet.trail.join(' '));
        comet.head.setAttribute('cx', comet.x.toFixed(2));
        comet.head.setAttribute('cy', comet.y.toFixed(2));
        comet.life++;
        if (comet.x < -60 || comet.x > W + 60 || comet.y < -60 || comet.y > H + 60 || comet.life > 1400) {
          destroyComet();
        }
      }
    },

    attach: function () {
      window.addEventListener('mousedown', onDown);
    },

    detach: function () {
      window.removeEventListener('mousedown', onDown);
    }
  });
})();
