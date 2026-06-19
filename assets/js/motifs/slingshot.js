/*
 * Plugin motif: slingshot
 *
 * Click-drag empty space to launch a body into Newtonian orbit around a
 * central mass; release direction and length set the initial velocity.
 * Bodies that fall into the star or escape the viewport are removed.
 * Demonstrates attach()/detach() for managing global event listeners.
 *
 * Co-developed by Rohan Grover <rohannng@gmail.com> and Claude (Anthropic, Opus 4.7 / claude-opus-4-7).
 */

(function () {
  var P = window.Physics;
  if (!P) return;
  var u = P.util;

  function intFmt(v) { return ((v | 0)) + ''; }
  function fmt2(v) { return (+v).toFixed(2); }

  var defaults = { gravity: 4000, maxBodies: 25, trail: 90, launch: 0.05 };
  var bodies, bodiesG, trailG, aimLine, aimStart, hint;
  var dragging = false, dragX0 = 0, dragY0 = 0;
  var getCfg = function () { return defaults; };

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

  function spawn(x, y, vx, vy) {
    var c = u.el('circle', { r:2, fill:u.COLOR, cx:x, cy:y });
    var poly = u.el('polyline', { fill:'none', stroke:u.COLOR, 'stroke-width':'0.6', opacity:'0.45', points:'' });
    trailG.appendChild(poly); bodiesG.appendChild(c);
    bodies.push({ x:x, y:y, vx:vx, vy:vy, el:c, poly:poly, trail:[] });
    var maxB = getCfg().maxBodies | 0;
    while (bodies.length > maxB) {
      var old = bodies.shift();
      if (old.el.parentNode) bodiesG.removeChild(old.el);
      if (old.poly.parentNode) trailG.removeChild(old.poly);
    }
    if (hint) hint.style.display = 'none';
  }

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (isInteractive(e.target)) return;
    dragging = true; dragX0 = e.clientX; dragY0 = e.clientY;
    aimStart.setAttribute('cx', dragX0); aimStart.setAttribute('cy', dragY0);
    aimStart.style.display = '';
    aimLine.setAttribute('x1', dragX0); aimLine.setAttribute('y1', dragY0);
    aimLine.setAttribute('x2', dragX0); aimLine.setAttribute('y2', dragY0);
    aimLine.style.display = '';
  }
  function onMoveAim(e) {
    if (!dragging) return;
    aimLine.setAttribute('x2', e.clientX); aimLine.setAttribute('y2', e.clientY);
  }
  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    aimLine.style.display = 'none';
    aimStart.style.display = 'none';
    var dx = e.clientX - dragX0, dy = e.clientY - dragY0;
    var cfg = getCfg();
    var vx, vy;
    if (dx*dx + dy*dy < 25) { vx = 0; vy = 0; }
    else { vx = -dx * cfg.launch; vy = -dy * cfg.launch; }
    spawn(dragX0, dragY0, vx, vy);
  }

  P.register('slingshot', {
    label: 'slingshot',
    defaults: defaults,
    params: [
      { key:'gravity',   label:'gravity', min:500,  max:20000, step:100,  fmt:intFmt },
      { key:'maxBodies', label:'max',     min:3,    max:80,    step:1,    fmt:intFmt },
      { key:'trail',     label:'trail',   min:0,    max:200,   step:1,    fmt:intFmt },
      { key:'launch',    label:'power',   min:0.01, max:0.20,  step:0.01, fmt:fmt2 }
    ],

    init: function (cfg) {
      u.clear(P.motifGroup);
      var W = P.state.W, H = P.state.H;
      trailG = u.el('g'); P.motifGroup.appendChild(trailG);
      bodiesG = u.el('g'); P.motifGroup.appendChild(bodiesG);
      bodiesG.appendChild(u.el('circle', { r:5, fill:u.COLOR, cx:W/2, cy:H/2 }));
      aimLine = u.el('line', { stroke:u.COLOR, 'stroke-width':'1', 'stroke-dasharray':'4,4', opacity:'0.55' });
      aimLine.style.display = 'none';
      aimStart = u.el('circle', { r:3, fill:'none', stroke:u.COLOR, 'stroke-width':'1', opacity:'0.6' });
      aimStart.style.display = 'none';
      P.motifGroup.appendChild(aimLine);
      P.motifGroup.appendChild(aimStart);
      hint = u.el('text', { x:W/2, y:H - 20, 'text-anchor':'middle',
        'font-family':'monospace', 'font-size':'11', fill:u.COLOR, opacity:'0.5' });
      hint.textContent = 'click + drag empty space to launch';
      P.motifGroup.appendChild(hint);
      bodies = [];
    },

    step: function (cfg) {
      var W = P.state.W, H = P.state.H;
      var cx = W/2, cy = H/2;
      var trailLen = cfg.trail | 0;
      for (var i = bodies.length - 1; i >= 0; i--) {
        var b = bodies[i];
        var dx = cx - b.x, dy = cy - b.y;
        var r2 = dx*dx + dy*dy;
        var r = Math.sqrt(r2) || 0.001;
        var a = cfg.gravity / r2;
        b.vx += (dx/r) * a;
        b.vy += (dy/r) * a;
        b.x += b.vx; b.y += b.vy;
        if (r < 6 || b.x < -W || b.x > 2*W || b.y < -H || b.y > 2*H) {
          if (b.el.parentNode) bodiesG.removeChild(b.el);
          if (b.poly.parentNode) trailG.removeChild(b.poly);
          bodies.splice(i, 1); continue;
        }
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
      if (hint && bodies.length > 0 && hint.style.display !== 'none') hint.style.display = 'none';
    },

    // Called when this motif becomes active. `getCfgFn` returns the
    // current (possibly updated) cfg so handlers see live slider values.
    attach: function (getCfgFn) {
      getCfg = getCfgFn;
      window.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMoveAim);
      window.addEventListener('mouseup', onUp);
    },

    // Called when switching away. Clean up any listeners attached above.
    detach: function () {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMoveAim);
      window.removeEventListener('mouseup', onUp);
      dragging = false;
      if (aimLine) aimLine.style.display = 'none';
      if (aimStart) aimStart.style.display = 'none';
    }
  });
})();
