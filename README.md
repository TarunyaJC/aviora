# AVIORA — Premium Flight Reservation System

A luxurious, cinematic flight reservation platform built with **React + Node.js**, now backed by a real **SQL database**.

> **Database: built-in SQLite (`node:sqlite`).**
> A single `server/data/aviora.db` file stores users, flights, seats, bookings and payments —
> with real transactions, indexes, UNIQUE constraints and referential integrity.
> No external database server, driver or native addon is required: `npm install && npm run dev` just works on Node 22+.

---

## Features

| Area | Highlights |
|---|---|
| **Flight search** | One-way / round-trip / multi-city trip types, 14 airports, **7 flagship daily flights × 15 days (105 flights)** — always a full schedule on every date — cabin-aware pricing, debounced filters (airline, price, duration, stops, departure window) and 4-way sorting |
| **Flight details** | Route timelines, aircraft, baggage per cabin, fare table, live status, gate/terminal |
| **Seat selection** | Interactive visual cabin (Business / Premium Economy / Economy zones), exit rows, window/aisle surcharges, occupied/held/selected states, 10-minute server-side seat holds |
| **Passenger forms** | **One full detail form per passenger** — set 2 passengers, get 2 complete forms (name, DOB, gender, nationality, passport fields on international routes). Forms **auto-save as you type** with live validation and a per-passenger saved indicator; a passenger can't proceed with incomplete details |
| **Booking flow** | 6-step premium progress (Flight → Passengers → Seats → Extras → Payment → Confirmation), go-back without losing data, promo codes (`AVIORA10`, `FIRSTFLY`), extras, contact details |
| **Payment** | **5 demo methods — Card, UPI, Netbanking, Wallet, EMI** — each with its own validated fields (last-4 card, UPI ID, bank, wallet provider, EMI tenure with monthly instalments). Simulated gateway with PENDING/PROCESSING/SUCCESS/FAILED/REFUNDED states, ~92% success, instant retry on decline, automatic refunds on cancellation. Never a real charge; card numbers never sent to the server |
| **Digital ticket** | Professional per-passenger e-tickets: QR code (per-passenger seat data), booking reference, gate/terminal/boarding group, **payment summary (method + transaction ref)** and baggage allowance on the stub, print-optimized stylesheet, downloadable ticket file |
| **My Bookings** | Upcoming / Completed / Cancelled sections, ticket overlay, guarded cancellation (≥2h before departure), guest lookup by email |
| **Flight status** | Search by flight number, route or airline — gates, terminals, status timeline |
| **Admin** | KPI dashboard (flights, bookings, passengers, revenue, occupancy, delays, cancellations), Recharts trends (bookings, revenue), status mix, popular routes, cabin demand; flight management with delay/cancel/gate/terminal/aircraft/price actions, create & delete |
| **Auth** | JWT access (15m) + refresh (7d), bcrypt-hashed passwords, role authorization (USER/ADMIN), `/api/auth/me` session restore |
| **3D & polish** | React Three Fiber hero aircraft + flight-network globe, WebGL detection with elegant fallbacks, reduced-motion support, custom premium cursor (desktop only), Framer Motion transitions |
| **A11y & states** | Keyboard navigation, ARIA labels, skip link, focus rings, skeletons, custom empty states, never-hover-dependent functionality |

## Tech Stack

- **Frontend:** React 19, TypeScript (strict), Vite, Tailwind CSS 4, React Router 7, TanStack Query 5, Zustand 5, React Hook Form + Zod, Framer Motion (`motion`), Three.js + React Three Fiber + Drei, Recharts, qrcode.react, Lucide icons
- **Backend:** Node.js, Express 5, TypeScript (strict), Zod, Helmet, CORS, express-rate-limit, bcryptjs, jsonwebtoken
- **Database:** **SQLite via Node's built-in `node:sqlite`** — zero-config, transactional, indexed; lossless JSON payloads keep the domain model authoritative

## Project Structure

```text
flight-reservation/
├── client/               # React SPA (Vite)
│   └── src/
│       ├── components/   # ui/ flight/ booking/ seats/ dashboard/ navigation/ 3d/
│       ├── pages/        # Landing, Search, Details, Booking, Bookings, Status, Admin, Auth
│       ├── layouts/      # App shell with glass navbar
│       ├── hooks/        # TanStack Query hooks
│       ├── services/     # apiClient (envelope unwrap + refresh retry), token storage
│       ├── store/        # Zustand: authStore, bookingStore (draft + payment payload persisted)
│       ├── schemas/ types/ utils/ constants/
├── server/               # Express REST API
│   ├── src/
│   │   ├── controllers/  # thin HTTP layer
│   │   ├── services/     # business logic (auth, flight, seat, booking, payment, admin)
│   │   ├── repositories/ # SQLite facade — the ONLY database access
│   │   │   └── sqlite/   # connection, migrations, collection adapter
│   │   ├── routes/       # route registry with guards
│   │   ├── middleware/   # auth (JWT + roles), rate limiters, error handling, request id
│   │   ├── validators/   # Zod schemas
│   │   ├── scripts/      # seed.ts — deterministic flagship-flight generator (+ auto-seed on boot)
│   │   ├── tests/        # Vitest + Supertest API suite (25 tests)
│   │   └── app.ts
│   └── data/             # aviora.db — the SQLite database
├── tsconfig.base.json · .env.example · README.md
└── package.json          # npm workspaces root
```

## Installation & Running

```bash
npm install
npm run dev         # boots API (:5000) + client (:5173) together
```

That's it — an empty database **auto-seeds on first boot** (7 flagship routes × 15 days, demo users & bookings).

Open **http://localhost:5173**. The Vite dev server proxies `/api/*` to Express.

Other commands:

```bash
npm run seed        # regenerate the database from scratch (deterministic)
npm run dev:server  # API only      npm run dev:client  # client only
npm run test        # Vitest + Supertest API suite (25 tests)
npm run typecheck   # strict TS, both workspaces
npm run build       # build server (tsc) + client (vite)
npm start           # run the built server
```

## Demo credentials

| Role | Email | Password |
|---|---|---|
| User | `user@example.com` | `user123` |
| Admin | `admin@example.com` | `admin123` |

More seeded users: `aarav@example.com`, `zoya@example.com` (password `user123`).

## Database architecture

- **Engine:** Node's built-in `node:sqlite` (`DatabaseSync`) — no addons, no server process. The database file defaults to `server/data/aviora.db`; override with `AVIORA_DB_PATH` or `AVIORA_DATA_DIR`.
- **Schema:** `server/src/repositories/sqlite/migrate.ts` creates idempotent tables for `users, airports, airlines, aircraft, flights, seats, bookings, payments, notifications` — with UNIQUE constraints (user email, booking reference), indexes on every hot search path (route + date, flight number, booking email) and a `CHECK`-validated state columns.
- **Lossless payloads:** every row stores its full domain object as JSON in a `payload` column; a few derived columns (extracted on write) power the constraints and indexes. Reads return the exact API shape — services stay storage-agnostic behind the same `read()/write()` collections as before.
- **Transactions:** every collection write is atomic (`BEGIN…COMMIT`), so multi-row writes can never half-land. Concurrent seat double-booking is additionally guarded by the per-flight seat lock + re-validation inside the lock.
- **Seat holds** (10-minute transient reservations) remain in memory by design; confirmed bookings persist as occupied seats in the database.
- **Auto-seed:** on boot, an empty database is seeded deterministically (schedule math, not randomness) — 7 flagship routes repeated daily for 15 days: DEL→BOM, BOM→DEL, DEL→BLR, BOM→GOI, DEL→DXB, BOM→SIN, DEL→LHR.
- `npm run seed` wipes and regenerates the catalog at any time.

## API

Uniform envelope:

```json
{ "success": true,  "data": {}, "message": "Operation successful" }
{ "success": false, "message": "Flight not found", "errorCode": "FLIGHT_NOT_FOUND" }
```

Route groups: `/api/auth` (register, login, logout, refresh, me) · `/api/flights` (+ `:id`, `:id/seats`, `:id/seats/hold`) · `/api/airports|airlines|aircraft` · `/api/bookings` (+ `:id`, `:id/cancel`) · `/api/payments` (+ `:id`, `:id/process`, `:id/refund`; methods `card | upi | netbanking | wallet | emi` with per-method detail) · `/api/status` · `/api/admin` (dashboard, flights CRUD, actions).

Full request/response reference: **[API.md](API.md)** · System design: **[ARCHITECTURE.md](ARCHITECTURE.md)** · Design system: **[UI_DESIGN.md](UI_DESIGN.md)**

## Environment

Copy `.env.example` to `.env`. Never commit real secrets.

```env
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me
# Optional — defaults to server/data/aviora.db
AVIORA_DB_PATH=
```

## Testing

25 API integration tests (Vitest + Supertest) cover: envelope shape, security headers, malformed JSON, auth (bad creds, login, register, me-guard), search validation, details, 404s, seat map + occupied/invalid/hold rules, booking auth guard, **two-passenger booking with distinct details + promo pricing**, the full booking → demo payment → seat finalization → cancellation → refund chain, **all five payment methods with per-method detail payloads**, duplicate-seat rejection, admin 401/403/200 authorization, flight actions, create & delete.

```bash
npm run test -w server
```

---

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — system design, data flow, concurrency model
- [API.md](API.md) — endpoint reference with payloads
- [UI_DESIGN.md](UI_DESIGN.md) — tokens, components, motion & accessibility rules
