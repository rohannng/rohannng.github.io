/*
 * Plugin motif: flow field
 *
 * Particles ride a smooth analytic vector field (sin/cos recursion gives a
 * curl-noise feel without a Perlin lib). The field slowly evolves over
 * time; cursor velocity "paints" wind into nearby particles, falling off
 * with distance. Demonstrates time-evolving state + frame-to-frame mouse
 * velocity tracking.
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

  var INERTIA = 0.85;
  var PAINT_R = 120, PAINT_R2 = PAINT_R * PAINT_R;

  var parts, partsG, t0 = 0;
  var prevMx = -9999, prevMy = -9999;

  // Smoothly-curving angle field (curl-noise-flavored, no Perlin dep)
  function fieldAngle(x, y, t, s) {
    return (Math.sin(x*s + Math.sin(y*s*1.3 + t)) +
            Math.cos(y*s*0.7 + Math.cos(x*s*1.1 + t*0.7))) * Math.PI;
  }

  P.register('flowfield', {
    label: 'flow field',
    defaults: { particles: 180, scale: 0.005, flow: 1.4, trail: 50, paint: 0.25, evolve: 0.25 },
    params: [
      { key:'particles', label:'count',  min:30,    max:500,  step:10,     fmt:intFmt, rebuild:true },
      { key:'scale',     label:'scale',  min:0.001, max:0.02, step:0.0005, fmt:fmt3 },
      { key:'flow',      label:'speed',  min:0.2,   max:4,    step:0.1,    fmt:fmt2 },
      { key:'trail',     label:'trail',  min:0,     max:120,  step:1,      fmt:intFmt },
      { key:'paint',     label:'paint',  min:0,     max:1,    step:0.02,   fmt:fmt2 },
      { key:'evolve',    label:'evolve', min:0,     max:1,    step:0.02,   fmt:fmt2 }
    ],

    init: function (cfg) {
      u.clear(P.motifGroup);
      partsG = u.el('g'); P.motifGroup.appendChild(partsG);
      parts = [];
      t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      var n = cfg.particles | 0;
      var W = P.state.W, H = P.state.H;
      for (var i = 0; i < n; i++) {
        var x = Math.random() * W, y = Math.random() * H;
        var op = (0.3 + Math.random() * 0.45).toFixed(2);
        var poly = u.el('polyline', {
          fill:'none', stroke:u.COLOR, 'stroke-width':'0.6',
          'stroke-linecap':'round', opacity:op, points:''
        });
        partsG.appendChild(poly);
        parts.push({ x:x, y:y, vx:0, vy:0, trail:[], poly:poly });
      }
    },

    step: function (cfg) {
      var W = P.state.W, H = P.state.H, mx = P.state.mx, my = P.state.my;
      var now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      var t = (now - t0) * 0.0005 * cfg.evolve;
      var mvx = 0, mvy = 0;
      if (mx > -1000 && prevMx > -1000) { mvx = mx - prevMx; mvy = my - prevMy; }
      prevMx = mx; prevMy = my;
      var trailLen = cfg.trail | 0;
      var s = cfg.scale;

      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var ang = fieldAngle(p.x, p.y, t, s);
        var fvx = Math.cos(ang) * cfg.flow;
        var fvy = Math.sin(ang) * cfg.flow;
        p.vx = p.vx * INERTIA + fvx * (1 - INERTIA);
        p.vy = p.vy * INERTIA + fvy * (1 - INERTIA);

        if (cfg.paint > 0 && mx > -1000) {
          var dxm = p.x - mx, dym = p.y - my;
          var d2 = dxm*dxm + dym*dym;
          if (d2 < PAINT_R2) {
            var w = (1 - Math.sqrt(d2) / PAINT_R) * cfg.paint;
            p.vx += mvx * w;
            p.vy += mvy * w;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) {
          p.x = Math.random() * W; p.y = Math.random() * H;
          p.vx = 0; p.vy = 0; p.trail.length = 0;
        }

        if (trailLen > 0) {
          p.trail.push(p.x.toFixed(1) + ',' + p.y.toFixed(1));
          while (p.trail.length > trailLen) p.trail.shift();
          p.poly.setAttribute('points', p.trail.join(' '));
        } else if (p.trail.length) {
          p.trail.length = 0;
          p.poly.setAttribute('points', '');
        }
      }
    }
  });
})();
