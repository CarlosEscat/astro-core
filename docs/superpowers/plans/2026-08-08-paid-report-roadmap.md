# Paid Report — Build Roadmap (Plans 1-4)

**Spec:** `docs/superpowers/specs/2026-08-08-paid-report-flow-design.md`

Four plans, strictly sequential. Each produces working, testable software
on its own. Plan 1 is written in full; plans 2-4 are mapped here at task
level and get expanded into full TDD plans when their turn comes —
writing exact code for plan 3 today would invent detail that plan 1's
battery may invalidate.

| Plan | Delivers | Depends on | Vendors |
|---|---|---|---|
| 1 | Section generation core in `astro-core` | — | none |
| 2 | Orders, payment, persistence | 1 (schema stores its output) | Stripe, Supabase |
| 3 | Queued generation pipeline | 1 + 2 | Inngest, Resend |
| 4 | Delivery UI and share card | 3 | — |

**Why this order.** Plan 1 needs no accounts and ends by measuring the
risk accepted in Addendum 10 — whether DeepSeek V4 Pro under per-section
briefing holds quality. That answer arrives before any infrastructure is
built on the assumption. Plan 2 can be built in parallel with plan 1 if
you want, since the schema does not depend on which model wins; plans 3
and 4 cannot.

---

## Plan 1 — Section generation core ✅ WRITTEN

`docs/superpowers/plans/2026-08-08-per-section-report-generation.md`

Seven tasks: section briefs as data, deterministic aspect allocation,
`parseReport` heading tolerance, per-section prompt and message builder,
structural validation with gender marks logged not gated, composition
back into parseable markdown, and the measuring battery. 169 → 205 tests.

**Done when:** `scripts/battery-sections.ts` produces three complete
reports and you have read them, with wall clock, cost, escalation rate
and gender marks recorded in HANDOVER.

---

## Plan 2 — Orders, payment and persistence

**Delivers:** a buyer can pay, and an order reaches `paid` with its birth
data stored. Nothing generates yet — that is plan 3. Verifiable end to
end with the Stripe CLI in test mode.

**Vendor setup inside this plan:** Stripe account with **Bizum
explicitly enabled** (Spain conversion driver, locked decision), and a
Supabase project. Both need your credentials, so this plan cannot be run
unattended.

### Tasks

1. **Supabase project and the `orders` migration.** Columns per the
   spec: `id`, `token`, `product_code`, `status`, birth data
   (`birth_date`, `birth_time`, `latitude`, `longitude`, `first_name`,
   `focus`), `email`, `stripe_session_id`, `paid_at`, `chart` JSONB,
   timestamps. Status as a Postgres enum matching the state table.
   Unique index on `token`.
2. **`report_sections` migration.** `order_id`, `index`, `title`,
   `body`, `model`, `attempts`, `cost`, `gender_marks`, `word_count`.
   **Unique on `(order_id, index)`** — this is what makes a retry
   idempotent rather than duplicating rows.
3. **`entitlements` migration.** `order_id`, `kind`, `value` JSONB,
   `expires_at`. Addendum 3 point 3: a new SKU is a row plus a prompt
   file, never a migration. Seeded with `report_access` on payment.
4. **Row Level Security.** The token is the only credential, so the
   anon key must not be able to read arbitrary orders. Server-side
   access only, via the service role; RLS denies everything else.
5. **Token generation and lookup.** 32 bytes of `crypto.randomBytes`
   base64url. Pure, unit-testable: entropy, uniqueness, URL safety.
6. **`POST /api/checkout`.** Validates birth data with the same rules as
   `/api/free` (`web/src/app/api/free/route.ts:29-33` — reuse, do not
   re-derive), writes the `pending_payment` order, creates the Stripe
   Checkout Session with `metadata: { order_id }` and
   `success_url = /informe/<token>`, returns the session URL.
   **Stripe receives only the opaque id** — never birth data (spec
   decision 2).
7. **`POST /api/webhooks/stripe`.** Signature verification against the
   raw body (Next.js route config must not pre-parse it), idempotent
   `paid` transition, stores the email Stripe collected, seeds the
   entitlement. Returns 200 fast. Tests: valid signature, tampered
   signature rejected, duplicate delivery is a no-op.
8. **Expiry sweep.** Daily job marking `pending_payment` older than 24h
   as `expired` **and deleting their birth data** — someone who never
   paid should not leave sensitive data stored (spec decision 2).

**Done when:** `stripe trigger checkout.session.completed` moves a real
row to `paid` with an entitlement, and a replayed webhook changes
nothing.

---

## Plan 3 — Queued generation pipeline

**Delivers:** paying produces a stored report. Depends on plan 1 for
generation and plan 2 for somewhere to put it.

**Vendor setup inside this plan:** Inngest and Resend.

### Tasks

1. **Inngest wiring and local dev loop.** The dev server must run
   locally or the remaining tasks are untestable.
2. **Conditional claim.** `paid → generating`, applied only if still
   `paid`. Queues deliver at-least-once; without this a duplicate
   delivery generates and bills twice. Test by invoking the function
   twice concurrently.
3. **Wave 1 fan-out.** Sections 0-6 concurrently via
   `buildSectionMessages` + `allocateFeatures` from plan 1, each
   persisted the moment it lands so plan 4 can render progressively.
4. **Wave 2 synthesis.** Section 7, fed the first sentence of each
   earlier section (`priorOpenings`). Runs only after wave 1 completes.
5. **Per-section retry and escalation.** 2 DeepSeek attempts, then 1
   Kimi. Persist `model`, `attempts`, `cost`, `gender_marks` per section
   — that is how the Addendum 10 risk gets monitored in production
   rather than only in the battery.
6. **`ready` transition and the Resend email.** Fires when the last
   section lands. Email is a safety net, not the primary delivery
   (spec: at ~30s the holding page is the real experience).
7. **`failed` path.** Both models exhausted on any section → `failed`,
   alert, no email. Refund stays **manual** by decision.

**Done when:** a test-mode payment produces eight stored sections and a
delivered email, and killing the worker mid-run leaves the order
recoverable rather than half-charged.

---

## Plan 4 — Delivery UI and share card

**Delivers:** the buyer reads their report. Depends on plan 3.

### Tasks

1. **`/informe/<token>` route.** Server-side lookup by token, rate
   limited — the token is the only credential.
2. **Holding page states.** `paid`/`generating` → progressive render
   with 2s polling; `ready` → full report; `failed` → honest message,
   not a spinner forever; unknown token → 404 that does not leak whether
   the token exists.
3. **Progressive section rendering.** Sections appear as they land, in
   order, with placeholders for pending ones. This is what turns ~30s
   into a readable experience rather than a wait.
4. **Report component.** Follows the established design language —
   "precision as mysticism", ink/bone/brass/copper, Fraunces and IBM
   Plex (Addendum 5). Zodiac glyphs carry U+FE0E or they render as
   colour emoji on Apple platforms.
5. **Share card, 9:16.** `Signature.tsx` already computes the real
   rarity statistic; this needs the Instagram/TikTok aspect ratio and a
   share affordance, not new maths. Addendum 1 keeps it in the MVP for
   distribution value.
6. **Buy CTA.** Wire `BirthForm.tsx:287`'s existing pitch copy to
   `POST /api/checkout`. Today it is marketing text with nothing behind
   it.

**Done when:** a payment in test mode ends with a rendered report and a
shareable card, from a browser, without touching the terminal.

---

## Explicitly out of scope

- **PDF rendering** (Puppeteer over the report component) — its own
  spec. Heavier runtime, different problem.
- **Oracle chat** — post-MVP. Needs `system-oracle.md`, a rolling-window
  context builder (`buildReportMessages` is single-shot and must not be
  reused), quota in `entitlements`, and a rate limiter.
- **Daily cron / horoscopes** — separate product line. Needs
  transit-to-natal aspects, which `aspects.ts` does not compute
  (Addendum 3 point 1).

## Open questions these plans do not answer

1. **Does DeepSeek V4 Pro hold quality per section?** Plan 1 task 7
   measures it. Everything downstream assumes yes.
2. **Real cost of eight calls.** Eight prompts each carry the chart and
   rules (~3,400 tokens). Prefix caching should absorb it; unmeasured.
3. **Reasoning effort.** Untested on Kimi, and now applies per section.
   Addendum 5 proved the win on the teaser.
4. **`acabas agotada`** and similar constructions escape the gender
   check entirely (Addendum 9). Matters more once reports ship at volume.
