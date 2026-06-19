/*
 * Plugin motif: orbits
 *
 * Newtonian gravity F = GM/r^2 around a central mass. The cursor acts as
 * a small moving mass that perturbs nearby orbits.
 *
 * Co-developed by Rohan Grover <rohannng@gmail.com> and Claude (Anthropic, Opus 4.7 / claude-opus-4-7).
 */

(function () {
  var P = window.Physics;
  if (!P) return;
  var u = P.util;

  function intFmt(v) { return ((v | 0)) + ''; }

  var bodies, trailG, bodiesG;

  P.register('orbits', {
    label: 'orbits',
    defaults: { bodies: 8, gm: 4000, trail: 60, mouseMass: 200 },
    params: [
      { key:'bodies',    label:'bodies',  min:1,   max:30,    step:1,   fmt:intFmt, rebuild:true },
      { key:'gm',        label:'gravity', min:500, max:20000, step:100, fmt:intFmt, rebuild:true },
      { key:'trail',     label:'trail',   min:0,   max:200,   step:1,   fmt:intFmt },
      { key:'mouseMass', label:'mouse m', min:0,   max:1500,  step:10,  fmt:intFmt }
    ],

    init: function (cfg) {
      u.clear(P.motifGroup);
      var W = P.state.W, H = P.state.H;
      trailG = u.el('g'); P.motifGroup.appendChild(trailG);
      bodiesG = u.el('g'); P.motifGroup.appendChild(bodiesG);
      bodiesG.appendChild(u.el('circle', { r:5, fill:u.COLOR, cx:W/2, cy:H/2 }));
      bodies = [];
      var rMax = Math.min(W, H) * 0.45;
      var rMin = 60;
      var n = Math.max(1, Math.min(40, cfg.bodies | 0));
      for (var i = 0; i < n; i++) {
        var r = rMin + (rMax - rMin) * ((i + 0.5) / n) + (Math.random()-0.5)*20;
        var ang = Math.random() * Math.PI * 2;
        var x = W/2 + r * Math.cos(ang);
        var y = H/2 + r * Math.sin(ang);
        var v = Math.sqrt(cfg.gm / r);
        var vx = -Math.sin(ang) * v, vy = Math.cos(ang) * v;
        var rad = 1.5 + Math.random() * 1.5;
        var c = u.el('circle', { r: rad.toFixed(2), fill: u.COLOR });
        var poly = u.el('polyline', { fill:'none', stroke:u.COLOR, 'stroke-width':'0.5', 'stroke-linejoin':'round', 'stroke-linecap':'round', opacity:'0.35', points:'' });
        trailG.appendChild(poly); bodiesG.appendChild(c);
        bodies.push({ x:x, y:y, vx:vx, vy:vy, el:c, poly:poly, trail:[] });
      }
    },

    step: function (cfg) {
      var W = P.state.W, H = P.state.H, mx = P.state.mx, my = P.state.my;
      var cx = W/2, cy = H/2;
      var trailLen = cfg.trail | 0;
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        var dx = cx - b.x, dy = cy - b.y;
        var r2 = dx*dx + dy*dy;
        var r = Math.sqrt(r2) || 0.001;
        var a = cfg.gm / r2;
        b.vx += (dx/r) * a;
        b.vy += (dy/r) * a;
        if (cfg.mouseMass > 0 && mx > -1000) {
          var dxm = mx - b.x, dym = my - b.y;
          var rm2 = dxm*dxm + dym*dym + 100;
          var rm = Math.sqrt(rm2);
          var am = cfg.mouseMass / rm2;
          b.vx += (dxm/rm) * am;
          b.vy += (dym/rm) * am;
        }
        b.x += b.vx; b.y += b.vy;
        if (trailLen > 0) {
          b.trail.push(b.x.toFixed(1) + ',' + b.y.toFixed(1));
          while (b.trail.length > trailLen) b.trail.shift();
          b.poly.setAttribute('points', b.trail.join(' '));
        } else if (b.trail.length) {
          b.trail.length = 0; b.poly.setAttribute('points', '');
        }
        b.el.setAttribute('cx', b.x.toFixed(2));
        b.el.setAttribute('cy', b.y.toFixed(2));
      }
    }
  });
})();
