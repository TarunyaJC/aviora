import { useState } from 'react';
import { BadgePercent, CreditCard, Landmark, ShieldAlert, Smartphone, Wallet } from 'lucide-react';
import { formatINR } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { PaymentMethod, PaymentRequestPayload } from '@/types/domain';

interface PaymentPanelProps {
  amount: number;
  processing: boolean;
  /** Receives the complete, display-safe payment payload for POST /api/payments. */
  onPay: (payload: PaymentRequestPayload) => void;
}

const METHODS: Array<{ value: PaymentMethod; label: string; icon: typeof CreditCard }> = [
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'netbanking', label: 'Netbanking', icon: Landmark },
  { value: 'wallet', label: 'Wallet', icon: Wallet },
  { value: 'emi', label: 'EMI', icon: BadgePercent },
];

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra'];
const WALLETS = ['PayDemo Wallet', 'PhonePe Demo', 'Amazonpay Demo', 'AVIORA Credits'];
const EMI_TENURES: Array<{ months: 3 | 6 | 9 | 12; label: string }> = [
  { months: 3, label: '3 months' },
  { months: 6, label: '6 months' },
  { months: 9, label: '9 months' },
  { months: 12, label: '12 months' },
];

export function PaymentPanel({ amount, processing, onPay }: PaymentPanelProps) {
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [holder, setHolder] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bank, setBank] = useState('');
  const [walletProvider, setWalletProvider] = useState('');
  const [tenureMonths, setTenureMonths] = useState<3 | 6 | 9 | 12>(6);
  const [error, setError] = useState('');

  function pay(): void {
    setError('');
    if (method === 'card') {
      const digits = number.replace(/\s/g, '');
      if (holder.trim().length < 2) return setError('Enter the cardholder name');
      if (!/^\d{12,19}$/.test(digits)) return setError('Enter a valid card number');
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return setError('Expiry must be MM/YY');
      // Only the last four digits are sent — the server never sees the PAN.
      return onPay({ method, card: { holder: holder.trim(), last4: digits.slice(-4), expiry } });
    }
    if (method === 'upi') {
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) return setError('Enter a valid UPI ID (name@bank)');
      return onPay({ method, upi: { upiId: upiId.trim() } });
    }
    if (method === 'netbanking') {
      if (!bank) return setError('Choose your bank to continue');
      return onPay({ method, netbanking: { bank } });
    }
    if (method === 'wallet') {
      if (!walletProvider) return setError('Choose a wallet to continue');
      return onPay({ method, wallet: { provider: walletProvider } });
    }
    // EMI — the demo never charges; the tenure is for the receipt.
    return onPay({ method: 'emi', emi: { tenureMonths } });
  }

  const inputClasses =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-frost placeholder:text-silver/40 transition-colors focus:border-champagne/50 focus:outline-none';

  return (
    <div className="glass rounded-2xl p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl font-semibold text-frost">Payment</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-300">
          <ShieldAlert className="size-3.5" aria-hidden />
          DEMO PAYMENT — no real charge
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-white/5 p-1 sm:grid-cols-5" role="tablist" aria-label="Payment method">
        {METHODS.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={method === m.value}
            onClick={() => setMethod(m.value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
              method === m.value ? 'bg-champagne text-obsidian' : 'text-silver hover:text-frost',
            )}
          >
            <m.icon className="size-3.5" aria-hidden />
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {method === 'card' ? (
          <>
            <input
              className={inputClasses}
              placeholder="Cardholder name"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              autoComplete="cc-name"
              aria-label="Cardholder name"
            />
            <input
              className={inputClasses}
              placeholder="Card number"
              inputMode="numeric"
              value={number}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                setNumber(digits.replace(/(.{4})/g, '$1 ').trim());
              }}
              autoComplete="cc-number"
              aria-label="Card number"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className={inputClasses}
                placeholder="MM/YY"
                inputMode="numeric"
                value={expiry}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                }}
                aria-label="Expiry"
              />
              <input
                className={inputClasses}
                placeholder="CVV (discarded)"
                inputMode="numeric"
                maxLength={3}
                aria-label="CVV, discarded immediately, demo only"
              />
            </div>
          </>
        ) : null}

        {method === 'upi' ? (
          <input
            className={inputClasses}
            placeholder="yourname@bank"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            aria-label="UPI ID"
          />
        ) : null}

        {method === 'netbanking' ? (
          <select
            className={cn(inputClasses, '[&>option]:bg-graphite')}
            aria-label="Bank"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          >
            <option value="" disabled>Choose your bank…</option>
            {BANKS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        ) : null}

        {method === 'wallet' ? (
          <select
            className={cn(inputClasses, '[&>option]:bg-graphite')}
            aria-label="Wallet"
            value={walletProvider}
            onChange={(e) => setWalletProvider(e.target.value)}
          >
            <option value="" disabled>Choose a wallet…</option>
            {WALLETS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        ) : null}

        {method === 'emi' ? (
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-silver">No-cost EMI tenure</p>
            <div className="grid grid-cols-4 gap-2">
              {EMI_TENURES.map((t) => (
                <button
                  key={t.months}
                  type="button"
                  aria-pressed={tenureMonths === t.months}
                  onClick={() => setTenureMonths(t.months)}
                  className={cn(
                    'rounded-xl border px-2 py-2.5 text-center text-xs font-medium transition-colors cursor-pointer',
                    tenureMonths === t.months
                      ? 'border-champagne bg-champagne/10 text-champagne'
                      : 'border-white/10 bg-white/5 text-silver hover:border-white/25',
                  )}
                >
                  {t.label}
                  <span className="mt-0.5 block text-[10px] text-silver/70">
                    {formatINR(Math.round(amount / t.months))}/mo
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-xs text-red-300" role="alert">{error}</p> : null}

      <button
        type="button"
        onClick={pay}
        disabled={processing}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-champagne py-3.5 text-sm font-semibold text-obsidian transition-colors hover:bg-champagne-soft disabled:opacity-60 cursor-pointer"
      >
        {processing ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-obsidian/30 border-t-obsidian" aria-hidden />
            Processing demo payment…
          </>
        ) : (
          <>
            Pay {formatINR(amount)}
            {method === 'emi' ? ` · ${tenureMonths}× ${formatINR(Math.round(amount / tenureMonths))} (demo)` : ' (demo)'}
          </>
        )}
      </button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-silver/70">
        This is a simulation for demonstration only. No payment gateway is connected and no money moves.
        Card numbers are never sent to the server — only the last four digits are kept for the demo receipt.
      </p>
    </div>
  );
}
