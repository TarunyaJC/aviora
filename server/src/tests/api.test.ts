import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { getDatabase } from '../repositories/sqlite/connection.js';
import { runMigrations } from '../repositories/sqlite/migrate.js';
import type { Flight } from '../types/domain.js';

/**
 * The vitest setup redirects AVIORA_DATA_DIR to an isolated directory, so the
 * SQLite test database lives at .testdata/aviora.db and never touches real
 * seed data. Fixtures are inserted as lossless JSON payloads, exactly the way
 * the collections layer stores them.
 */
const app = createApp();

let userToken = '';
let adminToken = '';
let bookingRef = '';

const T_DEP = new Date(Date.now() + 7 * 86_400_000).toISOString();
const T_ARR = new Date(Date.now() + 7 * 86_400_000 + 100 * 60_000).toISOString();

async function insertFixtures(): Promise<void> {
  const db = getDatabase();
  runMigrations(db);

  // The test database persists across runs — start every run from a clean slate.
  for (const table of ['notifications', 'payments', 'bookings', 'seats', 'flights', 'users', 'airlines', 'aircraft', 'airports']) {
    db.prepare(`DELETE FROM ${table}`).run();
  }

  const airlines = [{ id: 'AL-TST', name: 'TestAir', code: 'TF', logoColor: '#4b5ae4', rating: 4.5 }];
  const aircraft = [
    {
      id: 'AC-TST',
      model: 'A320neo',
      manufacturer: 'Airbus',
      capacity: 60,
      rows: 10,
      cabinZones: [
        { name: 'Business', fromRow: 1, toRow: 2, columns: ['A', 'C', 'D', 'F'], priceMultiplier: 3 },
        { name: 'Economy', fromRow: 3, toRow: 10, columns: ['A', 'B', 'C', 'D', 'E', 'F'], priceMultiplier: 1 },
      ],
      baggageKg: { Economy: 15, 'Premium Economy': 25, Business: 35 },
    },
  ];
  const airports = [
    { code: 'TST', city: 'Testville', name: 'Test Intl', country: 'India', timezone: 'Asia/Kolkata', terminals: 1 },
    { code: 'DST', city: 'Destville', name: 'Dest Intl', country: 'India', timezone: 'Asia/Kolkata', terminals: 1 },
  ];
  const flights: Flight[] = [
    {
      id: 'FLT-T1',
      flightNumber: 'TF-100',
      airlineId: 'AL-TST',
      aircraftId: 'AC-TST',
      from: 'TST',
      to: 'DST',
      departure: T_DEP,
      arrival: T_ARR,
      durationMinutes: 100,
      stops: 0,
      stopCities: [],
      basePrice: 5000,
      price: { Economy: 4999, 'Premium Economy': 8499, Business: 14999 },
      status: 'SCHEDULED',
      gate: '5',
      terminal: '1',
      baggageKg: { Economy: 15, 'Premium Economy': 25, Business: 35 },
      createdAt: new Date().toISOString(),
    },
  ];
  const seats = [
    {
      id: 'FLT-T1',
      seats: [
        ...['A', 'C', 'D', 'F'].map((letter) => ({
          id: `1${letter}`, row: 1, letter, zone: 'Business', state: 'available', isExitRow: false,
          position: letter === 'A' || letter === 'F' ? 'window' : 'aisle', priceSurcharge: 0,
        })),
        ...['A', 'B', 'C', 'D', 'E', 'F'].map((letter, i) => ({
          id: `3${letter}`, row: 3, letter, zone: 'Economy', state: i === 0 ? 'occupied' : 'available',
          isExitRow: false, position: letter === 'A' || letter === 'F' ? 'window' : letter === 'B' ? 'middle' : 'aisle',
          priceSurcharge: letter === 'A' ? 350 : letter === 'B' ? 0 : 200,
        })),
      ],
    },
  ];
  const users = [
    { id: 'USR-TST', name: 'Test User', email: 'user@test.local', passwordHash: bcrypt.hashSync('user123', 10), role: 'USER', createdAt: T_DEP },
    { id: 'ADM-TST', name: 'Test Admin', email: 'admin@test.local', passwordHash: bcrypt.hashSync('admin123', 10), role: 'ADMIN', createdAt: T_DEP },
  ];

  // Insert payloads exactly like the collections layer (derived columns + JSON payload).
  for (const a of airports) {
    db.prepare('INSERT INTO airports (code, country, payload) VALUES (?, ?, ?)').run(a.code, a.country, JSON.stringify(a));
  }
  for (const a of airlines) {
    db.prepare('INSERT INTO airlines (id, code, payload) VALUES (?, ?, ?)').run(a.id, a.code, JSON.stringify(a));
  }
  for (const a of aircraft) {
    db.prepare('INSERT INTO aircraft (id, model, payload) VALUES (?, ?, ?)').run(a.id, a.model, JSON.stringify(a));
  }
  for (const u of users) {
    db.prepare('INSERT INTO users (id, email, role, payload) VALUES (?, ?, ?, ?)').run(u.id, u.email, u.role, JSON.stringify(u));
  }
  for (const f of flights) {
    db.prepare('INSERT INTO flights (id, flightNumber, origin, destination, departure, status, payload) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(f.id, f.flightNumber, f.from, f.to, f.departure, f.status, JSON.stringify(f));
  }
  for (const s of seats) {
    db.prepare('INSERT INTO seats (id, payload) VALUES (?, ?)').run(s.id, JSON.stringify(s));
  }
}

beforeAll(insertFixtures, 20_000);

async function login(email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.tokens.accessToken as string;
}

describe('API envelope & security', () => {
  it('returns the uniform success envelope on health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe('aviora-api');
  });

  it('returns a structured 404 for unknown routes', async () => {
    const res = await request(app).get('/api/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('NOT_FOUND');
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});

describe('Authentication', () => {
  it('rejects bad credentials with a uniform 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.local', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('logs in the demo user and returns tokens', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.local', password: 'user123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('USER');
    expect(res.body.data.tokens.accessToken).toBeTruthy();
    userToken = res.body.data.tokens.accessToken;
  });

  it('logs in the admin', async () => {
    adminToken = await login('admin@test.local', 'admin123');
    expect(adminToken).toBeTruthy();
  });

  it('blocks /api/auth/me without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New Flyer', email: 'new@test.local', password: 'flyhigh1' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('USER');
  });
});

describe('Flight search & details', () => {
  it('searches by route', async () => {
    const res = await request(app).get('/api/flights').query({ from: 'TST', to: 'DST' });
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.flights[0]?.airline.name).toBe('TestAir');
  });

  it('rejects invalid search with 400', async () => {
    const res = await request(app).get('/api/flights').query({ from: 'TST', to: 'TST' });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('returns flight details', async () => {
    const res = await request(app).get('/api/flights/FLT-T1');
    expect(res.status).toBe(200);
    expect(res.body.data.aircraft.model).toBe('A320neo');
  });

  it('404s for a missing flight', async () => {
    const res = await request(app).get('/api/flights/FLT-NOPE');
    expect(res.status).toBe(404);
  });
});

describe('Seat map & holds', () => {
  it('returns the seat map with occupied seats marked', async () => {
    const res = await request(app).get('/api/flights/FLT-T1/seats');
    expect(res.status).toBe(200);
    const occupied = res.body.data.seats.filter((s: { state: string }) => s.state === 'occupied');
    expect(occupied.map((s: { id: string }) => s.id)).toContain('3A');
  });

  it('refuses to hold an occupied seat', async () => {
    const res = await request(app).post('/api/flights/FLT-T1/seats/hold').send({ seatIds: ['3A'] });
    expect(res.status).toBe(409);
  });

  it('refuses invalid seat ids', async () => {
    const res = await request(app).post('/api/flights/FLT-T1/seats/hold').send({ seatIds: ['99Z'] });
    expect(res.status).toBe(400);
  });

  it('holds available seats', async () => {
    const res = await request(app).post('/api/flights/FLT-T1/seats/hold').send({ seatIds: ['3B'] });
    expect(res.status).toBe(201);
    expect(res.body.data.holdId).toBeTruthy();
    await request(app).post('/api/flights/FLT-T1/seats/release').send({ holdId: res.body.data.holdId });
  });
});

describe('Booking → payment → ticket → cancellation', () => {
  it('requires authentication to book', async () => {
    const res = await request(app).post('/api/bookings').send({
      flightId: 'FLT-T1',
      cabin: 'Economy',
      passengers: [{ firstName: 'A', lastName: 'B', dateOfBirth: '1990-01-01', gender: 'male', nationality: 'Indian', seatId: '3C' }],
      contactEmail: 'user@test.local',
      contactPhone: '+91 90000 00000',
    });
    expect(res.status).toBe(401);
  });

  it('books TWO passengers with distinct details, pays by wallet, cancels and refunds', async () => {
    // Multi-passenger booking — every passenger carries their own details + seat.
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        flightId: 'FLT-T1',
        cabin: 'Economy',
        passengers: [
          { firstName: 'Aarav', lastName: 'Sharma', dateOfBirth: '1994-03-12', gender: 'male', nationality: 'Indian', seatId: '3C' },
          { firstName: 'Zoya', lastName: 'Khan', dateOfBirth: '1997-11-02', gender: 'female', nationality: 'Indian', seatId: '3D' },
        ],
        contactEmail: 'user@test.local',
        contactPhone: '+91 90000 00000',
        promoCode: 'AVIORA10',
      });
    expect(bookingRes.status).toBe(201);
    const booking = bookingRes.body.data;
    expect(booking.reference).toMatch(/^AV/);
    expect(booking.passengers).toHaveLength(2);
    expect(booking.passengers[0].firstName).toBe('Aarav');
    expect(booking.passengers[1].firstName).toBe('Zoya');
    expect(booking.passengers[0].seatId).not.toBe(booking.passengers[1].seatId);
    // (fare + aisle surcharge) × 2 passengers, minus the 10% promo.
    const expectedTotal = Math.round((4999 + 200) * 2 * 0.9);
    expect(booking.totalAmount).toBe(expectedTotal);
    bookingRef = booking.reference;

    // Seats remain available until the payment finalizes.
    const seatsRes = await request(app).get('/api/flights/FLT-T1/seats');
    const seat3C = seatsRes.body.data.seats.find((s: { id: string }) => s.id === '3C');
    expect(seat3C.state).toBe('available');

    // Duplicate seat across passengers is rejected.
    const dupRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        flightId: 'FLT-T1',
        cabin: 'Economy',
        passengers: [
          { firstName: 'X', lastName: 'Y', dateOfBirth: '1990-01-01', gender: 'female', nationality: 'Indian', seatId: '3E' },
          { firstName: 'Z', lastName: 'W', dateOfBirth: '1990-01-02', gender: 'male', nationality: 'Indian', seatId: '3E' },
        ],
        contactEmail: 'user@test.local',
        contactPhone: '+91 90000 00000',
      });
    expect(dupRes.status).toBe(400);

    // Wallet payment — a full demo method with its own detail payload.
    const payRes = await request(app)
      .post('/api/payments')
      .send({ bookingId: booking.id, method: 'wallet', wallet: { provider: 'PayDemo Wallet' } });
    expect(payRes.status).toBe(201);
    expect(payRes.body.data.demo).toBe(true);
    expect(payRes.body.data.methodDetail.provider).toBe('PayDemo Wallet');

    // Demo processing can fail (8%); retry until it succeeds so the chain holds.
    let paymentId = payRes.body.data.id as string;
    let finalPayment = { status: 'PENDING' };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const procRes = await request(app).post(`/api/payments/${paymentId}/process`);
      expect([200, 409]).toContain(procRes.status);
      finalPayment = procRes.body.data;
      if (finalPayment.status === 'SUCCESS') break;
      const retry = await request(app)
        .post('/api/payments')
        .send({ bookingId: booking.id, method: 'wallet', wallet: { provider: 'PayDemo Wallet' } });
      expect(retry.status).toBe(201);
      paymentId = retry.body.data.id;
    }
    expect(finalPayment.status).toBe('SUCCESS');

    // Seats permanently occupied after success.
    const seatsAfter = await request(app).get('/api/flights/FLT-T1/seats');
    const seatAfter = seatsAfter.body.data.seats.find((s: { id: string }) => s.id === '3C');
    expect(seatAfter.state).toBe('occupied');

    // Booking retrieval + listings.
    const byRef = await request(app).get(`/api/bookings/${bookingRef}`);
    expect(byRef.status).toBe(200);
    const listRes = await request(app).get('/api/bookings').set('Authorization', `Bearer ${userToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((b: { reference: string }) => b.reference === bookingRef)).toBe(true);

    // Cancellation refunds the demo payment and frees the seat.
    const cancelRes = await request(app).post(`/api/bookings/${bookingRef}/cancel`).send({});
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    const seatsFinal = await request(app).get('/api/flights/FLT-T1/seats');
    const seatFinal = seatsFinal.body.data.seats.find((s: { id: string }) => s.id === '3C');
    expect(seatFinal.state).toBe('available');

    const payAfter = await request(app).get(`/api/payments/${paymentId}`);
    expect(payAfter.body.data.status).toBe('REFUNDED');
  });

  it('accepts upi, netbanking and emi payments with per-method details', async () => {
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        flightId: 'FLT-T1',
        cabin: 'Economy',
        passengers: [
          { firstName: 'Rohan', lastName: 'Verma', dateOfBirth: '1990-01-17', gender: 'male', nationality: 'Indian', seatId: '3F' },
        ],
        contactEmail: 'user@test.local',
        contactPhone: '+91 90000 00000',
      });
    expect(bookingRes.status).toBe(201);
    const booking = bookingRes.body.data;

    const upiRes = await request(app)
      .post('/api/payments')
      .send({ bookingId: booking.id, method: 'upi', upi: { upiId: 'rohan@okdemo' } });
    expect(upiRes.status).toBe(201);
    expect(upiRes.body.data.methodDetail.upiId).toBe('rohan@okdemo');

    const nbRes = await request(app)
      .post('/api/payments')
      .send({ bookingId: booking.id, method: 'netbanking', netbanking: { bank: 'HDFC Bank' } });
    expect(nbRes.status).toBe(201);
    expect(nbRes.body.data.methodDetail.bank).toBe('HDFC Bank');

    const emiRes = await request(app)
      .post('/api/payments')
      .send({ bookingId: booking.id, method: 'emi', emi: { tenureMonths: 6 } });
    expect(emiRes.status).toBe(201);
    expect(emiRes.body.data.methodDetail.tenureMonths).toBe(6);

    // Card payments still carry the classic last4 payload.
    const cardRes = await request(app)
      .post('/api/payments')
      .send({ bookingId: booking.id, method: 'card', card: { holder: 'Rohan Verma', last4: '4242', expiry: '12/29' } });
    expect(cardRes.status).toBe(201);
    expect(cardRes.body.data.methodDetail.last4).toBe('4242');
  });
});

describe('Admin authorization', () => {
  it('blocks the dashboard for anonymous users', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it('blocks the dashboard for non-admin users', async () => {
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('allows admins and computes stats', async () => {
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.stats.todayFlights).toBeGreaterThanOrEqual(0);
    expect(res.body.data.bookingTrend).toHaveLength(14);
  });

  it('supports admin flight actions', async () => {
    const res = await request(app)
      .post('/api/admin/flights/FLT-T1/actions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'delay', minutes: 30 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DELAYED');
  });

  it('allows flight creation', async () => {
    const res = await request(app)
      .post('/api/admin/flights')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        flightNumber: 'TF-200',
        airlineId: 'AL-TST',
        aircraftId: 'AC-TST',
        from: 'DST',
        to: 'TST',
        departure: new Date(Date.now() + 9 * 86_400_000).toISOString(),
        arrival: new Date(Date.now() + 9 * 86_400_000 + 95 * 60_000).toISOString(),
        stops: 0,
        stopCities: [],
        basePrice: 5200,
        status: 'SCHEDULED',
        gate: null,
        terminal: '1',
      });
    expect(res.status).toBe(201);

    const delRes = await request(app).delete(`/api/admin/flights/${res.body.data.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);
  });
});
