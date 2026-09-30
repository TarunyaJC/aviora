import { randomUUID } from 'node:crypto';
import { bookingsCollection, paymentsCollection } from '../repositories/index.js';
import { ApiError, ErrorCodes } from '../utils/ApiError.js';
import { finalizeBookingSeats, getBooking } from './booking.service.js';
import type { Payment, PaymentMethodDetail } from '../types/domain.js';
import type { CreatePaymentInput } from '../validators/schemas.js';

const PROCESSING_LATENCY_MS = 1_800;
const SUCCESS_RATE = 0.92; // deterministic-ish demo: occasional failure keeps UI honest

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function transactionRef(): string {
  return `TXN-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

/**
 * DEMO PAYMENT — no real money moves. The server never receives or stores
 * card numbers; the client sends only display-safe details (e.g. last four
 * digits) that end up on the receipt and e-ticket.
 */
function methodDetailFor(input: CreatePaymentInput): PaymentMethodDetail {
  if (input.method === 'card' && input.card) {
    const { holder, last4, expiry } = input.card;
    return { holder, last4, brand: 'Demo Card', expiry };
  }
  if (input.method === 'upi' && input.upi) return { upiId: input.upi.upiId };
  if (input.method === 'netbanking' && input.netbanking) return { bank: input.netbanking.bank };
  if (input.method === 'wallet' && input.wallet) return { provider: input.wallet.provider };
  if (input.method === 'emi' && input.emi) {
    return { provider: 'AVIORA Pay Later', tenureMonths: input.emi.tenureMonths };
  }
  return {};
}

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  const booking = await getBooking(input.bookingId);
  if (booking.status === 'CANCELLED') {
    throw ApiError.conflict('Cannot pay for a cancelled booking');
  }

  const payments = await paymentsCollection.read();
  const existing = payments.find((p) => p.bookingId === booking.id && p.status === 'SUCCESS');
  if (existing) {
    throw ApiError.conflict('This booking has already been paid');
  }

  const payment: Payment = {
    id: `PAY-${Date.now().toString(36).toUpperCase()}${randomUUID().slice(0, 4).toUpperCase()}`,
    bookingId: booking.id,
    amount: booking.totalAmount,
    currency: 'INR',
    method: input.method,
    status: 'PENDING',
    demo: true,
    methodDetail: methodDetailFor(input),
    transactionRef: transactionRef(),
    createdAt: new Date().toISOString(),
    processedAt: null,
  };

  await paymentsCollection.write([...payments, payment]);

  // Link the payment back to the booking so cancellation can refund it.
  const bookings = await bookingsCollection.read();
  const bookingRow = bookings.find((b) => b.id === booking.id);
  if (bookingRow) {
    bookingRow.paymentId = payment.id;
    await bookingsCollection.write(bookings);
  }

  return payment;
}

export async function processPayment(paymentId: string): Promise<Payment> {
  const payments = await paymentsCollection.read();
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Payment not found');
  if (payment.status === 'SUCCESS') return payment;
  if (payment.status !== 'PENDING' && payment.status !== 'PROCESSING') {
    throw ApiError.conflict(`Payment cannot be processed from ${payment.status} state`);
  }

  payment.status = 'PROCESSING';
  await paymentsCollection.write(payments);

  await wait(PROCESSING_LATENCY_MS);

  // Refresh rows after the await — another request may have written meanwhile.
  const rows = await paymentsCollection.read();
  const current = rows.find((p) => p.id === paymentId);
  if (!current) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Payment not found');

  const outcome = Math.random() < SUCCESS_RATE ? 'SUCCESS' : 'FAILED';
  current.status = outcome;
  current.processedAt = new Date().toISOString();

  if (outcome === 'SUCCESS') {
    const booking = await getBooking(current.bookingId);
    await finalizeBookingSeats(booking);
  }
  await paymentsCollection.write(rows);
  return current;
}

export async function getPayment(paymentId: string): Promise<Payment> {
  const payments = await paymentsCollection.read();
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Payment not found');
  return payment;
}

export async function refundPayment(paymentId: string): Promise<Payment> {
  const payments = await paymentsCollection.read();
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Payment not found');
  if (payment.status !== 'SUCCESS') {
    throw ApiError.conflict('Only successful payments can be refunded');
  }

  payment.status = 'REFUNDED';
  await paymentsCollection.write(payments);
  return payment;
}
