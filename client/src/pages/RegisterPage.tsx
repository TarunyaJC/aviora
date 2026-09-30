import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plane } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
        <h1 className="mt-5 font-display text-2xl font-semibold text-frost">Create your account</h1>
        <p className="mt-1 text-sm text-silver">Join AVIORA for a smoother journey.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-silver">Full name</span>
            <input required minLength={2} className={inputClasses} value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-silver">Email</span>
            <input type="email" required autoComplete="email" className={inputClasses} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-silver">Password</span>
            <input type="password" required minLength={8} autoComplete="new-password" className={inputClasses} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars, letters + numbers" />
            <span className="mt-1 block text-[10px] text-silver/70">At least 8 characters with letters and numbers.</span>
          </label>

          {error ? <p className="text-xs text-red-300" role="alert">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-champagne py-3 text-sm font-semibold text-obsidian transition-colors hover:bg-champagne-soft disabled:opacity-60 cursor-pointer"
          >
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-silver">
          Already flying with us?{' '}
          <Link to="/login" className="text-champagne hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
