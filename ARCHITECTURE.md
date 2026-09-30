# AVIORA — Architecture

## System overview

```text
Browser (React 19 SPA — Vite :5173)
   │  same-origin /api/* via Vite proxy
   ▼
Express 5 API (:5000)
   helmet · cors(allow-list) · rate-limit · json(100kb) · requestId
   ▼
Routes ──► Controllers ──► Services ──► Repositories (SQLite facade)
                                         │  lossless JSON payloads + derived columns
                                         ▼
                              server/data/aviora.db  ← built-in SQLite (node:sqlite)
```

## Layer rules

| Layer | Responsibility | Never does |
|---|---|---|
| **Routes** | URL → controller mapping, attach guards (rate limit, auth, roles) | business logic |
| **Controllers** | validate input (Zod), call services, shape the envelope | touch data directly |
| **Services** | business rules, pricing, holds, refunds | touch the database directly |
| **Repositories** | the **only** database access; SQLite connection, migrations, collections | business rules |

## Data model

`server/data/aviora.db` (SQLite) — tables `users`, `airports`, `airlines`, `aircraft`, `flights`, `seats` (one record per flight, `id` = flightId), `bookings` (passengers embedded), `payments`, `notifications`.

Key design choices:

- **Lossless JSON payloads with derived columns.** Every row stores its exact domain object in a `payload` column; a few columns extracted on write (email, reference, route, status…) power UNIQUE constraints, indexes and referential checks. Reads return the exact API shape, so services never parse storage internals.
- **Flights carry denormalized per-cabin prices** (`price.Economy | Premium Economy | Business`) derived from `basePrice` × aircraft zone multipliers — searches never join reference data at price time.
- **Seats are one record per flight** (`{ id: flightId, seats: SeatInfo[] }`) so a seat mutation rewrites a single record, not the whole map.
- **Passengers live inside bookings** — they have no lifecycle outside their booking.
- **Seat holds are memory-only** (`Map` in `seat.service.ts`, 10-minute TTL) — transient state that must not survive restarts. Payment success converts holds into persisted `occupied` seats in the database.
- **Transactions:** every collection write runs inside `BEGIN…COMMIT`, so multi-row writes are atomic.
- **The seeder is deterministic** (schedule math, fixed departure banks) so every regeneration produces identical flights, seats and demo bookings. An empty database also auto-seeds on boot.

## Concurrency model

SQLite writes are transactional, and two guards additionally prevent double-booking:

1. **Per-flight async mutex** (`withSeatLock` in `booking.service.ts`): serializes all seat mutations (booking confirmation, cancellation seat release) per flight.
2. **Re-validation inside the lock**: availability is checked again after acquiring the mutex, so a request that passed pre-checks still fails safely with `409` if a concurrent booking won the seat.

Payment processing re-reads collections **after every `await`** — never trusts a pre-await snapshot.

## Security

- Helmet defaults (+ HSTS), CORS allow-list from `CLIENT_URL`, 100 kB body cap.
- Rate limits: 300/15 min global, 20/10 min on auth endpoints, 60/min on seat mutations.
- JWT access (15 min) + refresh (7 d) tokens; passwords bcrypt-hashed (cost 10); uniform invalid-credential message (no user enumeration).
- Role authorization via `requireRole('ADMIN')`; users never see stack traces (centralized error middleware maps everything to the envelope).
- Demo payments accept **only** display-safe details (card last four, UPI ID, bank name) — PANs and credentials never leave the client.

## Frontend architecture

- **Server state:** TanStack Query exclusively (`hooks/useApi.ts`); components never cache API data themselves.
- **Client state:** Zustand — `authStore` (session, refresh flow) and `bookingStore` (booking draft persisted to localStorage; passengers, seats, extras, recent searches).
- **API access:** one typed `apiClient` unwraps the envelope once, attaches bearer tokens, and retries once through the refresh flow on `401` (dynamic import avoids a static cycle).
- **Code splitting:** every route is lazy; three.js and Recharts load only on the pages that use them.
- **3D:** decorative-only (`aria-hidden`, pointer-events managed); WebGL detection + `prefers-reduced-motion` fall back to static SVG art; scroll parallax is passive and capped.

## Error handling

Centralized middleware maps `ApiError` (operational), `ZodError` (400 with first issue message), malformed JSON (400), and anything unexpected (500, logged with request id, generic message) into the single envelope. `X-Request-Id` is honored/issued per request for tracing.
