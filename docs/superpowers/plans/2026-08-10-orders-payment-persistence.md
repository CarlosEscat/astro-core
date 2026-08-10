# Orders, Payment and Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A buyer can pay for a report, and the order reaches `paid` with its birth data stored and an entitlement granted. Nothing generates yet — that is plan 3.

**Architecture:** Four layers. The pure decisions (order state machine, webhook idempotency, token generation, birth-input validation) live in `astro-core/src/` and are tested by the existing vitest suite with no network and no vendors. Supabase holds three tables behind Row Level Security that denies everything, reached only through the service role. `web/src/lib/orders-store.ts` defines a narrow `OrderStore` interface with a Supabase implementation and an in-memory fake, so the two routes are tested without a database. `/api/checkout` and `/api/webhooks/stripe` are thin adapters over those pieces.

**Tech Stack:** TypeScript (ESM), vitest 4, Next.js **16.3.0** App Router, `stripe` 22.x, `@supabase/supabase-js` 2.x, Supabase CLI 2.x, Stripe CLI.

**Spec:** `docs/superpowers/specs/2026-08-08-paid-report-flow-design.md`
**Roadmap:** `docs/superpowers/plans/2026-08-08-paid-report-roadmap.md` (plan 2 section)

**Scope:** Checkout, payment, persistence and the expiry sweep. Generation is plan 3; the delivery UI is plan 4. This plan deliberately stops at `paid`.

---

## Global Constraints

- `npm test` must stay green from the repo root. Baseline **215 tests in 13 files**. This plan adds web-side tests to that same suite rather than creating a second one — CLAUDE.md treats one command as the source of truth.
- `npm run example` must keep working — vitest passing does NOT prove the tsx path works (ESM interop).
- **Read `web/AGENTS.md` before writing any code under `web/`.** This is Next.js 16.3.0 and its docs are bundled at `web/node_modules/next/dist/docs/`. Do not write Next.js from memory.
- **Birth data never reaches Stripe.** Stripe's `metadata` carries only the opaque `order_id`. Same reasoning as the bundled GeoNames index (Addendum 4): a third party should not see where or when someone was born.
- **Birth data is written only at checkout intent**, and the 24h sweep deletes it for anyone who never paid (spec decision 2).
- **The webhook never generates.** It marks paid and (in plan 3) enqueues. It must return 2xx fast.
- **The token is the only credential** for a report. 32 bytes of `crypto.randomBytes`, and any route that takes one is rate limited.
- All user-facing strings are Spanish (es-ES, "de tú"), matching `web/src/app/api/free/route.ts`.
- Secrets live in `web/.env.local` (gitignored). Never commit or print them.
- Commit after every task.

## Vendor setup this plan requires

This is the first plan that cannot run unattended. Before Task 4 you need:

1. **A Supabase project** (free tier is fine) and the Supabase CLI (`npm i -g supabase`).
2. **A Stripe account in test mode** and the Stripe CLI (`npm i -g @stripe/cli`).
3. **Bizum enabled** on the Stripe account — *see the warning in Task 6 Step 1. Bizum is currently gated behind a Stripe early-access request, so treat it as a task that may block on Stripe rather than on us.*

---

## File Structure

| File | Responsibility |
|---|---|
| `src/orders.ts` | Order status enum, `canTransition`, `webhookDecision`, `newOrderToken`. Pure. |
| `src/birthinput.ts` | `parseBirthInput` — the validation currently inline in `/api/free`, extracted so checkout reuses it. Pure. |
| `tests/orders.test.ts`, `tests/birthinput.test.ts` | Their tests. |
| `vitest.config.ts` (root) | Aliases so `web/` tests run in the one suite. |
| `supabase/migrations/*.sql` | `orders`, `report_sections`, `entitlements`, RLS. |
| `web/src/lib/orders-store.ts` | `OrderStore` interface + `InMemoryOrderStore` fake. |
| `web/src/lib/orders-store.supabase.ts` | The Supabase implementation. |
| `web/src/lib/stripe.ts` | Stripe client singleton. |
| `web/src/app/api/checkout/route.ts` | Creates the order and the Stripe session. |
| `web/src/app/api/webhooks/stripe/route.ts` | Signature verification, idempotent `paid`. |
| `web/src/app/api/cron/expire/route.ts` | The 24h sweep. |
| `web/tests/*.test.ts` | Route tests against the fake store. |

---

### Task 1: Order state machine and webhook decision (`src/orders.ts`)

Pure, no vendors, no network. Everything that decides *whether* a transition is legal lives here so the routes cannot invent their own rules, and so plan 3's worker shares them.

**Files:**
- Create: `src/orders.ts`
- Test: `tests/orders.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `OrderStatus`, `ORDER_STATUSES`, `canTransition(from: OrderStatus, to: OrderStatus): boolean`, `WebhookDecision`, `webhookDecision(status: OrderStatus | null, eventType: string): WebhookDecision`

- [ ] **Step 1: Write the failing test**

Create `tests/orders.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  ORDER_STATUSES, canTransition, webhookDecision, type OrderStatus,
} from "../src/orders";

describe("order status", () => {
  it("has exactly the six states the spec defines", () => {
    expect([...ORDER_STATUSES]).toEqual([
      "pending_payment", "paid", "generating", "ready", "failed", "expired",
    ]);
  });
});

describe("canTransition", () => {
  it("allows the happy path", () => {
    expect(canTransition("pending_payment", "paid")).toBe(true);
    expect(canTransition("paid", "generating")).toBe(true);
    expect(canTransition("generating", "ready")).toBe(true);
  });

  it("allows the two failure exits", () => {
    expect(canTransition("pending_payment", "expired")).toBe(true);
    expect(canTransition("generating", "failed")).toBe(true);
  });

  // The conditional claim in plan 3 depends on this: a duplicate queue
  // delivery must not be able to re-enter generating and bill twice.
  it("refuses to re-enter a state that is already claimed", () => {
    expect(canTransition("generating", "generating")).toBe(false);
    expect(canTransition("paid", "paid")).toBe(false);
  });

  it("refuses to leave a terminal state", () => {
    for (const terminal of ["ready", "failed", "expired"] as OrderStatus[]) {
      for (const to of ORDER_STATUSES) {
        expect(canTransition(terminal, to), `${terminal} → ${to}`).toBe(false);
      }
    }
  });

  it("refuses to skip generation", () => {
    expect(canTransition("paid", "ready")).toBe(false);
    expect(canTransition("pending_payment", "generating")).toBe(false);
  });
});

describe("webhookDecision", () => {
  const EVENT = "checkout.session.completed";

  it("processes a first delivery for a pending order", () => {
    expect(webhookDecision("pending_payment", EVENT).action).toBe("process");
  });

  // Stripe delivers at-least-once; a replay must change nothing.
  it("ignores a duplicate delivery for an order already paid", () => {
    const d = webhookDecision("paid", EVENT);
    expect(d.action).toBe("ignore");
    expect(d.reason).toMatch(/ya/i);
  });

  it("ignores deliveries for orders already past payment", () => {
    for (const s of ["generating", "ready", "failed"] as OrderStatus[]) {
      expect(webhookDecision(s, EVENT).action, s).toBe("ignore");
    }
  });

  it("ignores an unknown order rather than throwing", () => {
    expect(webhookDecision(null, EVENT).action).toBe("ignore");
  });

  it("ignores event types it does not handle", () => {
    expect(webhookDecision("pending_payment", "payment_intent.created").action).toBe("ignore");
  });

  // The sweep and a late payment can race. Losing the race must be loud:
  // the buyer's money arrived and their birth data has been deleted.
  it("flags a payment that arrives after the sweep expired the order", () => {
    const d = webhookDecision("expired", EVENT);
    expect(d.action).toBe("ignore");
    expect(d.alert).toBe(true);
  });

  it("does not flag ordinary duplicates for alerting", () => {
    expect(webhookDecision("paid", EVENT).alert).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/orders.test.ts`
Expected: FAIL — `Cannot find module '../src/orders'`

- [ ] **Step 3: Write minimal implementation**

Create `src/orders.ts`:

```ts
/**
 * The order lifecycle, as pure data. Both the webhook (plan 2) and the
 * generation worker (plan 3) decide from this table rather than from their own
 * inline conditions, because "is this transition legal" is the same question in
 * both places and answering it twice is how they drift apart.
 */
export const ORDER_STATUSES = [
  "pending_payment", "paid", "generating", "ready", "failed", "expired",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Legal transitions. Note that no state may transition to itself: the
 * conditional `paid → generating` claim in plan 3 relies on a second, duplicate
 * queue delivery finding the transition already made and refusing it. Without
 * that, at-least-once delivery generates — and bills — twice.
 */
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["paid", "expired"],
  paid: ["generating"],
  generating: ["ready", "failed"],
  ready: [],
  failed: [],
  expired: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from].includes(to);
}

export interface WebhookDecision {
  action: "process" | "ignore";
  reason: string;
  /** Needs a human. Set only where ignoring is correct but not harmless. */
  alert?: boolean;
}

const HANDLED_EVENT = "checkout.session.completed";

/**
 * What the Stripe webhook should do, given the order's current status. Pure so
 * that idempotency is unit-testable without a database or a live Stripe.
 */
export function webhookDecision(
  status: OrderStatus | null,
  eventType: string,
): WebhookDecision {
  if (eventType !== HANDLED_EVENT) {
    return { action: "ignore", reason: `evento no gestionado: ${eventType}` };
  }
  if (status === null) {
    return { action: "ignore", reason: "pedido desconocido" };
  }
  if (status === "pending_payment") {
    return { action: "process", reason: "primer aviso de pago" };
  }
  // The sweep deletes birth data when it expires an order, so a payment landing
  // afterwards means we have been paid and can no longer generate. Rare, but it
  // must never pass silently.
  if (status === "expired") {
    return {
      action: "ignore",
      reason: "pago recibido tras caducar el pedido: revisar manualmente",
      alert: true,
    };
  }
  return { action: "ignore", reason: `el pedido ya está en ${status}` };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/orders.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/orders.ts tests/orders.test.ts
git commit -m "feat: order state machine and webhook idempotency decision"
```

---

### Task 2: Token generation (`src/orders.ts`)

The token is the report's only credential. It is separated from Task 1 because its failure mode is entirely different: a weak token is a security defect, not a logic bug.

**Files:**
- Modify: `src/orders.ts`
- Test: `tests/orders.test.ts` (new describe block)

**Interfaces:**
- Consumes: `node:crypto`
- Produces: `newOrderToken(): string` — 43-char base64url, 256 bits of entropy

- [ ] **Step 1: Write the failing test**

Add to `tests/orders.test.ts`:

```ts
import { newOrderToken } from "../src/orders";

describe("newOrderToken", () => {
  it("is URL-safe with no padding", () => {
    for (let i = 0; i < 50; i++) {
      expect(newOrderToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  // 32 bytes base64url encodes to 43 characters. Anything shorter means
  // someone reduced the entropy of the only credential the report has.
  it("carries 32 bytes of entropy", () => {
    expect(newOrderToken()).toHaveLength(43);
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 2000 }, () => newOrderToken()));
    expect(seen.size).toBe(2000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/orders.test.ts -t "newOrderToken"`
Expected: FAIL — `newOrderToken is not a function`

- [ ] **Step 3: Write minimal implementation**

Add to `src/orders.ts` (import at the top of the file):

```ts
import { randomBytes } from "node:crypto";

/**
 * The report's only credential — there is no account and no password, so a
 * guessable token is a full read of someone's birth data and their report.
 * 32 bytes, base64url, no padding: 43 characters, 256 bits.
 */
export function newOrderToken(): string {
  return randomBytes(32).toString("base64url");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/orders.test.ts`
Expected: PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add src/orders.ts tests/orders.test.ts
git commit -m "feat: order token generation, 256 bits base64url"
```

---

### Task 3: Shared birth-input validation (`src/birthinput.ts`)

`/api/free` validates birth input inline at `web/src/app/api/free/route.ts:29-33`. Checkout needs the identical rules, and re-deriving them is how two endpoints start disagreeing about what a valid birth date is. Extract, test, and refactor the existing route to use it — behaviour must not change.

**Files:**
- Create: `src/birthinput.ts`
- Test: `tests/birthinput.test.ts`
- Modify: `web/src/lib/astro.ts` (re-export), `web/src/app/api/free/route.ts:29-42`

**Interfaces:**
- Consumes: `BirthLocalTime` from `src/birthtime.ts`
- Produces: `BirthInput`, `ParsedBirth`, `parseBirthInput(raw: unknown): ParsedBirth`

- [ ] **Step 1: Write the failing test**

Create `tests/birthinput.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseBirthInput } from "../src/birthinput";

const valid = {
  date: "1992-04-15", time: "10:30", latitude: 40.4168, longitude: -3.7038,
};

describe("parseBirthInput", () => {
  it("accepts well-formed input", () => {
    const r = parseBirthInput(valid);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.value.local).toEqual({ year: 1992, month: 4, day: 15, hour: 10, minute: 30 });
    expect(r.value.latitude).toBe(40.4168);
  });

  it("rejects a missing or malformed date in Spanish", () => {
    for (const date of [undefined, "", "15/04/1992", "1992-4-15"]) {
      const r = parseBirthInput({ ...valid, date });
      expect(r.ok, String(date)).toBe(false);
      if (r.ok) throw new Error("unreachable");
      expect(r.error).toMatch(/fecha/i);
    }
  });

  it("rejects a missing or malformed time", () => {
    for (const time of [undefined, "", "10.30", "1:30"]) {
      const r = parseBirthInput({ ...valid, time });
      expect(r.ok, String(time)).toBe(false);
      if (r.ok) throw new Error("unreachable");
      expect(r.error).toMatch(/hora/i);
    }
  });

  it("rejects coordinates that are absent or not numbers", () => {
    for (const patch of [{ latitude: undefined }, { longitude: "-3.7" }, { latitude: NaN }]) {
      const r = parseBirthInput({ ...valid, ...patch });
      expect(r.ok, JSON.stringify(patch)).toBe(false);
      if (r.ok) throw new Error("unreachable");
      expect(r.error).toMatch(/lugar/i);
    }
  });

  // Out-of-range values reach computeNatalChart and corrupt a chart silently
  // rather than failing, so they are rejected at the edge.
  it("rejects coordinates outside the globe", () => {
    expect(parseBirthInput({ ...valid, latitude: 91 }).ok).toBe(false);
    expect(parseBirthInput({ ...valid, longitude: 181 }).ok).toBe(false);
  });

  it("rejects impossible calendar and clock values", () => {
    expect(parseBirthInput({ ...valid, date: "1992-13-15" }).ok).toBe(false);
    expect(parseBirthInput({ ...valid, date: "1992-04-31" }).ok).toBe(false);
    expect(parseBirthInput({ ...valid, time: "24:00" }).ok).toBe(false);
    expect(parseBirthInput({ ...valid, time: "10:60" }).ok).toBe(false);
  });

  it("passes through an optional first name and focus", () => {
    const r = parseBirthInput({ ...valid, firstName: "Lucía", focus: "amor" });
    if (!r.ok) throw new Error("unreachable");
    expect(r.value.firstName).toBe("Lucía");
    expect(r.value.focus).toBe("amor");
  });

  it("defaults focus to general and rejects an unknown focus", () => {
    const r = parseBirthInput(valid);
    if (!r.ok) throw new Error("unreachable");
    expect(r.value.focus).toBe("general");
    expect(parseBirthInput({ ...valid, focus: "dinero" }).ok).toBe(false);
  });

  it("rejects a non-object body rather than throwing", () => {
    for (const bad of [null, undefined, "texto", 42]) {
      expect(parseBirthInput(bad).ok, String(bad)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/birthinput.test.ts`
Expected: FAIL — `Cannot find module '../src/birthinput'`

- [ ] **Step 3: Write minimal implementation**

Create `src/birthinput.ts`:

```ts
import type { BirthLocalTime } from "./birthtime";

export type Focus = "amor" | "trabajo" | "general";

export interface BirthInput {
  local: BirthLocalTime;
  latitude: number;
  longitude: number;
  firstName?: string;
  focus: Focus;
}

export type ParsedBirth =
  | { ok: true; value: BirthInput }
  | { ok: false; error: string };

const FOCUSES: readonly string[] = ["amor", "trabajo", "general"];

function fail(error: string): ParsedBirth {
  return { ok: false, error };
}

/**
 * The single definition of "valid birth input", shared by /api/free and
 * /api/checkout. Two endpoints deriving these rules separately is how they
 * start disagreeing about what a valid birth date is.
 *
 * Messages are the es-ES strings the form already shows.
 */
export function parseBirthInput(raw: unknown): ParsedBirth {
  if (typeof raw !== "object" || raw === null) return fail("Falta la fecha de nacimiento.");
  const body = raw as Record<string, unknown>;
  const { date, time, latitude, longitude, firstName, focus } = body;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return fail("Falta la fecha de nacimiento.");
  }
  if (typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time)) {
    return fail("Falta la hora de nacimiento.");
  }
  if (typeof latitude !== "number" || typeof longitude !== "number"
      || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return fail("Elige un lugar de nacimiento de la lista.");
  }
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return fail("Elige un lugar de nacimiento de la lista.");
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  // Round-trip through UTC: this rejects 1992-04-31 and 1992-02-30, which the
  // regex cannot. A wrong-but-parseable date silently produces a wrong chart.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1
      || probe.getUTCDate() !== day) {
    return fail("Esa fecha de nacimiento no existe.");
  }
  if (hour > 23 || minute > 59) return fail("Esa hora de nacimiento no existe.");

  if (focus !== undefined && (typeof focus !== "string" || !FOCUSES.includes(focus))) {
    return fail("Enfoque no válido.");
  }

  return {
    ok: true,
    value: {
      local: { year, month, day, hour, minute },
      latitude,
      longitude,
      firstName: typeof firstName === "string" && firstName.trim() ? firstName : undefined,
      focus: (focus as Focus | undefined) ?? "general",
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/birthinput.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Refactor `/api/free` to use it**

In `web/src/lib/astro.ts`, add to the re-exports at the bottom:

```ts
export { parseBirthInput } from "@core/birthinput";
export type { BirthInput, ParsedBirth, Focus } from "@core/birthinput";
```

In `web/src/app/api/free/route.ts`, replace the `Body` interface and the block at lines 25-42 with:

```ts
export async function POST(req: NextRequest) {
  const parsed = parseBirthInput(await req.json());
  if (!parsed.ok) return badRequest(parsed.error);
  const { local, latitude, longitude, firstName } = parsed.value;

  const { chart } = chartFromBirthData(local, latitude, longitude);
```

and add `parseBirthInput` to the import from `@/lib/astro`. Delete the now-unused `Body` interface.

- [ ] **Step 6: Verify nothing changed**

Run: `npm test && cd web && npx tsc --noEmit && cd ..`
Expected: PASS — **239 tests** (215 baseline + 11 from Task 1 + 3 from Task 2 + 9 here + 1 extra from the calendar case counting). Trust the runner over this number.

The free reading is a live endpoint; confirm by hand that it still works before committing:

```bash
cd web && npm run dev
# then, in another shell:
curl -s localhost:3000/api/free -X POST -H 'content-type: application/json' \
  -d '{"date":"1992-04-15","time":"10:30","latitude":40.4168,"longitude":-3.7038}' | head -c 300
```

Expected: a JSON body with `apertura` and `amor`, not an error.

- [ ] **Step 7: Commit**

```bash
git add src/birthinput.ts tests/birthinput.test.ts web/src/lib/astro.ts web/src/app/api/free/route.ts
git commit -m "refactor: share birth-input validation between free and checkout"
```

---

### Task 4: Supabase schema and Row Level Security

**Vendor setup.** Needs your Supabase credentials — this task cannot run unattended.

**Files:**
- Create: `supabase/migrations/0001_orders.sql`
- Create: `supabase/migrations/0002_report_sections.sql`
- Create: `supabase/migrations/0003_entitlements.sql`
- Create: `supabase/migrations/0004_rls.sql`
- Modify: `.gitignore`, `web/.env.local.example`

**Interfaces:**
- Consumes: nothing
- Produces: three tables reached only via the service role

- [ ] **Step 1: Initialise Supabase and link the project**

```bash
npm i -g supabase
supabase init
supabase login
supabase link --project-ref <your-project-ref>
```

- [ ] **Step 2: Write the `orders` migration**

Create `supabase/migrations/0001_orders.sql`:

```sql
create type order_status as enum (
  'pending_payment', 'paid', 'generating', 'ready', 'failed', 'expired'
);

create table orders (
  id            uuid primary key default gen_random_uuid(),
  -- The report's only credential. 32 bytes base64url = 43 chars.
  token         text not null unique,
  product_code  text not null default 'report_v1',
  status        order_status not null default 'pending_payment',

  -- Birth data. Written at checkout intent, deleted by the 24h sweep for
  -- anyone who never pays (spec decision 2). Nullable so the sweep can null
  -- them out while keeping the row for accounting.
  birth_date    date,
  birth_time    time,
  latitude      double precision,
  longitude     double precision,
  first_name    text,
  focus         text not null default 'general',

  email             text,
  stripe_session_id text unique,
  paid_at           timestamptz,

  -- Snapshot of the computed chart, written when generation starts. NOT
  -- recomputed on read: if the engine ever changes, a delivered report must
  -- stay auditable against the exact chart it was grounded in. That claim is
  -- the whole product.
  chart         jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index orders_status_created_at_idx on orders (status, created_at);

create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();
```

- [ ] **Step 3: Write the `report_sections` migration**

Create `supabase/migrations/0002_report_sections.sql`:

```sql
create table report_sections (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  index         smallint not null check (index between 0 and 7),
  title         text not null,
  body          text not null,

  -- Which model wrote it: this is how the Addendum 10 escalation rate gets
  -- monitored in production rather than only in the battery.
  model         text not null,
  attempts      smallint not null,
  cost          numeric(10, 6) not null default 0,
  -- Logged, never a rejection reason on the paid tier (spec decision 6).
  gender_marks  text[] not null default '{}',
  -- Advisory problems, chiefly length. Kept because HANDOVER Addendum 12
  -- measured 12 of 24 sections exceeding their brief, and that trend is only
  -- visible if it is stored.
  notes         text[] not null default '{}',
  word_count    integer not null,

  created_at    timestamptz not null default now(),

  -- This is what makes a retry idempotent instead of duplicating rows.
  unique (order_id, index)
);
```

- [ ] **Step 4: Write the `entitlements` migration**

Create `supabase/migrations/0003_entitlements.sql`:

```sql
-- Addendum 3 point 3: access is modelled as entitlements so a new SKU is a row
-- plus a prompt file, never a migration. The Oracle quota will hang off the
-- order here, not off a person — there are no user accounts.
create table entitlements (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  kind        text not null,
  value       jsonb not null default '{}'::jsonb,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (order_id, kind)
);
```

- [ ] **Step 5: Write the RLS migration**

Create `supabase/migrations/0004_rls.sql`:

```sql
-- The token is the only credential, and it is checked in our server code, not
-- in Postgres. So the anon and authenticated roles must reach NOTHING: enabling
-- RLS with no permissive policy denies everyone. The service role bypasses RLS
-- by design and is the only way in.
alter table orders            enable row level security;
alter table report_sections   enable row level security;
alter table entitlements      enable row level security;

alter table orders            force row level security;
alter table report_sections   force row level security;
alter table entitlements      force row level security;

revoke all on orders          from anon, authenticated;
revoke all on report_sections from anon, authenticated;
revoke all on entitlements    from anon, authenticated;
```

- [ ] **Step 6: Push the migrations and verify the lockout**

```bash
supabase db push
```

Then confirm the anon key really cannot read orders. With your project URL and **anon** key:

```bash
curl -s "https://<project-ref>.supabase.co/rest/v1/orders?select=id" \
  -H "apikey: <anon-key>" -H "Authorization: Bearer <anon-key>"
```

Expected: an empty array `[]` or a permission error — **never** a row. If this returns data, stop and fix the RLS before continuing; every later task assumes the database is closed.

- [ ] **Step 7: Record the environment variables**

Create `web/.env.local.example` (committed, no real values):

```bash
OPENROUTER_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
# Service role: bypasses RLS. Server-only, never expose to the browser.
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
# Absolute origin used to build success/cancel URLs, e.g. http://localhost:3000
NEXT_PUBLIC_SITE_URL=
# Shared secret for the expiry cron route.
CRON_SECRET=
```

Put the real values in `web/.env.local`. Confirm it is ignored:

```bash
git check-ignore -v web/.env.local
```

Expected: a line naming the ignore rule. If it prints nothing, add `.env.local` to `.gitignore` before going further.

- [ ] **Step 8: Commit**

```bash
git add supabase web/.env.local.example .gitignore
git commit -m "feat: orders, report_sections and entitlements schema behind RLS"
```

---

### Task 5: Order store interface, fake, and web test infrastructure

The routes must be testable without a database. A narrow interface with an in-memory fake gives that; the Supabase implementation stays thin enough to verify by running it once.

**Files:**
- Create: `vitest.config.ts` (repo root)
- Create: `web/src/lib/orders-store.ts`
- Create: `web/src/lib/orders-store.supabase.ts`
- Test: `web/tests/orders-store.test.ts`
- Modify: root `package.json` (add `@supabase/supabase-js` to `web`)

**Interfaces:**
- Consumes: `OrderStatus`, `canTransition` (Task 1), `BirthInput` (Task 3)
- Produces: `OrderRecord`, `OrderStore`, `InMemoryOrderStore`, `supabaseOrderStore()`

- [ ] **Step 1: Install the client and add the vitest config**

```bash
cd web && npm i @supabase/supabase-js && cd ..
```

Create `vitest.config.ts` at the repo root:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * One suite for the whole repo: CLAUDE.md treats a single `npm test` as the
 * source of truth, so web tests join the astro-core ones rather than living in
 * a second runner nobody remembers to run.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "web/tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Mirrors web/tsconfig.json's paths, which vitest does not read.
      "@core": r("./src"),
      "@/": `${r("./web/src")}/`,
      // `server-only` throws by design when resolved outside a React Server
      // Component. Its own empty.js is what the react-server condition would
      // pick, so point at that rather than stubbing it ourselves.
      "server-only": r("./web/node_modules/server-only/empty.js"),
    },
  },
});
```

- [ ] **Step 2: Write the failing test**

Create `web/tests/orders-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryOrderStore } from "@/lib/orders-store";
import { newOrderToken } from "@core/orders";

const birth = {
  local: { year: 1992, month: 4, day: 15, hour: 10, minute: 30 },
  latitude: 40.4168, longitude: -3.7038, focus: "general" as const,
};

describe("InMemoryOrderStore", () => {
  let store: InMemoryOrderStore;
  beforeEach(() => { store = new InMemoryOrderStore(); });

  it("creates a pending order and finds it by token", async () => {
    const token = newOrderToken();
    const created = await store.create({ token, birth });
    expect(created.status).toBe("pending_payment");
    const found = await store.findByToken(token);
    expect(found?.id).toBe(created.id);
  });

  it("returns null for an unknown token rather than throwing", async () => {
    expect(await store.findByToken("no-existe")).toBeNull();
  });

  it("attaches the Stripe session id", async () => {
    const o = await store.create({ token: newOrderToken(), birth });
    await store.attachSession(o.id, "cs_test_123");
    expect((await store.findBySessionId("cs_test_123"))?.id).toBe(o.id);
  });

  it("marks an order paid and records the email", async () => {
    const o = await store.create({ token: newOrderToken(), birth });
    await store.attachSession(o.id, "cs_test_1");
    const ok = await store.markPaid(o.id, "quien@ejemplo.es");
    expect(ok).toBe(true);
    const after = await store.findByToken(o.token);
    expect(after?.status).toBe("paid");
    expect(after?.email).toBe("quien@ejemplo.es");
    expect(after?.paidAt).toBeInstanceOf(Date);
  });

  // The conditional update is the whole defence against at-least-once
  // delivery. Second call must report that it changed nothing.
  it("refuses to mark an already-paid order paid again", async () => {
    const o = await store.create({ token: newOrderToken(), birth });
    expect(await store.markPaid(o.id, "a@b.es")).toBe(true);
    expect(await store.markPaid(o.id, "a@b.es")).toBe(false);
  });

  it("grants an entitlement, idempotently", async () => {
    const o = await store.create({ token: newOrderToken(), birth });
    await store.grantEntitlement(o.id, "report_access");
    await store.grantEntitlement(o.id, "report_access");
    expect(await store.entitlementsFor(o.id)).toEqual(["report_access"]);
  });

  it("expires stale pending orders and wipes their birth data", async () => {
    const old = await store.create({ token: newOrderToken(), birth });
    const fresh = await store.create({ token: newOrderToken(), birth });
    store.setCreatedAt(old.id, new Date(Date.now() - 25 * 3600 * 1000));

    const n = await store.expirePendingOlderThan(new Date(Date.now() - 24 * 3600 * 1000));
    expect(n).toBe(1);

    const after = await store.findByToken(old.token);
    expect(after?.status).toBe("expired");
    expect(after?.birth).toBeNull();       // the point of the sweep
    expect((await store.findByToken(fresh.token))?.status).toBe("pending_payment");
  });

  it("never expires an order that was paid", async () => {
    const o = await store.create({ token: newOrderToken(), birth });
    store.setCreatedAt(o.id, new Date(Date.now() - 99 * 3600 * 1000));
    await store.markPaid(o.id, "a@b.es");
    expect(await store.expirePendingOlderThan(new Date())).toBe(0);
    expect((await store.findByToken(o.token))?.birth).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run web/tests/orders-store.test.ts`
Expected: FAIL — `Cannot find module '@/lib/orders-store'`

- [ ] **Step 4: Write the interface and the fake**

Create `web/src/lib/orders-store.ts`:

```ts
import type { OrderStatus } from "@core/orders";
import type { BirthInput } from "@core/birthinput";

export interface OrderRecord {
  id: string;
  token: string;
  status: OrderStatus;
  /** Null once the sweep has wiped it, or after expiry. */
  birth: BirthInput | null;
  email: string | null;
  stripeSessionId: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

/**
 * Everything plan 2 needs from the database, and nothing more. Narrow on
 * purpose: the routes are tested against InMemoryOrderStore, so anything that
 * leaks Supabase's query builder into this interface makes them untestable.
 */
export interface OrderStore {
  create(input: { token: string; birth: BirthInput }): Promise<OrderRecord>;
  findByToken(token: string): Promise<OrderRecord | null>;
  findBySessionId(sessionId: string): Promise<OrderRecord | null>;
  attachSession(id: string, sessionId: string): Promise<void>;
  /** Conditional: true only if THIS call moved pending_payment → paid. */
  markPaid(id: string, email: string | null): Promise<boolean>;
  grantEntitlement(id: string, kind: string): Promise<void>;
  entitlementsFor(id: string): Promise<string[]>;
  /** Returns how many orders it expired. Wipes their birth data. */
  expirePendingOlderThan(cutoff: Date): Promise<number>;
}

export class InMemoryOrderStore implements OrderStore {
  private rows = new Map<string, OrderRecord>();
  private grants = new Map<string, Set<string>>();
  private nextId = 1;

  async create({ token, birth }: { token: string; birth: BirthInput }) {
    const row: OrderRecord = {
      id: `order_${this.nextId++}`,
      token,
      status: "pending_payment",
      birth,
      email: null,
      stripeSessionId: null,
      paidAt: null,
      createdAt: new Date(),
    };
    this.rows.set(row.id, row);
    return { ...row };
  }

  async findByToken(token: string) {
    for (const row of this.rows.values()) if (row.token === token) return { ...row };
    return null;
  }

  async findBySessionId(sessionId: string) {
    for (const row of this.rows.values()) {
      if (row.stripeSessionId === sessionId) return { ...row };
    }
    return null;
  }

  async attachSession(id: string, sessionId: string) {
    const row = this.rows.get(id);
    if (row) row.stripeSessionId = sessionId;
  }

  async markPaid(id: string, email: string | null) {
    const row = this.rows.get(id);
    // Mirrors the SQL `where status = 'pending_payment'`: a duplicate webhook
    // delivery must find nothing to update and report false.
    if (!row || row.status !== "pending_payment") return false;
    row.status = "paid";
    row.email = email;
    row.paidAt = new Date();
    return true;
  }

  async grantEntitlement(id: string, kind: string) {
    const set = this.grants.get(id) ?? new Set<string>();
    set.add(kind);
    this.grants.set(id, set);
  }

  async entitlementsFor(id: string) {
    return [...(this.grants.get(id) ?? [])];
  }

  async expirePendingOlderThan(cutoff: Date) {
    let n = 0;
    for (const row of this.rows.values()) {
      if (row.status !== "pending_payment" || row.createdAt > cutoff) continue;
      row.status = "expired";
      row.birth = null; // someone who never paid leaves no birth data behind
      n++;
    }
    return n;
  }

  /** Test-only: back-date a row so the sweep can be exercised. */
  setCreatedAt(id: string, when: Date) {
    const row = this.rows.get(id);
    if (row) row.createdAt = when;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run web/tests/orders-store.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 6: Write the Supabase implementation**

Create `web/src/lib/orders-store.supabase.ts`:

```ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { OrderRecord, OrderStore } from "./orders-store";
import type { BirthInput } from "@core/birthinput";

function client(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  // Service role bypasses RLS — this module is server-only for that reason.
  return createClient(url, key, { auth: { persistSession: false } });
}

interface Row {
  id: string; token: string; status: OrderRecord["status"];
  birth_date: string | null; birth_time: string | null;
  latitude: number | null; longitude: number | null;
  first_name: string | null; focus: string;
  email: string | null; stripe_session_id: string | null;
  paid_at: string | null; created_at: string;
}

function toRecord(row: Row): OrderRecord {
  const birth: BirthInput | null = row.birth_date && row.birth_time
    && row.latitude !== null && row.longitude !== null
    ? {
        local: {
          year: Number(row.birth_date.slice(0, 4)),
          month: Number(row.birth_date.slice(5, 7)),
          day: Number(row.birth_date.slice(8, 10)),
          hour: Number(row.birth_time.slice(0, 2)),
          minute: Number(row.birth_time.slice(3, 5)),
        },
        latitude: row.latitude,
        longitude: row.longitude,
        firstName: row.first_name ?? undefined,
        focus: row.focus as BirthInput["focus"],
      }
    : null;

  return {
    id: row.id, token: row.token, status: row.status, birth,
    email: row.email, stripeSessionId: row.stripe_session_id,
    paidAt: row.paid_at ? new Date(row.paid_at) : null,
    createdAt: new Date(row.created_at),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function supabaseOrderStore(): OrderStore {
  const db = client();

  return {
    async create({ token, birth }) {
      const { local } = birth;
      const { data, error } = await db.from("orders").insert({
        token,
        birth_date: `${local.year}-${pad(local.month)}-${pad(local.day)}`,
        birth_time: `${pad(local.hour)}:${pad(local.minute)}:00`,
        latitude: birth.latitude,
        longitude: birth.longitude,
        first_name: birth.firstName ?? null,
        focus: birth.focus,
      }).select().single();
      if (error) throw new Error(`No se pudo crear el pedido: ${error.message}`);
      return toRecord(data as Row);
    },

    async findByToken(token) {
      const { data } = await db.from("orders").select().eq("token", token).maybeSingle();
      return data ? toRecord(data as Row) : null;
    },

    async findBySessionId(sessionId) {
      const { data } = await db.from("orders").select()
        .eq("stripe_session_id", sessionId).maybeSingle();
      return data ? toRecord(data as Row) : null;
    },

    async attachSession(id, sessionId) {
      const { error } = await db.from("orders")
        .update({ stripe_session_id: sessionId }).eq("id", id);
      if (error) throw new Error(`No se pudo guardar la sesión: ${error.message}`);
    },

    async markPaid(id, email) {
      // The `.eq("status", "pending_payment")` IS the idempotency guard: a
      // duplicate delivery matches no row and returns an empty array.
      const { data, error } = await db.from("orders")
        .update({ status: "paid", email, paid_at: new Date().toISOString() })
        .eq("id", id).eq("status", "pending_payment")
        .select("id");
      if (error) throw new Error(`No se pudo marcar pagado: ${error.message}`);
      return (data?.length ?? 0) > 0;
    },

    async grantEntitlement(id, kind) {
      const { error } = await db.from("entitlements")
        .upsert({ order_id: id, kind }, { onConflict: "order_id,kind" });
      if (error) throw new Error(`No se pudo conceder el acceso: ${error.message}`);
    },

    async entitlementsFor(id) {
      const { data } = await db.from("entitlements").select("kind").eq("order_id", id);
      return (data ?? []).map((r) => (r as { kind: string }).kind);
    },

    async expirePendingOlderThan(cutoff) {
      const { data, error } = await db.from("orders")
        .update({
          status: "expired",
          birth_date: null, birth_time: null,
          latitude: null, longitude: null, first_name: null,
        })
        .eq("status", "pending_payment")
        .lt("created_at", cutoff.toISOString())
        .select("id");
      if (error) throw new Error(`Barrido fallido: ${error.message}`);
      return data?.length ?? 0;
    },
  };
}
```

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS — 8 more than after Task 3. `web/tests` must now appear in the run; if it does not, the `include` glob in `vitest.config.ts` is wrong.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts web/src/lib/orders-store.ts web/src/lib/orders-store.supabase.ts \
        web/tests/orders-store.test.ts web/package.json web/package-lock.json
git commit -m "feat: order store interface, in-memory fake, and one test suite for the repo"
```

---

### Task 6: `POST /api/checkout`

**Files:**
- Create: `web/src/lib/stripe.ts`
- Create: `web/src/app/api/checkout/route.ts`
- Test: `web/tests/checkout.test.ts`

**Interfaces:**
- Consumes: `parseBirthInput` (Task 3), `newOrderToken` (Task 2), `OrderStore` (Task 5)
- Produces: `createCheckout(deps): (req) => Promise<Response>` — a factory so tests inject a fake store and a fake Stripe; the route module calls it with the real ones.

- [ ] **Step 1: Enable Bizum, and read this before assuming it works**

Enable Bizum at https://dashboard.stripe.com/settings/payment_methods.

**Two things from Stripe's current docs that change the plan if ignored:**

1. **Bizum is behind an early-access request.** Stripe's Bizum page currently offers a "request early access" form rather than general availability. If Bizum is not available on the account, **do not block this plan** — the checkout works with cards, and Bizum appears automatically once Stripe enables it, because of point 2. Record the request date in HANDOVER.
2. **Do not pass `payment_method_types`.** Stripe now recommends dynamic payment methods: enable Bizum in the Dashboard and Stripe decides what to show based on currency, amount and customer location. Hard-coding the list is what would *prevent* Bizum appearing later.

Constraints that apply to us: `mode: 'payment'`, every line item in **EUR**, total between **0.50 and 5,000.00 EUR**. Our €9.90 is inside that.

- [ ] **Step 2: Write the failing test**

Create `web/tests/checkout.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryOrderStore } from "@/lib/orders-store";
import { createCheckout } from "@/app/api/checkout/route";

interface CreatedSession { url: string; id: string; args: Record<string, unknown> }

function fakeStripe() {
  const calls: CreatedSession[] = [];
  return {
    calls,
    sessions: {
      create: async (args: Record<string, unknown>) => {
        const session = { id: `cs_test_${calls.length + 1}`, url: "https://checkout.stripe.com/x" };
        calls.push({ ...session, args });
        return session;
      },
    },
  };
}

const body = {
  date: "1992-04-15", time: "10:30", latitude: 40.4168, longitude: -3.7038,
  firstName: "Lucía", focus: "amor",
};

const post = (handler: (r: Request) => Promise<Response>, payload: unknown) =>
  handler(new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }));

describe("POST /api/checkout", () => {
  let store: InMemoryOrderStore;
  let stripe: ReturnType<typeof fakeStripe>;
  let handler: (r: Request) => Promise<Response>;

  beforeEach(() => {
    store = new InMemoryOrderStore();
    stripe = fakeStripe();
    handler = createCheckout({
      store,
      stripe: stripe as never,
      siteUrl: "http://localhost:3000",
    });
  });

  it("creates a pending order and returns the Stripe URL", async () => {
    const res = await post(handler, body);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/x");

    const order = await store.findBySessionId("cs_test_1");
    expect(order?.status).toBe("pending_payment");
    expect(order?.birth?.focus).toBe("amor");
  });

  it("rejects invalid birth data with the shared Spanish message", async () => {
    const res = await post(handler, { ...body, date: "15/04/1992" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/fecha/i);
  });

  // Spec decision 2: Stripe must never see when or where someone was born.
  it("sends Stripe only the opaque order id", async () => {
    await post(handler, body);
    const sent = JSON.stringify(stripe.calls[0].args);
    expect(sent).not.toContain("1992");
    expect(sent).not.toContain("40.41");
    expect(sent).not.toContain("Lucía");
    expect(stripe.calls[0].args.metadata).toHaveProperty("order_id");
  });

  it("points success_url at the buyer's own report page", async () => {
    await post(handler, body);
    const order = await store.findBySessionId("cs_test_1");
    expect(stripe.calls[0].args.success_url).toBe(
      `http://localhost:3000/informe/${order!.token}`,
    );
  });

  // Hard-coding payment_method_types is what stops Bizum appearing once
  // Stripe enables it on the account.
  it("does not pin payment_method_types, so dynamic methods can apply", () => {
    return post(handler, body).then(() => {
      expect(stripe.calls[0].args).not.toHaveProperty("payment_method_types");
    });
  });

  it("prices in EUR, one-time, inside Bizum's 0.50-5000 range", async () => {
    await post(handler, body);
    const args = stripe.calls[0].args as {
      mode: string;
      line_items: Array<{ price_data: { currency: string; unit_amount: number } }>;
    };
    expect(args.mode).toBe("payment");
    expect(args.line_items[0].price_data.currency).toBe("eur");
    expect(args.line_items[0].price_data.unit_amount).toBe(990);
  });

  it("gives every order a distinct token", async () => {
    await post(handler, body);
    await post(handler, body);
    const a = await store.findBySessionId("cs_test_1");
    const b = await store.findBySessionId("cs_test_2");
    expect(a!.token).not.toBe(b!.token);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run web/tests/checkout.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/checkout/route'`

- [ ] **Step 4: Write the Stripe client**

```bash
cd web && npm i stripe && cd ..
```

Create `web/src/lib/stripe.ts`:

```ts
import "server-only";
import Stripe from "stripe";

let cached: Stripe | null = null;

export function stripeClient(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Falta STRIPE_SECRET_KEY");
  // No apiVersion pin: the SDK's default matches the version it was built
  // against, and pinning a version the SDK's types do not know about is a
  // compile error waiting to happen on the next upgrade.
  cached = new Stripe(key);
  return cached;
}
```

- [ ] **Step 5: Write the route**

Create `web/src/app/api/checkout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { parseBirthInput } from "@/lib/astro";
import { newOrderToken } from "@core/orders";
import type { OrderStore } from "@/lib/orders-store";
import { supabaseOrderStore } from "@/lib/orders-store.supabase";
import { stripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

const PRICE_CENTS = 990;
const PRODUCT_NAME = "Tu informe astral completo";

interface Deps {
  store: OrderStore;
  /** Structurally the slice of Stripe we use, so tests can pass a fake. */
  stripe: { sessions: { create: (args: Record<string, unknown>) => Promise<{ id: string; url: string | null }> } };
  siteUrl: string;
}

/**
 * Factory so the route is testable without Stripe or a database. The exported
 * POST binds it to the real ones.
 */
export function createCheckout(deps: Deps) {
  return async function handle(req: Request): Promise<Response> {
    const parsed = parseBirthInput(await req.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const token = newOrderToken();
    const order = await deps.store.create({ token, birth: parsed.value });

    // Stripe receives the opaque id and nothing else. Birth date, time and
    // place stay in our database (spec decision 2) — same posture as the
    // bundled GeoNames index: no third party sees where someone was born.
    const session = await deps.stripe.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: PRICE_CENTS,
          product_data: { name: PRODUCT_NAME },
        },
      }],
      metadata: { order_id: order.id },
      success_url: `${deps.siteUrl}/informe/${token}`,
      cancel_url: `${deps.siteUrl}/?pago=cancelado`,
    });

    await deps.store.attachSession(order.id, session.id);
    return NextResponse.json({ url: session.url });
  };
}

export async function POST(req: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json({ error: "Falta NEXT_PUBLIC_SITE_URL." }, { status: 500 });
  }
  const stripe = stripeClient();
  return createCheckout({
    store: supabaseOrderStore(),
    stripe: { sessions: { create: (args) => stripe.checkout.sessions.create(args as never) } },
    siteUrl,
  })(req);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run web/tests/checkout.test.ts && npm test`
Expected: PASS (7 more tests)

- [ ] **Step 7: Verify against real Stripe in test mode**

```bash
cd web && npm run dev
```

```bash
curl -s localhost:3000/api/checkout -X POST -H 'content-type: application/json' \
  -d '{"date":"1992-04-15","time":"10:30","latitude":40.4168,"longitude":-3.7038}'
```

Expected: `{"url":"https://checkout.stripe.com/c/pay/cs_test_..."}`. Open it and confirm the price reads 9,90 € and, if Bizum is enabled on the account, that Bizum appears as a method. Confirm a row exists in Supabase with `status = 'pending_payment'`.

- [ ] **Step 8: Commit**

```bash
git add web/src/lib/stripe.ts web/src/app/api/checkout/route.ts web/tests/checkout.test.ts \
        web/package.json web/package-lock.json
git commit -m "feat: checkout route creating the order and a Stripe session"
```

---

### Task 7: `POST /api/webhooks/stripe`

**Files:**
- Create: `web/src/app/api/webhooks/stripe/route.ts`
- Test: `web/tests/webhook.test.ts`

**Interfaces:**
- Consumes: `webhookDecision` (Task 1), `OrderStore` (Task 5)
- Produces: `createWebhook(deps): (req) => Promise<Response>`

Two Next.js 16 facts that matter here, both from `web/node_modules/next/dist/docs/`: App Router route handlers take a Web `Request`, so **`await req.text()` gives the untouched raw body** — there is no body parser to disable, unlike the Pages Router. And CSRF middleware does not apply to route handlers, so no exemption is needed.

- [ ] **Step 1: Write the failing test**

Create `web/tests/webhook.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryOrderStore } from "@/lib/orders-store";
import { createWebhook } from "@/app/api/webhooks/stripe/route";

const birth = {
  local: { year: 1992, month: 4, day: 15, hour: 10, minute: 30 },
  latitude: 40.4168, longitude: -3.7038, focus: "general" as const,
};

/** Stands in for stripe.webhooks.constructEvent: trusts a magic header. */
function fakeVerifier() {
  return (raw: string, signature: string) => {
    if (signature !== "buena") throw new Error("firma inválida");
    return JSON.parse(raw);
  };
}

const event = (sessionId: string, email: string | null = "quien@ejemplo.es") => ({
  id: "evt_1",
  type: "checkout.session.completed",
  data: { object: { id: sessionId, customer_details: email ? { email } : null } },
});

const post = (
  handler: (r: Request) => Promise<Response>,
  payload: unknown,
  signature = "buena",
) =>
  handler(new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: JSON.stringify(payload),
  }));

describe("POST /api/webhooks/stripe", () => {
  let store: InMemoryOrderStore;
  let handler: (r: Request) => Promise<Response>;
  let alerts: string[];

  beforeEach(async () => {
    store = new InMemoryOrderStore();
    alerts = [];
    handler = createWebhook({
      store,
      verify: fakeVerifier(),
      alert: (m: string) => { alerts.push(m); },
    });
  });

  async function pendingOrder(sessionId: string) {
    const o = await store.create({ token: "tok", birth });
    await store.attachSession(o.id, sessionId);
    return o;
  }

  it("marks the order paid and grants the entitlement", async () => {
    const o = await pendingOrder("cs_1");
    const res = await post(handler, event("cs_1"));
    expect(res.status).toBe(200);

    const after = await store.findByToken(o.token);
    expect(after?.status).toBe("paid");
    expect(after?.email).toBe("quien@ejemplo.es");
    expect(await store.entitlementsFor(o.id)).toEqual(["report_access"]);
  });

  it("rejects a tampered signature with 400 and changes nothing", async () => {
    const o = await pendingOrder("cs_1");
    const res = await post(handler, event("cs_1"), "falsificada");
    expect(res.status).toBe(400);
    expect((await store.findByToken(o.token))?.status).toBe("pending_payment");
  });

  // Stripe delivers at-least-once. The second delivery must be a no-op that
  // still answers 200, or Stripe keeps retrying it.
  it("is idempotent across duplicate delivery", async () => {
    const o = await pendingOrder("cs_1");
    expect((await post(handler, event("cs_1"))).status).toBe(200);
    const paidAt = (await store.findByToken(o.token))!.paidAt;

    expect((await post(handler, event("cs_1"))).status).toBe(200);
    const after = await store.findByToken(o.token);
    expect(after?.status).toBe("paid");
    expect(after?.paidAt).toEqual(paidAt);            // not re-stamped
    expect(await store.entitlementsFor(o.id)).toEqual(["report_access"]);
  });

  it("answers 200 for an unknown order so Stripe stops retrying", async () => {
    const res = await post(handler, event("cs_desconocida"));
    expect(res.status).toBe(200);
  });

  it("ignores event types it does not handle", async () => {
    const o = await pendingOrder("cs_1");
    const other = { ...event("cs_1"), type: "payment_intent.created" };
    expect((await post(handler, other)).status).toBe(200);
    expect((await store.findByToken(o.token))?.status).toBe("pending_payment");
  });

  it("alerts when payment lands after the order expired", async () => {
    const o = await pendingOrder("cs_1");
    await store.expirePendingOlderThan(new Date(Date.now() + 1000));
    expect((await post(handler, event("cs_1"))).status).toBe(200);
    expect(alerts.join(" ")).toMatch(/caducad/i);
    expect((await store.findByToken(o.token))?.status).toBe("expired");
  });

  it("stores a null email when Stripe collected none", async () => {
    const o = await pendingOrder("cs_1");
    await post(handler, event("cs_1", null));
    expect((await store.findByToken(o.token))?.email).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run web/tests/webhook.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/webhooks/stripe/route'`

- [ ] **Step 3: Write the route**

Create `web/src/app/api/webhooks/stripe/route.ts`:

```ts
import { NextResponse } from "next/server";
import { webhookDecision } from "@core/orders";
import type { OrderStore } from "@/lib/orders-store";
import { supabaseOrderStore } from "@/lib/orders-store.supabase";
import { stripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

interface StripeEventish {
  type: string;
  data: { object: { id: string; customer_details?: { email?: string | null } | null } };
}

interface Deps {
  store: OrderStore;
  /** Throws when the signature does not verify. */
  verify: (rawBody: string, signature: string) => StripeEventish;
  alert: (message: string) => void;
}

export function createWebhook(deps: Deps) {
  return async function handle(req: Request): Promise<Response> {
    // Web Request, so this is the untouched raw body — Stripe's signature is
    // over the exact bytes and any reserialisation breaks it. Never call
    // req.json() before verifying.
    const raw = await req.text();
    const signature = req.headers.get("stripe-signature") ?? "";

    let event: StripeEventish;
    try {
      event = deps.verify(raw, signature);
    } catch (err) {
      // 400 so Stripe records the failure. Nothing is trusted from an
      // unverified body, including the order id.
      console.warn("webhook rechazado:", (err as Error).message);
      return NextResponse.json({ error: "firma no válida" }, { status: 400 });
    }

    const sessionId = event.data?.object?.id ?? "";
    const order = sessionId ? await deps.store.findBySessionId(sessionId) : null;
    const decision = webhookDecision(order?.status ?? null, event.type);

    if (decision.alert) deps.alert(`pedido ${order?.id ?? "?"}: ${decision.reason}`);

    if (decision.action === "ignore") {
      // Always 200: a non-2xx makes Stripe retry something we have decided not
      // to do, for three days.
      return NextResponse.json({ received: true, ignored: decision.reason });
    }

    const email = event.data.object.customer_details?.email ?? null;
    const claimed = await deps.store.markPaid(order!.id, email);
    // Lost the race to a concurrent duplicate: it did the work, we do nothing.
    if (!claimed) return NextResponse.json({ received: true, ignored: "carrera perdida" });

    await deps.store.grantEntitlement(order!.id, "report_access");

    // Plan 3 enqueues generation HERE, and nowhere else. The webhook must keep
    // returning in seconds, so it may never generate inline.
    return NextResponse.json({ received: true });
  };
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Falta STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  const stripe = stripeClient();

  return createWebhook({
    store: supabaseOrderStore(),
    verify: (raw, signature) =>
      stripe.webhooks.constructEvent(raw, signature, secret) as unknown as StripeEventish,
    alert: (message) => console.error("[ALERTA]", message),
  })(req);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run web/tests/webhook.test.ts && npm test`
Expected: PASS (7 more tests)

- [ ] **Step 5: Verify against the real Stripe CLI**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed `whsec_...` into `web/.env.local` as `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`. Then complete a real test-mode checkout using the URL from Task 6 Step 7 and card `4242 4242 4242 4242`.

Expected: the row moves to `paid` with an email and `paid_at`, and a `report_access` row exists in `entitlements`.

Now prove idempotency against real Stripe, which is the whole point of this task:

```bash
stripe events resend <event_id> --webhook-endpoint=<endpoint_id>
```

Expected: 200, and **`paid_at` unchanged**. If `paid_at` moves, the conditional update is not conditional.

- [ ] **Step 6: Commit**

```bash
git add web/src/app/api/webhooks/stripe/route.ts web/tests/webhook.test.ts
git commit -m "feat: stripe webhook with signature verification and idempotent paid transition"
```

---

### Task 8: The 24h expiry sweep

Someone who abandons checkout leaves their birth date, time and place in our database. Spec decision 2 says that must not persist.

**Files:**
- Create: `web/src/app/api/cron/expire/route.ts`
- Test: `web/tests/expire.test.ts`
- Create: `web/vercel.json`

**Interfaces:**
- Consumes: `OrderStore.expirePendingOlderThan` (Task 5)
- Produces: `createExpire(deps): (req) => Promise<Response>`

- [ ] **Step 1: Write the failing test**

Create `web/tests/expire.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryOrderStore } from "@/lib/orders-store";
import { createExpire } from "@/app/api/cron/expire/route";

const birth = {
  local: { year: 1992, month: 4, day: 15, hour: 10, minute: 30 },
  latitude: 40.4168, longitude: -3.7038, focus: "general" as const,
};

const get = (handler: (r: Request) => Promise<Response>, secret?: string) =>
  handler(new Request("http://localhost/api/cron/expire", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  }));

describe("GET /api/cron/expire", () => {
  let store: InMemoryOrderStore;
  let handler: (r: Request) => Promise<Response>;

  beforeEach(() => {
    store = new InMemoryOrderStore();
    handler = createExpire({ store, secret: "s3cr3t" });
  });

  it("refuses without the shared secret", async () => {
    expect((await get(handler)).status).toBe(401);
    expect((await get(handler, "incorrecto")).status).toBe(401);
  });

  it("expires pending orders older than 24h and wipes their birth data", async () => {
    const old = await store.create({ token: "viejo", birth });
    const fresh = await store.create({ token: "nuevo", birth });
    store.setCreatedAt(old.id, new Date(Date.now() - 25 * 3600 * 1000));

    const res = await get(handler, "s3cr3t");
    expect(res.status).toBe(200);
    expect((await res.json()).expired).toBe(1);

    expect((await store.findByToken("viejo"))?.birth).toBeNull();
    expect((await store.findByToken("nuevo"))?.birth).not.toBeNull();
  });

  it("leaves a 23-hour-old order alone", async () => {
    const o = await store.create({ token: "casi", birth });
    store.setCreatedAt(o.id, new Date(Date.now() - 23 * 3600 * 1000));
    await get(handler, "s3cr3t");
    expect((await store.findByToken("casi"))?.status).toBe("pending_payment");
  });

  it("is safe to run twice", async () => {
    const o = await store.create({ token: "viejo", birth });
    store.setCreatedAt(o.id, new Date(Date.now() - 25 * 3600 * 1000));
    expect((await (await get(handler, "s3cr3t")).json()).expired).toBe(1);
    expect((await (await get(handler, "s3cr3t")).json()).expired).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run web/tests/expire.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/cron/expire/route'`

- [ ] **Step 3: Write the route**

Create `web/src/app/api/cron/expire/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { OrderStore } from "@/lib/orders-store";
import { supabaseOrderStore } from "@/lib/orders-store.supabase";

export const runtime = "nodejs";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Deps { store: OrderStore; secret: string }

/**
 * Deletes the birth data of people who started a checkout and never paid
 * (spec decision 2). Note the sweep and a very late payment can race: if the
 * sweep wins, the webhook finds the order `expired` and alerts rather than
 * failing silently — see webhookDecision.
 */
export function createExpire(deps: Deps) {
  return async function handle(req: Request): Promise<Response> {
    if (req.headers.get("authorization") !== `Bearer ${deps.secret}`) {
      return NextResponse.json({ error: "no autorizado" }, { status: 401 });
    }
    const expired = await deps.store.expirePendingOlderThan(new Date(Date.now() - MAX_AGE_MS));
    return NextResponse.json({ expired });
  };
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Falta CRON_SECRET" }, { status: 500 });
  return createExpire({ store: supabaseOrderStore(), secret })(req);
}
```

- [ ] **Step 4: Schedule it**

Create `web/vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/expire", "schedule": "0 4 * * *" }
  ]
}
```

Vercel sends `Authorization: Bearer $CRON_SECRET` on cron invocations when `CRON_SECRET` is set as a project environment variable, which is what the route checks. Set it in the Vercel project settings as well as in `web/.env.local`.

- [ ] **Step 5: Run the whole suite**

Run: `npm test && cd web && npx tsc --noEmit && cd .. && npm run example`
Expected: PASS — 4 more tests, typecheck clean, and the tsx path still works.

- [ ] **Step 6: Verify by hand**

With `npm run dev` running:

```bash
curl -s localhost:3000/api/cron/expire            # expect 401
curl -s localhost:3000/api/cron/expire -H "authorization: Bearer $(grep CRON_SECRET web/.env.local | cut -d= -f2)"
```

Expected: `{"expired":0}` on a clean database. To prove the wipe, back-date a `pending_payment` row in the Supabase SQL editor (`update orders set created_at = now() - interval '25 hours' where status = 'pending_payment'`) and run it again: `expired` becomes 1 and that row's `birth_date` is null.

- [ ] **Step 7: Commit**

```bash
git add web/src/app/api/cron/expire/route.ts web/tests/expire.test.ts web/vercel.json
git commit -m "feat: 24h expiry sweep deleting unpaid birth data"
```

---

## Done when

`stripe trigger checkout.session.completed` (or a real test-mode checkout) moves a real Supabase row from `pending_payment` to `paid` with an email, `paid_at`, and a `report_access` entitlement — and a replayed webhook leaves `paid_at` untouched. Nothing generates: that is plan 3.

---

## Self-Review

**Spec coverage.** Decision 1 (no account; token + email) → Tasks 2, 6. Decision 2 (birth data at checkout intent only; Stripe gets an opaque id; 24h wipe) → Tasks 6 and 8, asserted by the "sends Stripe only the opaque order id" test. Decision 7 (scope) → this plan stops at `paid`. Decision 8 (vendors) → Stripe and Supabase here; Inngest and Resend are plan 3. The order-state table → Task 1. The `orders`/`report_sections`/`entitlements` schema → Task 4. "Why the webhook does not generate" → Task 7, with the enqueue point marked as a comment for plan 3. The `parseReport` pending fix was already delivered in plan 1.

Decisions 3, 4, 5 and 6 (two waves, deterministic allocation, model choice, no gender gate) belong to generation and were delivered by plan 1 or belong to plan 3. `report_sections` carries `model`, `attempts`, `cost` and `gender_marks` so plan 3 can record them, plus a `notes` column that plan 1's Addendum 12 justified after the spec was written.

**Deliberate deviations from the roadmap's task list, each with cause.**
- The roadmap says the webhook needs Next.js route config so the body is not pre-parsed. **In the App Router there is no body parser** — `req.text()` is raw. The instruction would have produced a config that does nothing.
- The roadmap says to set `payment_method_types` for Bizum. **Stripe's current guidance is the opposite**: don't set it, enable Bizum in the Dashboard, let dynamic payment methods apply. Hard-coding it would block Bizum from appearing later.
- Token generation and the state machine are separate tasks because a weak token is a security defect while a bad transition is a logic bug, and a reviewer could reasonably accept one and reject the other.

**Placeholder scan.** No TBDs. Every code step carries the code. Every verification step names the command and the expected output. The one genuinely unknown is Bizum's availability on the account, which is Stripe's gate, not ours — Task 6 Step 1 says explicitly not to block on it and why the integration works either way.

**Type consistency.** `OrderStore`'s eight methods are defined in Task 5 and used under those names in Tasks 6, 7 and 8. `OrderRecord.birth` is `BirthInput | null` throughout, null precisely when the sweep has wiped it. `webhookDecision(status, eventType)` has the same two-argument shape in Task 1 and Task 7. `parseBirthInput` returns the discriminated `ParsedBirth` in Task 3 and is consumed as `.ok` / `.value` / `.error` in Tasks 3 and 6. `createCheckout`, `createWebhook` and `createExpire` are all `(deps) => (req: Request) => Promise<Response>`, so all three route tests use the same shape.

**Test count arithmetic.** 215 baseline → +11 (T1) → +3 (T2) → +9 (T3) → +8 (T5) → +7 (T6) → +7 (T7) → +4 (T8) ≈ **264**. Tasks 4 has no unit tests (it is schema and vendor setup, verified by the curl lockout check). Trust `npm test` over this figure.
