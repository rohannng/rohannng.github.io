/*
 * Plugin motif: starfield
 *
 * Parallax-depth stars drifting downward with twinkle, plus occasional
 * shooting stars with fading tails. Site default for first-time visitors.
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

  var stars, shootG, shootingStars;

  P.register('starfield', {
    label: 'starfield',
    defaults: { stars: 140, speed: 0.5, twinkle: 0.4, shootChance: 0.005 },
    params: [
      { key:'stars',       label:'stars',    min:20, max:400,  step:10,    fmt:intFmt, rebuild:true },
      { key:'speed',       label:'drift',    min:0,  max:3,    step:0.05,  fmt:fmt2 },
      { key:'twinkle',     label:'twinkle',  min:0,  max:1,    step:0.02,  fmt:fmt2 },
      { key:'shootChance', label:'shooting', min:0,  max:0.05, step:0.001, fmt:fmt3 }
    ],

    init: function (cfg) {
      u.clear(P.motifGroup);
      var W = P.state.W, H = P.state.H;
      var g = u.el('g'); P.motifGroup.appendChild(g);
      shootG = u.el('g'); P.motifGroup.appendChild(shootG);
      stars = []; shootingStars = [];
      var n = cfg.stars | 0;
      for (var i = 0; i < n; i++) {
        var depth = 0.3 + Math.random() * 1.0;
        var rad = depth * 1.3;
        var c = u.el('circle', { r: rad.toFixed(2), fill: u.COLOR });
        g.appendChild(c);
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          depth: depth,
          phase: Math.random() * Math.PI * 2,
          baseOp: 0.4 + depth * 0.5,
          el: c
        });
      }
    },

    step: function (cfg) {
      var W = P.state.W, H = P.state.H;
      var t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.003;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.y += cfg.speed * s.depth;
        if (s.y > H + 5) { s.y = -5; s.x = Math.random() * W; }
        var op = s.baseOp + Math.sin(t + s.phase) * cfg.twinkle * 0.5;
        if (op < 0.05) op = 0.05; if (op > 1) op = 1;
        s.el.setAttribute('cx', s.x.toFixed(2));
        s.el.setAttribute('cy', s.y.toFixed(2));
        s.el.setAttribute('opacity', op.toFixed(2));
      }
      if (Math.random() < cfg.shootChance) {
        var x0 = Math.random() * W;
        var ang = Math.PI * (0.3 + Math.random() * 0.4);
        var sp = 6 + Math.random() * 4;
        var vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
        var line = u.el('line', { stroke:u.COLOR, 'stroke-width':'1', 'stroke-linecap':'round', x1:x0, y1:-10, x2:x0, y2:-10, opacity:'0.9' });
        shootG.appendChild(line);
        shootingStars.push({ x:x0, y:-10, vx:vx, vy:vy, life:0, el:line });
      }
      for (var j = shootingStars.length - 1; j >= 0; j--) {
        var sh = shootingStars[j];
        sh.x += sh.vx; sh.y += sh.vy; sh.life++;
        sh.el.setAttribute('x1', (sh.x - sh.vx * 6).toFixed(2));
        sh.el.setAttribute('y1', (sh.y - sh.vy * 6).toFixed(2));
        sh.el.setAttribute('x2', sh.x.toFixed(2));
        sh.el.setAttribute('y2', sh.y.toFixed(2));
        var fade = sh.life < 8 ? sh.life/8 : 1;
        sh.el.setAttribute('opacity', (0.9 * fade).toFixed(2));
        if (sh.y > H + 20 || sh.x > W + 20 || sh.x < -20 || sh.life > 220) {
          shootG.removeChild(sh.el);
          shootingStars.splice(j, 1);
        }
      }
    }
  });
})();
