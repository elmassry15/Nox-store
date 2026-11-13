/* Cookie / storage consent.
   Today the site only uses strictly necessary storage (your bag and this choice) and loads NO analytics,
   advertising or third-party scripts. This module is the gate any optional tool must go through:

     NoxConsent.on('analytics', function () { ...load the analytics script here... });

   The callback only runs after the visitor has opted in, and again on later visits while consent stands. */
(function () {
  'use strict';
  var KEY = 'nox_consent_v1';
  var listeners = { analytics: [], marketing: [] };
  var state = read();

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      if (v && v.v === 1) return v;
    } catch (e) { /* storage blocked: treated as no choice yet */ }
    return null;
  }
  function save(analytics, marketing) {
    state = { v: 1, analytics: !!analytics, marketing: !!marketing, ts: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    fire();
  }
  function has(cat) { return !!(state && state[cat]); }
  function fire() {
    Object.keys(listeners).forEach(function (cat) {
      if (!has(cat)) return;
      listeners[cat].splice(0).forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
    });
  }
  function on(cat, fn) {
    if (!listeners[cat]) return;
    if (has(cat)) { fn(); } else { listeners[cat].push(fn); }
  }

  // ---- UI -------------------------------------------------------------
  var banner, prefs, lastFocus;

  function build() {
    banner = document.createElement('section');
    banner.className = 'consent';
    banner.setAttribute('aria-labelledby', 'consent-title');
    banner.hidden = true;
    banner.innerHTML =
      '<h2 id="consent-title" class="consent__title">Cookies &amp; storage</h2>' +
      '<p class="consent__text">We only use what is needed to run the shop (your bag and this choice). ' +
      'We don’t use analytics or advertising cookies today. Read our <a href="/cookies">Cookie Policy</a>.</p>' +
      '<div class="consent__actions">' +
      '<button type="button" class="btn btn--ghost" data-c="necessary">Necessary only</button>' +
      '<button type="button" class="btn btn--ghost" data-c="all">Accept all</button>' +
      '<button type="button" class="btn btn--link" data-c="prefs">Preferences</button>' +
      '</div>';
    document.body.insertBefore(banner, document.body.firstChild.nextSibling);

    prefs = document.createElement('dialog');
    prefs.className = 'modal modal--small';
    prefs.setAttribute('aria-labelledby', 'prefs-title');
    prefs.innerHTML =
      '<form method="dialog" class="modal__body" id="prefs-form">' +
      '<h2 id="prefs-title">Cookie preferences</h2>' +
      '<p class="muted">Optional categories are off unless you switch them on. You can change this at any time from the footer.</p>' +
      '<div class="toggle"><input type="checkbox" id="p-nec" checked disabled><label for="p-nec"><strong>Strictly necessary</strong><span>Keeps your bag and remembers this choice. Always on.</span></label></div>' +
      '<div class="toggle"><input type="checkbox" id="p-ana"><label for="p-ana"><strong>Analytics</strong><span>Not used at the moment. If we add it, it stays off until you opt in.</span></label></div>' +
      '<div class="toggle"><input type="checkbox" id="p-mkt"><label for="p-mkt"><strong>Marketing</strong><span>Not used at the moment. If we add it, it stays off until you opt in.</span></label></div>' +
      '<div class="modal__actions"><button type="button" class="btn btn--ghost" data-p="cancel">Cancel</button><button type="submit" class="btn btn--solid" data-p="save">Save choices</button></div>' +
      '</form>';
    document.body.appendChild(prefs);

    banner.addEventListener('click', function (e) {
      var c = e.target && e.target.getAttribute && e.target.getAttribute('data-c');
      if (c === 'all') { save(true, true); hide(); }
      else if (c === 'necessary') { save(false, false); hide(); }
      else if (c === 'prefs') { openPrefs(); }
    });
    prefs.addEventListener('close', function () { if (lastFocus && lastFocus.focus) lastFocus.focus(); });
    prefs.querySelector('[data-p="cancel"]').addEventListener('click', function () { prefs.close(); });
    prefs.querySelector('form').addEventListener('submit', function () {
      save(prefs.querySelector('#p-ana').checked, prefs.querySelector('#p-mkt').checked);
      hide();
    });
  }

  function hide() { if (banner) banner.hidden = true; }
  function openPrefs() {
    if (!prefs) build();
    lastFocus = document.activeElement;
    prefs.querySelector('#p-ana').checked = has('analytics');
    prefs.querySelector('#p-mkt').checked = has('marketing');
    prefs.showModal();
  }

  function init() {
    build();
    if (!state) banner.hidden = false; else fire();
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-consent-open]');
      if (t) { e.preventDefault(); openPrefs(); }
    });
  }

  window.NoxConsent = { has: has, on: on, open: openPrefs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
