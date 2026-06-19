/*
 * Plugin motif: galaxy
 *
 * Spiral arms with differential rotation (omega ~ 1/sqrt(r)). Inner stars
 * orbit faster than outer ones, so the arms shear as in a real disc galaxy.
 *
 * Co-developed by Rohan Grover <rohannng@gmail.com> and Claude (Anthropic, Opus 4.7 / claude-opus-4-7).
 */

(function () {
  var P = window.Physics;
  if (!P) return;
  var u = P.util;

  function intFmt(v) { return ((v | 0)) + ''; }
  function fmt2(v) { return (+v).toFixed(2); }

  var stars;

  P.register('galaxy', {
    label: 'galaxy',
    defaults: { stars: 220, arms: 3, tight: 4, omega: 1.0 },
    params: [
      { key:'stars', label:'stars', min:30,  max:500, step:10,   fmt:intFmt, rebuild:true },
      { key:'arms',  label:'arms',  min:1,   max:6,   step:1,    fmt:intFmt, rebuild:true },
      { key:'tight', label:'tight', min:0.5, max:10,  step:0.1,  fmt:fmt2,   rebuild:true },
      { key:'omega', label:'spin',  min:0,   max:3,   step:0.05, fmt:fmt2 }
    ],

    init: function (cfg) {
      u.clear(P.motifGroup);
      var W = P.state.W, H = P.state.H;
      var g = u.el('g'); P.motifGroup.appendChild(g);
      g.appendChild(u.el('circle', { r:3.5, fill:u.COLOR, cx:W/2, cy:H/2, opacity:'0.6' }));
      stars = [];
      var rMax = Math.min(W, H) * 0.46;
      var n = cfg.stars | 0;
      var arms = Math.max(1, cfg.arms | 0);
      var tight = cfg.tight;
      for (var i = 0; i < n; i++) {
        var r = Math.pow(Math.random(), 0.7) * rMax + 8;
        var arm = Math.floor(Math.random() * arms);
        var armBase = arm * (Math.PI * 2 / arms);
        var jitter = (Math.random() - 0.5) * 0.55;
        var theta = armBase + (r / rMax) * tight + jitter;
        var rad = 0.7 + Math.random() * 1.4;
        var c = u.el('circle', { r: rad.toFixed(2), fill: u.COLOR, opacity: (0.4 + Math.random()*0.5).toFixed(2) });
        g.appendChild(c);
        stars.push({ r:r, theta:theta, el:c });
      }
    },

    step: function (cfg) {
      var W = P.state.W, H = P.state.H;
      var cx = W/2, cy = H/2;
      var base = cfg.omega * 0.0025;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.theta += base / Math.sqrt(s.r * 0.05 + 1);
        var x = cx + s.r * Math.cos(s.theta);
        var y = cy + s.r * Math.sin(s.theta);
        s.el.setAttribute('cx', x.toFixed(2));
        s.el.setAttribute('cy', y.toFixed(2));
      }
    }
  });
})();
