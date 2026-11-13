/* Draws the garments that hang on the rail as inline SVG, tinted per colour.
   Pure drawing code: no network, no images, no inline styles (works under a strict CSP). */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  // ---- colour helpers -------------------------------------------------
  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function shade(hex, amt) { // amt -1..1 (negative = darker)
    var c = hexToRgb(hex).map(function (v) {
      var t = amt < 0 ? 0 : 255, p = Math.abs(amt);
      return Math.round((t - v) * p + v);
    });
    return 'rgb(' + c.join(',') + ')';
  }
  function luminance(hex) {
    var c = hexToRgb(hex);
    return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  }

  // ---- shapes (left half, mirrored for the right half) ----------------
  var HOODIE_HALF = 'M150 100 C138 100 122 98 108 95 L72 107 C52 115 40 136 34 170 L20 334 C20 339 22 341 27 342 L62 346 C66 346 68 344 68 339 L77 204 L80 338 C80 346 82 352 87 352 L150 355 Z';
  var CREW_HALF = 'M150 102 C140 102 128 100 114 97 L64 110 C46 118 36 140 32 172 L22 300 C22 305 24 307 29 308 L62 312 C66 312 68 310 68 305 L74 210 L78 316 C78 324 80 328 85 328 L150 330 Z';
  var PANTS_HALF = 'M92 128 L150 128 L150 206 C148 270 144 350 141 432 L50 432 C54 350 70 230 92 128 Z';

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]); }
    if (parent) parent.appendChild(n);
    return n;
  }

  function mirrored(parent, build) {
    build(el('g', {}, parent));
    build(el('g', { transform: 'translate(300 0) scale(-1 1)' }, parent));
  }

  function hanger(svg, kind) {
    var metal = '#bdbdc3';
    el('path', { d: 'M150 48 V31 C150 20 158 14 166 14 C175 14 182 21 181 30', fill: 'none', stroke: metal, 'stroke-width': 2.6, 'stroke-linecap': 'round' }, svg);
    if (kind === 'pants') {
      el('path', { d: 'M150 48 L84 98 H216 Z', fill: 'none', stroke: metal, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, svg);
      [90, 210].forEach(function (x) {
        el('rect', { x: x - 7, y: 96, width: 14, height: 30, rx: 3, fill: '#2a2a2e', stroke: metal, 'stroke-width': 1.4 }, svg);
      });
    } else {
      el('path', { d: 'M150 48 L50 92 Q44 96 50 99 H250 Q256 96 250 92 Z', fill: 'none', stroke: metal, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }, svg);
    }
  }

  /**
   * @param {{type:string, hex:string, uid:string}} o
   * @returns {SVGSVGElement}
   */
  function drawGarment(o) {
    var base = o.hex, dark = shade(base, -0.28), darker = shade(base, -0.42);
    var isDark = luminance(base) < 0.2;
    var edge = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';
    var fold = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.14)';
    var rib = shade(base, isDark ? 0.07 : -0.12);

    var svg = el('svg', { viewBox: '0 0 300 460', role: 'presentation', focusable: 'false', 'aria-hidden': 'true' });
    var defs = el('defs', {}, svg);
    var gid = 'sh-' + o.uid;
    var g = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': isDark ? 0.12 : 0.22 }, g);
    el('stop', { offset: '0.45', 'stop-color': '#fff', 'stop-opacity': 0 }, g);
    el('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': isDark ? 0.3 : 0.2 }, g);
    var vg = el('linearGradient', { id: gid + 'v', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': '#000', 'stop-opacity': 0.0 }, vg);
    el('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': 0.22 }, vg);

    hanger(svg, o.type);

    if (o.type === 'pants') {
      mirrored(svg, function (grp) {
        el('path', { d: PANTS_HALF, fill: base, stroke: edge, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, grp);
        el('path', { d: 'M50 432 L141 432 L141 418 L53 418 Z', fill: rib }, grp);
        el('path', { d: 'M96 140 C102 170 106 190 108 214', fill: 'none', stroke: fold, 'stroke-width': 2, 'stroke-linecap': 'round' }, grp);
        el('path', { d: 'M118 230 C112 290 104 360 100 420', fill: 'none', stroke: fold, 'stroke-width': 2, 'stroke-linecap': 'round' }, grp);
      });
      el('rect', { x: 92, y: 118, width: 116, height: 24, rx: 4, fill: shade(base, isDark ? 0.05 : -0.08), stroke: edge, 'stroke-width': 1.2 }, svg);
      el('path', { d: 'M136 130 L132 186 M164 130 L168 192', stroke: '#f5f5f5', 'stroke-width': 3.2, 'stroke-linecap': 'round', fill: 'none' }, svg);
      el('path', { d: 'M131 186 l2 12 M169 192 l-2 12', stroke: '#f5f5f5', 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }, svg);
      mirrored(svg, function (grp) { el('path', { d: PANTS_HALF, fill: 'url(#' + gid + ')' }, grp); });
      return svg;
    }

    var half = o.type === 'crewneck' ? CREW_HALF : HOODIE_HALF;

    if (o.type === 'zipup') {
      // hood hanging behind the neck
      el('path', { d: 'M108 98 C104 70 126 58 150 58 C174 58 196 70 192 98 Z', fill: shade(base, -0.18), stroke: edge, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, svg);
    }

    mirrored(svg, function (grp) {
      el('path', { d: half, fill: base, stroke: edge, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, grp);
      if (o.type === 'zipup') {
        el('path', { d: 'M22 322 L64 332 L62 346 L24 336 Z', fill: rib }, grp);          // cuff
        el('path', { d: 'M81 334 L150 343 L150 356 L86 352 Z', fill: rib }, grp);        // hem
        el('path', { d: 'M90 268 L136 262 L140 318 L92 324 Z', fill: 'none', stroke: fold, 'stroke-width': 2, 'stroke-linejoin': 'round' }, grp); // pocket
        el('path', { d: 'M40 176 C48 220 54 262 56 300', fill: 'none', stroke: fold, 'stroke-width': 2, 'stroke-linecap': 'round' }, grp);
      } else {
        el('path', { d: 'M24 296 L64 305 L62 312 L26 308 Z', fill: rib }, grp);
        el('path', { d: 'M79 316 L150 322 L150 331 L85 328 Z', fill: rib }, grp);
        el('path', { d: 'M40 180 C46 214 50 246 52 280', fill: 'none', stroke: fold, 'stroke-width': 2, 'stroke-linecap': 'round' }, grp);
        el('path', { d: 'M100 120 C96 170 94 220 96 260', fill: 'none', stroke: fold, 'stroke-width': 2, 'stroke-linecap': 'round' }, grp);
      }
    });

    if (o.type === 'zipup') {
      // hood opening + zip + drawcords
      el('path', { d: 'M112 95 C116 112 134 122 150 124 C166 122 184 112 188 95 C176 101 164 104 150 104 C136 104 124 101 112 95 Z', fill: shade(base, -0.34), stroke: edge, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, svg);
      el('path', { d: 'M150 132 V355', stroke: isDark ? '#9a9aa0' : '#c9c9ce', 'stroke-width': 2.4 }, svg);
      el('path', { d: 'M144 150 l-2 38 M156 150 l2 38', stroke: isDark ? '#cfcfd4' : '#e8e8ea', 'stroke-width': 2, 'stroke-linecap': 'round' }, svg);
    } else {
      el('path', { d: 'M114 97 C120 118 134 126 150 126 C166 126 180 118 186 97 C176 106 164 110 150 110 C136 110 124 106 114 97 Z', fill: rib, stroke: edge, 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, svg);
    }

    mirrored(svg, function (grp) { el('path', { d: half, fill: 'url(#' + gid + ')' }, grp); });
    return svg;
  }

  window.NoxGarments = { draw: drawGarment };
})();
