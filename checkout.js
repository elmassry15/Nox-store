/* Checkout: keyboard-friendly, accessible validation; sends only the fields needed to fulfil the order. */
(function () {
  'use strict';
  var Store = window.NoxStore, Bag = Store.Bag;
  var $ = function (s) { return document.querySelector(s); };
  var data;
  var form = $('#form'), status = $('#form-status');

  var RULES = {
    name:    { label: 'Full name',      test: function (v) { return v.trim().length >= 2; }, msg: 'Enter your full name.' },
    phone:   { label: 'Phone number',   test: function (v) { return /^[+\d][\d\s\-()]{6,18}$/.test(v.trim()); }, msg: 'Enter a phone number with digits only (you can start with +).' },
    email:   { label: 'Email',          test: function (v) { return v.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }, msg: 'Enter a valid email address, or leave it empty.' },
    address: { label: 'Street address', test: function (v) { return v.trim().length >= 5; }, msg: 'Enter your street address.' },
    city:    { label: 'City / area',    test: function (v) { return v.trim().length >= 2; }, msg: 'Enter your city or area.' },
    consent: { label: 'Agreement',      test: function (v, el) { return el.checked; }, msg: 'Please tick the box to agree before placing your order.' }
  };

  function setError(id, msg) {
    var input = $('#' + id), err = $('#' + id + '-e');
    var hint = input.getAttribute('data-hint');
    if (msg) {
      err.textContent = msg; err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', (hint ? hint + ' ' : '') + id + '-e');
    } else {
      err.hidden = true; err.textContent = '';
      input.removeAttribute('aria-invalid');
      if (hint) input.setAttribute('aria-describedby', hint); else input.removeAttribute('aria-describedby');
    }
  }
  function validateOne(id) {
    var el = $('#' + id), r = RULES[id];
    var ok = r.test(el.value, el);
    setError(id, ok ? '' : r.msg);
    return ok;
  }
  Object.keys(RULES).forEach(function (id) {
    var el = $('#' + id);
    el.addEventListener('blur', function () { if (el.getAttribute('aria-invalid') === 'true' || (el.value && id !== 'consent')) validateOne(id); });
    el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true') validateOne(id); });
    el.addEventListener('change', function () { if (id === 'consent') validateOne(id); });
  });

  function render() {
    var lines = Bag.get().map(function (l) { var f = Store.find(data, l); return f ? { l: l, p: f.p, c: f.c } : null; }).filter(Boolean);
    var empty = lines.length === 0;
    $('#empty').hidden = !empty || !$('#done').hidden;
    $('#co').hidden = empty;
    var host = $('#sum-lines'); host.textContent = '';
    var sum = 0;
    lines.forEach(function (x) {
      sum += x.p.price * x.l.qty;
      var row = document.createElement('div'); row.className = 'mini-line';
      var left = document.createElement('p'); left.textContent = x.l.qty + ' × ' + x.p.name + ' – ' + x.c.name + ', ' + x.l.size;
      var right = document.createElement('p'); right.textContent = Store.money(data, x.p.price * x.l.qty);
      row.appendChild(left); row.appendChild(right); host.appendChild(row);
    });
    $('#sum-total').textContent = Store.money(data, sum);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = [];
    Object.keys(RULES).forEach(function (id) { if (!validateOne(id)) bad.push(id); });
    var box = $('#err-summary'), list = $('#err-list');
    list.textContent = '';
    if (bad.length) {
      bad.forEach(function (id) {
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = '#' + id; a.textContent = RULES[id].msg;
        a.addEventListener('click', function (ev) { ev.preventDefault(); $('#' + id).focus(); });
        li.appendChild(a); list.appendChild(li);
      });
      box.hidden = false; box.focus();
      return;
    }
    box.hidden = true;
    var btn = $('#submit'); btn.disabled = true; btn.textContent = 'Placing order…';
    status.classList.remove('is-error'); status.textContent = '';

    var body = {
      items: Bag.get(),
      customer: { name: $('#name').value.trim(), phone: $('#phone').value.trim(), email: $('#email').value.trim(), address: $('#address').value.trim(), city: $('#city').value.trim(), notes: $('#notes').value.trim() },
      consent: true,
      website: $('#website').value
    };
    fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'omit' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok) throw new Error(res.j.error || 'failed');
        Bag.clear();
        $('#co').hidden = true; $('#empty').hidden = true;
        $('#ref').textContent = res.j.ref;
        var done = $('#done'); done.hidden = false; done.focus();
        document.title = 'Order received — Nox';
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = 'Place order';
        status.classList.add('is-error');
        status.textContent = 'Sorry, we could not send your order. Please try again in a moment, or contact us directly. Your bag has not been cleared.';
      });
  });

  Store.load().then(function (d) { data = d; render(); Bag.subscribe(render); })
    .catch(function () { status.textContent = 'Could not load the shop data. Please refresh.'; });
})();
