// Vercel Serverless Function: receives an order and emails it to the shop owner.
// Environment variables (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY      API key from resend.com
//   ORDER_NOTIFY_EMAIL  where orders are delivered (your inbox)
//   ORDER_FROM_EMAIL    verified sender, e.g. "Nox Orders <orders@yourdomain.com>"
// Nothing is logged or stored here: the order exists only in the email.
const catalog = require('../data/products.json');

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'method' }); }

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  if (b.website) return res.status(200).json({ ok: true, ref: 'NOX-OK' }); // honeypot: silently drop bots
  if (b.consent !== true) return res.status(400).json({ ok: false, error: 'consent' });

  const c = b.customer || {};
  const cust = { name: clean(c.name, 100), phone: clean(c.phone, 25), email: clean(c.email, 120), address: clean(c.address, 200), city: clean(c.city, 80), notes: clean(c.notes, 300) };
  if (cust.name.length < 2 || !/^[+\d][\d\s\-()]{6,18}$/.test(cust.phone) || cust.address.length < 5 || cust.city.length < 2 ||
      (cust.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cust.email))) return res.status(400).json({ ok: false, error: 'invalid' });

  // Prices always come from our own catalogue, never from the browser.
  const items = Array.isArray(b.items) ? b.items.slice(0, 30) : [];
  const lines = [];
  let total = 0;
  for (const it of items) {
    const p = catalog.products.find((x) => x.id === it.pid);
    const col = p && p.colors.find((x) => x.id === it.cid);
    const qty = Math.floor(Number(it.qty));
    if (!p || !col || !p.sizes.includes(it.size) || !(qty >= 1 && qty <= 10)) return res.status(400).json({ ok: false, error: 'items' });
    total += p.price * qty;
    lines.push({ text: `${qty} x ${p.name} - ${col.name} - size ${it.size} @ ${p.price} = ${p.price * qty} ${catalog.currency}` });
  }
  if (!lines.length) return res.status(400).json({ ok: false, error: 'items' });

  const key = process.env.RESEND_API_KEY, to = process.env.ORDER_NOTIFY_EMAIL, from = process.env.ORDER_FROM_EMAIL;
  if (!key || !to || !from) return res.status(503).json({ ok: false, error: 'not_configured' });

  const ref = 'NOX-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  const text = [
    `New order ${ref}`, '',
    ...lines.map((l) => l.text), '', `Subtotal: ${total} ${catalog.currency} (delivery to be confirmed)`, '',
    `Name: ${cust.name}`, `Phone: ${cust.phone}`, `Email: ${cust.email || '-'}`,
    `Address: ${cust.address}, ${cust.city}`, `Notes: ${cust.notes || '-'}`, '',
    'Customer agreed to the Terms, Refund Policy and Privacy Policy at checkout.'
  ].join('\n');
  const html = `<pre style="font:14px/1.5 monospace">${esc(text)}</pre>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: `New Nox order ${ref}`, text, html, ...(cust.email ? { reply_to: cust.email } : {}) })
    });
    if (!r.ok) return res.status(502).json({ ok: false, error: 'send' });
    return res.status(200).json({ ok: true, ref });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'send' });
  }
};
