/*
 * Plugin motif: pendulums
 *
 * Independent gravity pendulums (θ'' = -(g/L) sin θ) with slight length
 * variation, so the relative phases shift over time and a travelling wave
 * pattern emerges. Simplest example — only init() + step().
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

  var pendulums;

  P.register('pendulums', {
    label: 'pendulums',
    defaults: { count: 18, gravity: 1.5, damping: 0.9995, lengthSpread: 0.35 },
    params: [
      { key:'count',        label:'count',   min:3,    max:40,   step:1,      fmt:intFmt, rebuild:true },
      { key:'gravity',      label:'gravity', min:0.1,  max:5,    step:0.05,   fmt:fmt2 },
      { key:'damping',      label:'damp',    min:0.99, max:1.00, step:0.0002, fmt:fmt3 },
      { key:'lengthSpread', label:'spread',  min:0,    max:0.6,  step:0.01,   fmt:fmt2,   rebuild:true }
    ],

    init: function (cfg) {
      u.clear(P.motifGroup);
      var g = u.el('g'); P.motifGroup.appendChild(g);
      pendulums = [];
      var n = cfg.count | 0;
      var spread = cfg.lengthSpread;
      var W = P.state.W, H = P.state.H;
      var anchorY = H * 0.15;
      var maxL = Math.min(H * 0.65, 600);
      for (var i = 0; i < n; i++) {
        var x = W * 0.1 + (W * 0.8) * (i / (n - 1 || 1));
        var t = (i + 1) / n;
        var L = maxL * (1 - spread * (1 - t));
        var rod = u.el('line', { stroke: u.COLOR, 'stroke-width':'0.6', opacity:'0.45', x1:x, y1:anchorY });
        var bob = u.el('circle', { r:3, fill:u.COLOR });
        var anch = u.el('circle', { r:1.5, fill:u.COLOR, cx:x, cy:anchorY, opacity:'0.6' });
        g.appendChild(rod); g.appendChild(bob); g.appendChild(anch);
        pendulums.push({ ax:x, ay:anchorY, L:L, angle:-Math.PI/4, omega:0, rod:rod, bob:bob });
      }
    },

    step: function (cfg) {
      for (var i = 0; i < pendulums.length; i++) {
        var p = pendulums[i];
        // θ'' = -(g/L) sin θ — integrated with fixed dt and angular damping
        var alpha = -(cfg.gravity / p.L) * 60 * Math.sin(p.angle);
        p.omega = (p.omega + alpha * 0.0166) * cfg.damping;
        p.angle += p.omega;
        var bx = p.ax + p.L * Math.sin(p.angle);
        var by = p.ay + p.L * Math.cos(p.angle);
        p.rod.setAttribute('x2', bx.toFixed(2));
        p.rod.setAttribute('y2', by.toFixed(2));
        p.bob.setAttribute('cx', bx.toFixed(2));
        p.bob.setAttribute('cy', by.toFixed(2));
      }
    }
  });
})();
