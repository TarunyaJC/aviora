import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Plane } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  const inputClasses =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-frost placeholder:text-silver/40 transition-colors focus:border-champagne/50 focus:outline-none';

  return (
    <section className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-5 py-10">
      <div className="glass rounded-3xl p-7 sm:p-8">
        <span className="grid size-11 place-items-center rounded-2xl border border-champagne/25 bg-champagne/10 text-champagne">
          <Plane className="size-5 -rotate-45" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold text-frost">Welcome back</h1>
        <p className="mt-1 text-sm text-silver">Sign in to manage your journeys.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-silver">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              className={inputClasses}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-silver">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              className={inputClasses}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error ? <p className="text-xs text-red-300" role="alert">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-champagne py-3 text-sm font-semibold text-obsidian transition-colors hover:bg-champagne-soft disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-silver">
          New to AVIORA?{' '}
          <Link to="/register" className="text-champagne hover:underline">
            Create an account
          </Link>
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[11px] leading-relaxed text-silver">
          <p className="font-semibold uppercase tracking-[0.2em] text-frost/80">Demo accounts</p>
          <p className="mt-1.5">
            User — <span className="text-champagne">user@example.com</span> / user123
          </p>
          <p>
            Admin — <span className="text-champagne">admin@example.com</span> / admin123
          </p>
        </div>
      </div>
    </section>
  );
}
