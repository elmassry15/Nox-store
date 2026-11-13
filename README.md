# Nox store

Static site (no build step) + one serverless function (`api/order.js`). Deploys on Vercel from GitHub.

## Deploy
1. Create an empty GitHub repo, then:
   `git remote add origin https://github.com/<you>/nox-store.git && git push -u origin main`
2. vercel.com → Add New → Project → import the repo → Deploy (no settings to change).
3. Orders: Project → Settings → Environment Variables, add `RESEND_API_KEY`, `ORDER_NOTIFY_EMAIL` (your inbox) and `ORDER_FROM_EMAIL` (e.g. `Nox Orders <orders@yourdomain.com>`, a domain verified in Resend). Redeploy. Until set, checkout shows an error instead of sending.

## Things you edit
- `data/products.json`: products, prices, colours, photos, **sizes** and the **size chart** numbers (blank = dash).
- Legal pages (`terms`, `privacy`, `cookies`, `refunds`.html): search for the yellow `[PLACEHOLDERS]` (business name, address, email, phone, delivery areas, refund period, payment method) and replace them. Have a lawyer review them.
- Test locally: `python3 -m http.server` then open http://localhost:8000 (rail and pages work; `/api/order` needs Vercel or `vercel dev`).

## Compliance checklist
| Item | Status |
|---|---|
| Collect only necessary data | Name, phone, address, city + required consent. Email and notes optional. No account, DOB, card data. |
| Keyboard-friendly forms | Native inputs, visible labels, logical tab order, error summary with links to fields, focus management |
| Cookie consent | Banner with equal "Necessary only"/"Accept all", granular preferences, re-openable from footer; optional categories off by default |
| Form consent | Unticked, required checkbox linking Terms, Refunds, Privacy |
| Tracking | None. If you add analytics later, load it inside `NoxConsent.on('analytics', fn)` (js/consent.js) |
| Third-party embeds | None; system fonts; enforced by a strict Content-Security-Policy in `vercel.json` |
| Pages | Terms, Privacy, Cookies, Refunds |
| Fake reviews | None present; no ratings or testimonials |
| Accessibility | Skip link, landmarks, native `<dialog>` focus trapping + Esc, aria labels, 44px targets, visible focus, reduced-motion support, alt text |
