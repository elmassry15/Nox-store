/* Nox storefront: wardrobe rail, product sheet, bag drawer. */
(function () {
  'use strict';

  var Store = window.NoxStore;
  var Bag = Store.Bag;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var $ = function (s, r) { return (r || document).querySelector(s); };
  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (attrs[k] === false || attrs[k] == null) return;
      else n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var data, items = [], rail, caption = {}, current = 0, opener = null;

  // =====================================================================
  //  RAIL
  // =====================================================================
  function buildRail() {
    rail = $('#rail');
    rail.textContent = '';
    items = [];
    data.products.forEach(function (p) {
      p.colors.forEach(function (c) {
        var idx = items.length;
        var svg = window.NoxGarments.draw({ type: p.type, hex: c.hex, uid: String(idx) });
        var swing = h('span', { 'class': 'hanger__swing' }, [svg]);
        var btn = h('button', {
          type: 'button', 'class': 'hanger__btn',
          'aria-label': p.name + ' in ' + c.name + ', ' + Store.money(data, p.price) + '. View product.'
        }, [swing]);
        var li = h('li', { 'class': 'hanger', 'data-i': idx }, [btn]);
        rail.appendChild(li);
        items.push({ p: p, c: c, li: li, btn: btn, swing: swing, a: 0, v: 0, d: 0 });
      });
    });
    items.forEach(function (it, i) {
      it.btn.addEventListener('click', function () {
        if (dragMoved) return;
        scrollToIndex(i, true);
        openProduct(it.p.id, it.c.id, it.btn);
      });
      it.btn.addEventListener('keydown', function (e) {
        var to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null;
        if (to === null || to < 0 || to >= items.length) return;
        e.preventDefault();
        items[to].btn.focus({ preventScroll: true });
        scrollToIndex(to, true);
      });
      it.btn.addEventListener('focus', function () { scrollToIndex(i, true); });
      it.btn.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'mouse' && !reduceMotion.matches) it.v += 1.4;
        kick();
      });
    });
  }

  function itemWidth() { return items.length ? items[0].li.offsetWidth : 200; }
  function pitch() { return items.length > 1 ? items[1].li.offsetLeft - items[0].li.offsetLeft : itemWidth(); }
  function nearest() { return clamp(Math.round(rail.scrollLeft / pitch()), 0, items.length - 1); }

  function scrollToIndex(i, smooth) {
    var left = i * pitch();
    if (Math.abs(rail.scrollLeft - left) < 2) return;
    rail.scrollTo({ left: left, behavior: smooth && !reduceMotion.matches ? 'smooth' : 'auto' });
  }

  // ---- motion: perspective turn + pendulum swing -------------------------
  var raf = 0, lastLeft = 0, vel = 0, idleTimer = 0, capTimer = 0;

  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  function tick() {
    raf = 0;
    var w = itemWidth(), p = pitch();
    var left = rail.scrollLeft;
    vel = vel * 0.6 + (left - lastLeft) * 0.4;
    lastLeft = left;
    var moving = Math.abs(vel) > 0.05;
    var motion = !reduceMotion.matches;
    var target = motion ? clamp(-vel * 0.55, -18, 18) : 0;
    var live = moving;

    items.forEach(function (it, i) {
      var d = (i * p - left) / p;            // 0 = centred, ±1 = neighbour
      var ad = Math.abs(d);
      var s = clamp(1 - Math.min(ad, 2.2) * 0.17, 0.55, 1);
      var ry = motion ? clamp(-d, -1, 1) * 68 : 0;
      var tx = clamp(d, -1, 1) * w * -0.1;
      var o = clamp(1 - Math.min(ad, 2) * 0.28, 0.38, 1);
      it.li.style.transform = 'perspective(1100px) translateX(' + tx.toFixed(1) + 'px) rotateY(' + ry.toFixed(1) + 'deg) scale(' + s.toFixed(3) + ')';
      it.li.style.opacity = o.toFixed(2);
      it.li.style.zIndex = String(100 - Math.round(ad * 10));
      it.d = d;
      if (motion) {
        var t = target * (1 - Math.min(ad, 1) * 0.35);
        it.v += -0.075 * (it.a - t) - 0.11 * it.v;
        it.a += it.v;
        it.swing.style.transform = 'rotate(' + it.a.toFixed(2) + 'deg)';
        if (Math.abs(it.a - t) > 0.04 || Math.abs(it.v) > 0.04) live = true;
      }
    });
    if (live) raf = requestAnimationFrame(tick);
  }

  function onScroll() {
    kick();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(settle, 140);
  }
  function settle() {
    var i = nearest();
    if (i !== current || !caption.name.textContent) { current = i; updateCaption(); }
  }
  function updateCaption() {
    var it = items[current];
    caption.name.textContent = it.p.name;
    caption.meta.textContent = it.c.name + '  ·  ' + Store.money(data, it.p.price);
    caption.btn.setAttribute('aria-label', 'View ' + it.p.name + ' in ' + it.c.name);
    items.forEach(function (x, i) { x.li.classList.toggle('is-current', i === current); });
  }

  // ---- mouse: wheel + drag ---------------------------------------------
  var dragMoved = false;
  function bindRailInput() {
    rail.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { scrollToIndex(current, false); kick(); });

    var wheelTimer = 0;
    rail.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      rail.classList.add('is-free');
      rail.scrollLeft += e.deltaY;
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () { rail.classList.remove('is-free'); scrollToIndex(nearest(), true); }, 140);
    }, { passive: false });

    var down = false, sx = 0, sl = 0;
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; dragMoved = false; sx = e.clientX; sl = rail.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (!dragMoved && Math.abs(dx) > 6) { dragMoved = true; rail.classList.add('is-dragging'); }
      if (dragMoved) rail.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (dragMoved) {
        rail.classList.remove('is-dragging');
        scrollToIndex(nearest(), true);
        setTimeout(function () { dragMoved = false; }, 0);
      }
    });

    $('#rail-prev').addEventListener('click', function () { scrollToIndex(clamp(nearest() - 1, 0, items.length - 1), true); });
    $('#rail-next').addEventListener('click', function () { scrollToIndex(clamp(nearest() + 1, 0, items.length - 1), true); });
    caption.btn.addEventListener('click', function () { var it = items[current]; openProduct(it.p.id, it.c.id, caption.btn); });
  }

  // =====================================================================
  //  PRODUCT SHEET
  // =====================================================================
  var dlg, ps = {};   // ps = product state

  function dialogChrome(d) {
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    d.addEventListener('close', function () {
      if (!document.querySelector('dialog[open]')) document.body.classList.remove('has-modal');
    });
  }

  function openProduct(pid, cid, from) {
    var p = data.products.filter(function (x) { return x.id === pid; })[0];
    if (!p) return;
    var c = p.colors.filter(function (x) { return x.id === cid; })[0] || p.colors[0];
    opener = from || document.activeElement;
    ps = { p: p, c: c, size: null, img: 0 };
    renderProduct();
    if (!dlg.open) dlg.showModal();
    document.body.classList.add('has-modal');
    try { history.replaceState(null, '', '#' + p.id + '/' + c.id); } catch (e) { /* ignore */ }
  }

  function closeProduct() {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
  }

  function renderProduct() {
    var p = ps.p, c = ps.c;
    var host = $('#product-body');
    host.textContent = '';

    // ---- gallery
    var imgs = c.images;
    var main = h('img', { 'class': 'gallery__img', src: imgs[ps.img].src, alt: imgs[ps.img].alt, decoding: 'async' });
    main.addEventListener('load', function () { main.classList.toggle('is-wide', main.naturalWidth > main.naturalHeight); });
    var frame = h('div', { 'class': 'gallery__frame' }, [main]);
    var gallery = h('div', { 'class': 'gallery' }, [frame]);
    function show(i) {
      ps.img = (i + imgs.length) % imgs.length;
      main.src = imgs[ps.img].src; main.alt = imgs[ps.img].alt;
      count.textContent = (ps.img + 1) + ' / ' + imgs.length;
      thumbs.forEach(function (t, k) { t.setAttribute('aria-current', k === ps.img ? 'true' : 'false'); });
    }
    var count = h('span', { 'class': 'gallery__count', 'aria-hidden': 'true' });
    var thumbs = [];
    if (imgs.length > 1) {
      var prev = h('button', { type: 'button', 'class': 'gallery__nav gallery__nav--prev', 'aria-label': 'Previous photo' }, [h('span', { 'aria-hidden': 'true', text: '‹' })]);
      var next = h('button', { type: 'button', 'class': 'gallery__nav gallery__nav--next', 'aria-label': 'Next photo' }, [h('span', { 'aria-hidden': 'true', text: '›' })]);
      prev.addEventListener('click', function () { show(ps.img - 1); });
      next.addEventListener('click', function () { show(ps.img + 1); });
      frame.appendChild(prev); frame.appendChild(next); frame.appendChild(count);
      var row = h('div', { 'class': 'gallery__thumbs' });
      imgs.forEach(function (im, i) {
        var t = h('button', { type: 'button', 'class': 'gallery__thumb', 'aria-label': 'Show photo ' + (i + 1) + ' of ' + imgs.length, 'aria-current': i === ps.img ? 'true' : 'false' },
          [h('img', { src: im.src, alt: '', loading: 'lazy', decoding: 'async' })]);
        t.addEventListener('click', function () { show(i); });
        thumbs.push(t); row.appendChild(t);
      });
      gallery.appendChild(row);
      count.textContent = '1 / ' + imgs.length;
    }

    // ---- info
    var info = h('div', { 'class': 'info' });
    info.appendChild(h('p', { 'class': 'eyebrow', text: 'Nox' }));
    info.appendChild(h('h2', { id: 'product-title', 'class': 'info__title', text: p.name }));
    info.appendChild(h('p', { 'class': 'info__price', text: Store.money(data, p.price) }));

    var form = h('form', { 'class': 'buy', novalidate: true });

    // colours
    var cLegend = h('legend', {}, ['Colour: ', h('span', { 'class': 'sel', text: c.name })]);
    var cSet = h('fieldset', { 'class': 'opt' }, [cLegend]);
    var swatches = h('div', { 'class': 'swatches' });
    p.colors.forEach(function (col) {
      var id = 'c-' + col.id;
      var input = h('input', { type: 'radio', name: 'color', id: id, value: col.id, checked: col.id === c.id, 'class': 'sr-only' });
      var dot = h('span', { 'class': 'swatch__dot', 'aria-hidden': 'true' });
      dot.style.background = col.hex;
      var label = h('label', { 'for': id, 'class': 'swatch', title: col.name }, [dot, h('span', { 'class': 'sr-only', text: col.name })]);
      input.addEventListener('change', function () { ps.c = col; ps.img = 0; renderProduct(); $('#c-' + col.id).focus(); announce(col.name + ' selected'); try { history.replaceState(null, '', '#' + p.id + '/' + col.id); } catch (e) { /* ignore */ } });
      swatches.appendChild(input); swatches.appendChild(label);
    });
    cSet.appendChild(swatches);
    form.appendChild(cSet);

    // sizes
    var sLegend = h('legend', {}, ['Size']);
    var sHead = h('div', { 'class': 'opt__head' }, [sLegend]);
    var chartBtn = h('button', { type: 'button', 'class': 'btn btn--link', text: 'Size chart' });
    chartBtn.addEventListener('click', function () { openChart(p); });
    sHead.appendChild(chartBtn);
    var sSet = h('fieldset', { 'class': 'opt', 'aria-describedby': 'size-msg' });
    sSet.appendChild(sHead);
    var sizes = h('div', { 'class': 'sizes' });
    if (p.sizes.length) {
      p.sizes.forEach(function (s) {
        var id = 's-' + s;
        var input = h('input', { type: 'radio', name: 'size', id: id, value: s, 'class': 'sr-only', checked: ps.size === s });
        input.addEventListener('change', function () { ps.size = s; msg.textContent = ''; });
        sizes.appendChild(input);
        sizes.appendChild(h('label', { 'for': id, 'class': 'size', text: s }));
      });
    } else {
      sizes.appendChild(h('p', { 'class': 'muted', text: 'Sizes coming soon.' }));
    }
    sSet.appendChild(sizes);
    form.appendChild(sSet);
    var msg = h('p', { id: 'size-msg', 'class': 'form-msg', role: 'status' });
    form.appendChild(msg);

    var add = h('button', { type: 'submit', 'class': 'btn btn--solid btn--block', disabled: !p.sizes.length, text: 'Add to bag' });
    form.appendChild(add);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!ps.size) {
        msg.textContent = 'Please choose a size.';
        msg.classList.add('is-error');
        var first = sizes.querySelector('input'); if (first) first.focus();
        return;
      }
      Bag.add({ pid: p.id, cid: ps.c.id, size: ps.size, qty: 1 });
      dlg.close();
      setTimeout(openBag, 40);
    });
    info.appendChild(form);

    info.appendChild(h('p', { 'class': 'info__desc', text: p.description }));
    var det = h('details', { 'class': 'acc' }, [h('summary', { text: 'Details' }), h('ul', {}, p.details.map(function (t) { return h('li', { text: t }); }))]);
    var del = h('details', { 'class': 'acc' }, [h('summary', { text: 'Delivery & returns' }),
      h('p', {}, ['We confirm delivery cost and timing with you when we receive your order. Returns and exchanges are covered in our ', h('a', { href: '/refunds', text: 'Refund Policy' }), '.'])]);
    info.appendChild(det); info.appendChild(del);

    host.appendChild(gallery);
    host.appendChild(info);
  }

  function announce(text) { var n = $('#announce'); n.textContent = ''; setTimeout(function () { n.textContent = text; }, 30); }

  // ---- size chart ---------------------------------------------------------
  function openChart(p) {
    var chart = data.sizeCharts[p.sizeChart];
    var body = $('#size-body'); body.textContent = '';
    var empty = true;
    var table = h('table', { 'class': 'chart' });
    table.appendChild(h('caption', { text: p.name + ' – garment measurements in ' + (chart ? chart.unit : 'cm') }));
    var head = h('tr', {}, [h('th', { scope: 'col', text: 'Size' })].concat((chart ? chart.columns : []).map(function (c) { return h('th', { scope: 'col', text: c }); })));
    table.appendChild(h('thead', {}, [head]));
    var tb = h('tbody');
    p.sizes.forEach(function (s) {
      var row = chart && chart.rows[s] || [];
      var tr = h('tr', {}, [h('th', { scope: 'row', text: s })]);
      (chart ? chart.columns : []).forEach(function (_, i) {
        var v = row[i]; if (v !== '' && v != null) empty = false;
        tr.appendChild(h('td', { text: v !== '' && v != null ? v : '—' }));
      });
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    body.appendChild(table);
    if (empty) body.appendChild(h('p', { 'class': 'muted', text: 'Detailed measurements are coming soon.' }));
    $('#size-dialog').showModal();
  }

  // =====================================================================
  //  BAG DRAWER
  // =====================================================================
  function openBag() { renderBag(); $('#bag').showModal(); document.body.classList.add('has-modal'); }

  function renderBag() {
    var list = $('#bag-list'), foot = $('#bag-foot');
    list.textContent = '';
    var lines = Bag.get().map(function (l) { var f = Store.find(data, l); return f ? { l: l, p: f.p, c: f.c } : null; }).filter(Boolean);
    var sum = 0;
    $('#bag-empty').hidden = lines.length > 0;
    foot.hidden = lines.length === 0;
    lines.forEach(function (x) {
      sum += x.p.price * x.l.qty;
      var thumb = h('img', { src: x.c.images[0].src, alt: '', width: 72, height: 96, decoding: 'async' });
      var minus = h('button', { type: 'button', 'class': 'qty__btn', 'aria-label': 'Decrease quantity of ' + x.p.name + ', ' + x.c.name + ', size ' + x.l.size, text: '−' });
      var plus = h('button', { type: 'button', 'class': 'qty__btn', 'aria-label': 'Increase quantity of ' + x.p.name + ', ' + x.c.name + ', size ' + x.l.size, text: '+' });
      var rm = h('button', { type: 'button', 'class': 'btn btn--link', 'aria-label': 'Remove ' + x.p.name + ', ' + x.c.name + ', size ' + x.l.size + ' from bag', text: 'Remove' });
      minus.addEventListener('click', function () { Bag.setQty(x.l, x.l.qty - 1); });
      plus.addEventListener('click', function () { Bag.setQty(x.l, x.l.qty + 1); });
      rm.addEventListener('click', function () { Bag.setQty(x.l, 0); });
      list.appendChild(h('li', { 'class': 'line' }, [
        h('div', { 'class': 'line__img' }, [thumb]),
        h('div', { 'class': 'line__main' }, [
          h('p', { 'class': 'line__name', text: x.p.name }),
          h('p', { 'class': 'muted', text: x.c.name + ' / ' + x.l.size }),
          h('div', { 'class': 'qty' }, [minus, h('span', { 'class': 'qty__n', text: String(x.l.qty), 'aria-label': 'Quantity ' + x.l.qty }), plus]),
          rm
        ]),
        h('p', { 'class': 'line__price', text: Store.money(data, x.p.price * x.l.qty) })
      ]));
    });
    $('#bag-sub').textContent = Store.money(data, sum);
  }

  // =====================================================================
  //  INIT
  // =====================================================================
  function route() {
    var m = location.hash.replace('#', '').split('/');
    if (m[0] && data.products.some(function (p) { return p.id === m[0]; })) {
      var i = items.findIndex(function (it) { return it.p.id === m[0] && (!m[1] || it.c.id === m[1]); });
      if (i >= 0) { current = i; scrollToIndex(i, false); updateCaption(); openProduct(items[i].p.id, items[i].c.id, caption.btn); }
    }
  }

  function init() {
    dlg = $('#product');
    caption = { name: $('#cap-name'), meta: $('#cap-meta'), btn: $('#cap-btn') };
    dialogChrome(dlg); dialogChrome($('#bag')); dialogChrome($('#size-dialog'));
    dlg.addEventListener('close', closeProduct);
    document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { b.closest('dialog').close(); }); });
    $('#open-bag').addEventListener('click', openBag);
    Bag.subscribe(function () { if ($('#bag').open) renderBag(); });

    Store.load().then(function (d) {
      data = d;
      buildRail();
      bindRailInput();
      current = Math.min(2, items.length - 1);
      scrollToIndex(current, false);
      lastLeft = rail.scrollLeft;
      updateCaption();
      kick();
      document.documentElement.classList.add('is-ready');
      route();
    }).catch(function () {
      $('#rail').replaceWith(h('p', { 'class': 'load-error', role: 'alert', text: 'Sorry, the collection could not be loaded. Please refresh the page.' }));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
