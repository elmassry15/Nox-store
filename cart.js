/* Shared store logic: product data, bag (kept in this browser only), money formatting. */
(function () {
  'use strict';
  var KEY = 'nox_bag_v1';
  var dataPromise = null;
  var subs = [];

  function load() {
    if (!dataPromise) {
      dataPromise = fetch('/data/products.json', { credentials: 'omit' }).then(function (r) {
        if (!r.ok) throw new Error('products');
        return r.json();
      });
    }
    return dataPromise;
  }

  function readBag() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      if (Array.isArray(v)) return v.filter(function (l) { return l && l.pid && l.cid && l.size && l.qty > 0; });
    } catch (e) { /* blocked or corrupt */ }
    return mem;
  }
  var mem = [];
  function writeBag(bag) {
    mem = bag;
    try { localStorage.setItem(KEY, JSON.stringify(bag)); } catch (e) { /* keep in memory only */ }
    subs.forEach(function (fn) { fn(bag); });
  }

  function same(a, b) { return a.pid === b.pid && a.cid === b.cid && a.size === b.size; }

  var Bag = {
    get: readBag,
    add: function (line) {
      var bag = readBag().slice(), hit = bag.filter(function (l) { return same(l, line); })[0];
      if (hit) hit.qty = Math.min(10, hit.qty + (line.qty || 1)); else bag.push({ pid: line.pid, cid: line.cid, size: line.size, qty: line.qty || 1 });
      writeBag(bag);
    },
    setQty: function (line, qty) {
      var bag = readBag().map(function (l) { return same(l, line) ? { pid: l.pid, cid: l.cid, size: l.size, qty: Math.max(0, Math.min(10, qty)) } : l; })
        .filter(function (l) { return l.qty > 0; });
      writeBag(bag);
    },
    clear: function () { writeBag([]); },
    count: function () { return readBag().reduce(function (n, l) { return n + l.qty; }, 0); },
    subscribe: function (fn) { subs.push(fn); }
  };

  function find(data, line) {
    var p = data.products.filter(function (x) { return x.id === line.pid; })[0];
    var c = p && p.colors.filter(function (x) { return x.id === line.cid; })[0];
    return p && c ? { p: p, c: c } : null;
  }

  function money(data, n) { return data.currency + ' ' + Number(n).toLocaleString('en-US'); }

  function updateBadges() {
    var n = Bag.count();
    document.querySelectorAll('[data-bag-count]').forEach(function (b) {
      b.textContent = n;
      b.hidden = n === 0;
    });
    document.querySelectorAll('[data-bag-label]').forEach(function (b) {
      b.setAttribute('aria-label', 'Bag, ' + n + (n === 1 ? ' item' : ' items'));
    });
  }
  Bag.subscribe(updateBadges);
  window.addEventListener('storage', function (e) { if (e.key === KEY) { subs.forEach(function (fn) { fn(readBag()); }); } });
  document.addEventListener('DOMContentLoaded', updateBadges);

  window.NoxStore = { load: load, Bag: Bag, find: find, money: money };
})();
