/*
 * Plugin motif: constellation
 *
 * Verlet particles with proximity links, mouse repulsion, and toroidal
 * wrap-around. The site's original background pattern.
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

  var particles, linkPool, linkG, dotG;

  P.register('constellation', {
    label: 'constellation',
    defaults: { count: 70, linkDist: 140, damping: 0.992, jitter: 0.018, mouseR: 130, mouseForce: 0.9 },
    params: [
      { key:'count',      label:'nodes',   min:5,    max:200,  step:1,     fmt:intFmt, rebuild:true },
      { key:'linkDist',   label:'links',   min:40,   max:300,  step:1,     fmt:intFmt },
      { key:'damping',    label:'damp',    min:0.90, max:1.00, step:0.002, fmt:fmt3 },
      { key:'jitter',     label:'drift',   min:0,    max:0.08, step:0.001, fmt:fmt3 },
      { key:'mouseR',     label:'mouse r', min:0,    max:300,  step:1,     fmt:intFmt },
      { key:'mouseForce', label:'mouse f', min:0,    max:2,    step:0.05,  fmt:fmt2 }
    ],

    init: function (cfg) {
      u.clear(P.motifGroup);
      linkG = u.el('g'); dotG = u.el('g');
      P.motifGroup.appendChild(linkG); P.motifGroup.appendChild(dotG);
      particles = []; linkPool = [];
      var W = P.state.W, H = P.state.H;
      var n = Math.max(2, Math.min(400, cfg.count | 0));
      for (var i = 0; i < n; i++) {
        var r = 1.2 + Math.random() * 1.8;
        var x = Math.random() * W, y = Math.random() * H;
        var ang = Math.random() * Math.PI * 2;
        var sp = 0.15 + Math.random() * 0.25;
        var vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
        var c = u.el('circle', { r: r.toFixed(2), fill: u.COLOR });
        dotG.appendChild(c);
        particles.push({ x:x, y:y, px:x-vx, py:y-vy, el:c });
      }
    },

    step: function (cfg) {
      var W = P.state.W, H = P.state.H, mx = P.state.mx, my = P.state.my;
      var lds = cfg.linkDist * cfg.linkDist;
      var mrs = cfg.mouseR * cfg.mouseR;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var ax = (Math.random()-0.5) * cfg.jitter;
        var ay = (Math.random()-0.5) * cfg.jitter;
        var dxm = p.x - mx, dym = p.y - my;
        var d2m = dxm*dxm + dym*dym;
        if (d2m < mrs) {
          var d = Math.sqrt(d2m) || 0.001;
          var f = (1 - d/cfg.mouseR) * cfg.mouseForce;
          ax += (dxm/d) * f; ay += (dym/d) * f;
        }
        var vx = (p.x - p.px) * cfg.damping;
        var vy = (p.y - p.py) * cfg.damping;
        p.px = p.x; p.py = p.y;
        p.x += vx + ax; p.y += vy + ay;
        var pad = 10;
        if (p.x < -pad) { p.x += W + 2*pad; p.px += W + 2*pad; }
        else if (p.x > W + pad) { p.x -= W + 2*pad; p.px -= W + 2*pad; }
        if (p.y < -pad) { p.y += H + 2*pad; p.py += H + 2*pad; }
        else if (p.y > H + pad) { p.y -= H + 2*pad; p.py -= H + 2*pad; }
        p.el.setAttribute('cx', p.x.toFixed(2));
        p.el.setAttribute('cy', p.y.toFixed(2));
      }
      var lIdx = 0;
      for (var ii = 0; ii < particles.length; ii++) {
        var a = particles[ii];
        for (var j = ii+1; j < particles.length; j++) {
          var b = particles[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var d2 = dx*dx + dy*dy;
          if (d2 < lds) {
            var line = linkPool[lIdx];
            if (!line) {
              line = u.el('line', { stroke: u.COLOR, 'stroke-width':'0.6', 'stroke-linecap':'round' });
              linkG.appendChild(line); linkPool.push(line);
            }
            line.setAttribute('x1', a.x.toFixed(2));
            line.setAttribute('y1', a.y.toFixed(2));
            line.setAttribute('x2', b.x.toFixed(2));
            line.setAttribute('y2', b.y.toFixed(2));
            line.setAttribute('opacity', ((1 - Math.sqrt(d2)/cfg.linkDist) * 0.55).toFixed(3));
            if (line.style.display === 'none') line.style.display = '';
            lIdx++;
          }
        }
      }
      for (; lIdx < linkPool.length; lIdx++) {
        if (linkPool[lIdx].style.display !== 'none') linkPool[lIdx].style.display = 'none';
      }
    }
  });
})();
