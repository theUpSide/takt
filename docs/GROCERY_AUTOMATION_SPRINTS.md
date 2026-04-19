# Grocery Cart Automation — Sprint Plan

Sprint-by-sprint breakdown of the Grocery Cart Automation SDD. Each sprint
produces a testable, working increment. Sprints are ordered by dependency;
do not start a sprint until the prior sprint's Definition of Done is met.

**Cadence:** 1 week per sprint (6 weeks end-to-end for v1.0).
**Team size assumption:** 1 developer.
**Status legend:** `[ ]` Not started · `[~]` In progress · `[x]` Complete

---

## Sprint 0 — Pre-Flight (½ week)

**Goal:** Remove every external dependency that could block Sprint 1.

### Tickets
- [ ] **S0-1** Register Kroger developer account; create API application; capture `CLIENT_ID` / `CLIENT_SECRET`
- [ ] **S0-2** Confirm Kroger sandbox environment access and test credentials
- [ ] **S0-3** Provision Supabase project; enable Vault; create service role key
- [ ] **S0-4** Verify existing Twilio → Claude → task-manager pipeline still works end-to-end
- [ ] **S0-5** Identify user's preferred Kroger store; record `KROGER_STORE_ID`
- [ ] **S0-6** Photograph 2–3 weeks of receipts to seed mapping table (~25 products)

### Definition of Done
- All API credentials stored in a password manager (not committed)
- A `curl` against Kroger sandbox with a test token returns a 200
- Receipt photos archived for Sprint 1 data entry

### Risks
- Kroger API approval can take days — start immediately

---

## Sprint 1 — Database & Mapping Table (1 week)

**Goal:** Schema + CRUD for product mappings. No Kroger calls yet.

### Tickets
- [x] **S1-1** Migration: `product_mappings` table (§5.1 schema, unique index on alias+UPC)
- [x] **S1-2** Migration: `kroger_oauth_tokens` table with encrypted columns (§5.2)
- [x] **S1-3** Migration: `cart_history` table (§5.3) with `JSONB detail_json`
- [x] **S1-4** RLS policies scoped to `auth.uid() = user_id` per migration 0024 pattern
- [x] **S1-5** Edge Function `grocery-mappings` — `GET /grocery-mappings` list + filter
- [x] **S1-6** Edge Function `grocery-mappings` — `POST /grocery-mappings` create
- [x] **S1-7** Edge Function `grocery-mappings` — `PUT /grocery-mappings/:id` update
- [x] **S1-8** Edge Function `grocery-mappings` — `DELETE /grocery-mappings/:id` soft-delete
- [ ] **S1-9** Seed ~25 mappings from Sprint 0 receipt photos _(blocked on S0-6)_
- [x] **S1-10** Unit tests: alias normalization (lowercase, trim, collapse spaces)

### Definition of Done
- All four CRUD endpoints return correct data against local Supabase
- Seed data loaded and queryable; duplicate aliases rejected at DB level
- Migrations run cleanly on a fresh database

### Dependencies
- Sprint 0 complete (Supabase project exists)

---

## Sprint 2 — Kroger OAuth Integration (1 week)

**Goal:** Authenticated, self-refreshing Kroger API access.

### Tickets
- [ ] **S2-1** OAuth 2.0 authorization-code flow: browser login page at `/auth/kroger/login`
- [ ] **S2-2** Callback handler `/auth/kroger/callback` — exchange code for tokens
- [ ] **S2-3** AES-256 encryption helpers using Supabase Vault key
- [ ] **S2-4** Store access + refresh token in `oauth_tokens` (encrypted)
- [ ] **S2-5** `TokenManager` module — returns valid access token; auto-refreshes 5 min before expiry
- [ ] **S2-6** Concurrent-refresh guard (DB row lock or advisory lock)
- [ ] **S2-7** Health check endpoint `GET /auth/kroger/status` — returns expiry + store
- [ ] **S2-8** Failure path: expired refresh token → SMS re-auth link to user
- [ ] **S2-9** Unit tests: encryption roundtrip, refresh-before-expiry, concurrent refresh

### Definition of Done
- One-time browser login completes successfully against Kroger sandbox
- A scheduled call 31 minutes later succeeds (token auto-refreshed)
- No plaintext tokens appear in logs, DB, or error traces

### Dependencies
- Sprint 1 complete (`oauth_tokens` table exists)

### Risks
- Refresh token lifetime is undocumented (~6 months). Plan re-auth UX now.

---

## Sprint 3 — Product Resolution Engine (1 week)

**Goal:** Deterministic mapping from grocery list item → Kroger UPC. **Safety-critical sprint.**

### Tickets
- [ ] **S3-1** `resolve(alias, quantity?)` function — exact match against `product_mappings`
- [ ] **S3-2** Normalization pipeline (lowercase, trim, whitespace collapse)
- [ ] **S3-3** Multi-product alias support — return all rows for a given alias
- [ ] **S3-4** Quantity pass-through from Claude-parsed input; fall back to `default_quantity`
- [ ] **S3-5** Resolution result type: `Resolved | Unresolved` (no "maybe")
- [ ] **S3-6** Unit tests: exact match, no match, multi-product, quantity patterns
- [ ] **S3-7** **Allergen safety tests**: near-match strings must return `Unresolved`
- [ ] **S3-8** **Architecture assertion test**: grep/AST check — no API search fallback path exists

### Definition of Done
- 100% branch coverage on resolver
- Allergen safety suite passes and is wired into CI
- `Unresolved` has no code path to Kroger product search

### Non-Goals (explicit)
- Fuzzy matching, Levenshtein, embedding similarity — **rejected by SDD §9.2**
- API-search fallback for unresolved items — **rejected by SDD §9.2**

### Dependencies
- Sprint 1 complete (`product_mappings` exists)

---

## Sprint 4 — Cart Fill Orchestrator (1 week)

**Goal:** End-to-end cart fill callable as a single function.

### Tickets
- [ ] **S4-1** Edge Function `cart-fill` — entrypoint, idempotency key per run
- [ ] **S4-2** Fetch grocery list items from existing task manager API
- [ ] **S4-3** Per-item resolution via Sprint 3 engine
- [ ] **S4-4** Kroger product-detail verification (`GET /products/{id}?locationId=`) for stock
- [ ] **S4-5** Batch `PUT /cart/add` with all resolved, in-stock items
- [ ] **S4-6** Retry policy: 3 attempts, exponential backoff (2s/4s/8s) on 5xx / timeout
- [ ] **S4-7** Respect `Retry-After` on 429; queue remainder
- [ ] **S4-8** Mark successfully-added items complete on task list
- [ ] **S4-9** Write `cart_history` row with full `detail_json`
- [ ] **S4-10** UPC failure tracking — mark mapping after 3 consecutive failures
- [ ] **S4-11** Empty-list short-circuit (SMS §9.1 response)
- [ ] **S4-12** Integration tests against Kroger sandbox

### Definition of Done
- Direct API invocation with a seeded list fills a sandbox cart
- `cart_history` row matches outcome counts
- Every error category in SDD §9.1 has a passing test
- No items on grocery list → returns "empty list" response without API calls

### Dependencies
- Sprints 2 + 3 complete

---

## Sprint 5 — SMS Command Integration (1 week)

**Goal:** End-user can trigger cart fills by SMS.

### Tickets
- [ ] **S5-1** Extend Claude system prompt — classify commands per SDD §8.1
- [ ] **S5-2** Twilio webhook route: `"order groceries"` → Sprint 4 orchestrator
- [ ] **S5-3** Twilio webhook route: `"add mapping: <alias> = <UPC>"` → CRUD from Sprint 1
- [ ] **S5-4** Twilio webhook route: `"what's on my grocery list"` → list + resolution preview
- [ ] **S5-5** Twilio webhook route: `"clear grocery list"` → bulk complete
- [ ] **S5-6** Twilio signature validation (`X-Twilio-Signature`) — reject unsigned
- [ ] **S5-7** Authorized-number gate — drop messages from unknown `From`
- [ ] **S5-8** Confirmation SMS formatter — ≤320 chars, truncate with count overflow
- [ ] **S5-9** E2E test: simulated SMS → filled sandbox cart → confirmation SMS captured

### Definition of Done
- Real SMS from registered number fills sandbox cart and returns formatted reply
- Messages from unregistered numbers are silently dropped
- Signature validation rejects forged webhook posts

### Dependencies
- Sprint 4 complete

---

## Sprint 6 — Hardening & Monitoring (1 week)

**Goal:** Production-ready for 2 weeks of real use.

### Tickets
- [ ] **S6-1** Full integration-test suite against Kroger sandbox in CI
- [ ] **S6-2** End-to-end harness (Twilio test creds → Kroger sandbox)
- [ ] **S6-3** Error-alert SMS on unhandled exceptions in any edge function
- [ ] **S6-4** Scheduled UPC health check — nightly verify all active mappings still exist
- [ ] **S6-5** Discontinued-UPC auto-flagging (deactivate after 3 consecutive failures)
- [ ] **S6-6** Observability: structured logs, request IDs, cart-fill duration histogram
- [ ] **S6-7** Runbook: re-auth, mapping update, cart-fill replay
- [ ] **S6-8** Soak test: 14 days of real household use

### Definition of Done
- Two weeks of real-world use with zero unhandled errors
- Nightly UPC health check surfaces stale mappings before the user hits them
- Runbook tested by executing each procedure once

### Dependencies
- Sprint 5 complete (production SMS path live)

---

## Cut-Line for v1.0

Everything above is in scope. Everything below is **out of scope** until v1.0
ships and operates for 2 weeks without intervention.

- Receipt photo → mapping bootstrap (SDD §14.1)
- Recurring-order "staples" (§14.2)
- Price tracking (§14.3)
- Multi-store support (§14.4)
- Multi-user / household access (§14.5)

---

## Sprint-Over-Sprint Dependency Graph

```
S0 ──► S1 ──► S2 ──┐
              └──► S3 ──► S4 ──► S5 ──► S6
```

S2 and S3 are independent after S1 and can run in parallel if team size > 1.

---

## Working Agreements

1. **No fuzzy matching, ever.** Any PR introducing similarity scoring, fuzzy
   search, or API-fallback-on-unresolved is rejected at review.
2. **Migrations are append-only.** No destructive schema edits once seed data
   exists in any environment.
3. **Secrets live in Vault.** Any credential in `.env`, code, or logs blocks
   the PR.
4. **Every sprint ends with a demo.** Cart filled, SMS sent, or test suite
   green — something observable.
