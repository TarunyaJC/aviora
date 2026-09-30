# AVIORA — API Reference

Base URL: `http://localhost:5000/api` (the client proxies `/api/*` in dev).

Every response uses the uniform envelope:

```json
{ "success": true,  "data": {},      "message": "Operation successful" }
{ "success": false, "message": "…",  "errorCode": "NOT_FOUND" }
```

Error codes: `BAD_REQUEST` · `VALIDATION_ERROR` · `UNAUTHORIZED` · `FORBIDDEN` · `NOT_FOUND` · `CONFLICT` · `RATE_LIMITED` · `INTERNAL_ERROR`.

Authentication: `Authorization: Bearer <accessToken>`. Access tokens last 15 min; refresh via `POST /api/auth/refresh`.

---

## Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` | 201, returns `{ user, tokens }`; 409 if email exists |
| POST | `/auth/login` | `{ email, password }` | Returns `{ user, tokens }`; uniform 401 on bad credentials |
| POST | `/auth/logout` | — | Stateless; client discards tokens |
| POST | `/auth/refresh` | `{ refreshToken }` | Returns fresh token pair |
| GET | `/auth/me` 🔒 | — | Current session user |

## Catalog

| Method | Path | Description |
|---|---|---|
| GET | `/airports` | All airports |
| GET | `/airlines` | All airlines |
| GET | `/aircraft` | All aircraft with cabin zones |

## Flights

### `GET /flights`
Query: `from` (3-letter, required) · `to` (required, ≠ from) · `date` (YYYY-MM-DD) · `cabin` · `passengers` (1–9) · `airline` (airline id) · `maxPrice` · `maxDuration` (minutes) · `stops` (`any`|`nonstop`) · `departureWindow` (`any`|`morning`|`afternoon`|`evening`|`night`) · `sort` (`cheapest`|`fastest`|`earliest`|`latest`) · `page` · `pageSize` (≤ 50).

Response `data`: `{ flights: Flight[], total, page, pageSize }`. Cancelled flights are excluded. Flights include embedded `airline` and `aircraft` summaries.

### `GET /flights/:id`
Flight detail with fare table and baggage allowances. 404 if unknown.

### `GET /flights/:id/seats`
`data`: `{ flightId, seats: SeatInfo[] }` — each seat: `{ id ("12A"), row, letter, zone, state (available|occupied|held), isExitRow, position, priceSurcharge }`. `held` reflects live in-memory holds.

### `POST /flights/:id/seats/hold`
Body `{ seatIds: ["12A", …] }` (1–9 seats). Holds for 10 minutes; 409 on occupied/already-held seats; 400 on unknown seat ids. Rate limited (60/min).

### `POST /flights/:id/seats/release`
Body `{ holdId }` — releases a live hold early.

## Status

### `GET /status`
Query: any of `flightNumber` (partial match) · `from` · `to` · `date` · `airlineId`. Returns up to 30 most recent matching flights with gate/terminal/status.

## Bookings

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/bookings` | 🔒 | Body: `{ flightId, cabin, passengers[], contactEmail, contactPhone, promoCode? }`. Each passenger: `{ firstName, lastName, dateOfBirth, gender, nationality, passportNumber?, passportExpiry?, seatId }`. Duplicate seat ids → 400; taken seat → 409; server recalculates the authoritative total (promo codes `AVIORA10` 10%, `FIRSTFLY` 15%) |
| GET | `/bookings` | 🔒 | Own bookings (guests: use `?email=`) |
| GET | `/bookings/:id` | — | By id or booking reference |
| POST | `/bookings/:id/cancel` | — | ≥2h before departure; frees seats, marks demo payment REFUNDED. 409 if already cancelled or inside 2h |

## Payments — DEMO ONLY

> No gateway is connected and no money ever moves. The server never receives full card numbers — the client sends only display-safe details (last four digits, UPI ID, bank name) for the demo receipt.

**Five demo methods** — each carries its own validated detail payload, echoed back as `methodDetail` on the payment (and shown on the e-ticket):

| `method` | Extra body | `methodDetail` returned |
|---|---|---|
| `card` | `card: { holder, last4, expiry }` | `{ holder, last4, brand, expiry }` |
| `upi` | `upi: { upiId }` (format `name@bank`) | `{ upiId }` |
| `netbanking` | `netbanking: { bank }` | `{ bank }` |
| `wallet` | `wallet: { provider }` | `{ provider }` |
| `emi` | `emi: { tenureMonths: 3\|6\|9\|12 }` | `{ provider, tenureMonths }` |

| Method | Path | Notes |
|---|---|---|
| POST | `/payments` | `{ bookingId, method, …detail }` → 201 `PENDING` payment with `demo: true` |
| GET | `/payments/:id` | Payment status |
| POST | `/payments/:id/process` | Simulates ~1.8 s processing; ~92% `SUCCESS` (finalizes seats), else `FAILED` (retryable — POST a fresh payment) |
| POST | `/payments/:id/refund` | `SUCCESS` → `REFUNDED` |

## Admin 🔒 role: ADMIN

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/dashboard` | `stats` (todayFlights, bookings, passengers, revenue, occupancy, delays, cancellations), `bookingTrend` (14d), `revenueTrend` (14d), `statusBreakdown`, `popularRoutes`, `cabinOccupancy` |
| GET | `/admin/flights` | Filters `search`, `status`; latest 100 |
| POST | `/admin/flights` | Create (flight number like `6E-234`, ISO datetimes with offset, basePrice ≥ 999). Per-cabin prices derived automatically |
| PUT | `/admin/flights/:id` | Partial update; recompute duration/prices |
| DELETE | `/admin/flights/:id` | Remove flight |
| POST | `/admin/flights/:id/actions` | `{ action: delay\|cancel\|gate\|terminal\|aircraft\|price\|status, minutes?, gate?, terminal?, aircraftId?, basePrice?, status? }` |

Non-admin callers receive `401` (anonymous) or `403` (authenticated user).
