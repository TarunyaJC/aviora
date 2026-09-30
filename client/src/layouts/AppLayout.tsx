import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Gauge, LogOut, Plane, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { initialsOf } from '@/utils/format';
import { cn } from '@/utils/cn';

const NAV_LINKS = [
  { to: '/flights', label: 'Flights' },
  { to: '/status', label: 'Status' },
  { to: '/bookings', label: 'My Bookings' },
] as const;

function BrandMark() {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="AVIORA home">
      <span className="grid size-9 place-items-center rounded-xl border border-champagne/25 bg-champagne/10 text-champagne transition-transform duration-300 ease-lux group-hover:scale-105">
        <Plane className="size-4.5 -rotate-45" aria-hidden />
      </span>
      <span className="font-display text-lg font-semibold tracking-[0.22em] text-frost">AVIORA</span>
    </Link>
  );
}

function SessionBadge() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <Link to="/login" className="rounded-full px-4 py-2 text-sm text-silver transition-colors hover:text-frost">
          Sign in
        </Link>
        <Link
          to="/register"
          className="rounded-full bg-champagne px-5 py-2 text-sm font-semibold text-obsidian transition-colors hover:bg-champagne-soft"
        >
          Register
        </Link>
      </div>
    );
  }

  return (
    <div className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-full border border-white/10 py-1.5 pl-1.5 pr-4 transition-colors hover:border-champagne/40 cursor-pointer"
      >
        <span className="grid size-7 place-items-center rounded-full bg-champagne/15 text-[11px] font-semibold text-champagne">
          {initialsOf(user.name)}
        </span>
        <span className="max-w-28 truncate text-xs text-frost">{user.name}</span>
      </button>

      {menuOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-12 w-48 overflow-hidden rounded-2xl border border-white/10 bg-midnight/95 shadow-2xl backdrop-blur-xl"
        >
          <p className="border-b border-white/5 px-4 py-3 text-[11px] text-silver">{user.email}</p>
          {user.role === 'ADMIN' ? (
            <Link
              to="/admin"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs text-frost hover:bg-white/5"
            >
              <Gauge className="size-3.5 text-champagne" aria-hidden /> Admin dashboard
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setMenuOpen(false);
              await logout();
              navigate('/');
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-silver hover:bg-white/5 cursor-pointer"
          >
            <LogOut className="size-3.5" aria-hidden /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[110] focus:rounded-full focus:bg-champagne focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-obsidian"
      >
        Skip to content
      </a>

      <header className="glass fixed inset-x-0 top-0 z-50 border-x-0 border-t-0">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8" aria-label="Main">
          <BrandMark />

          <ul className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-full px-4 py-2 text-sm tracking-wide transition-colors duration-200',
                      isActive ? 'text-champagne' : 'text-silver hover:text-frost',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <SessionBadge />

          <button
            type="button"
            className="cursor-pointer rounded-lg p-2 text-frost hover:bg-white/5 md:hidden"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </nav>

        {mobileOpen ? (
          <ul className="space-y-1 border-t border-white/5 bg-obsidian/95 px-5 py-3 backdrop-blur-xl md:hidden">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-xl px-4 py-3 text-sm tracking-wide',
                      isActive ? 'bg-champagne/5 text-champagne' : 'text-silver hover:bg-white/5 hover:text-frost',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li className="border-t border-white/5 pt-2">
              {user ? (
                <button
                  type="button"
                  onClick={async () => {
                    setMobileOpen(false);
                    await useAuthStore.getState().logout();
                    navigate('/');
                  }}
                  className="block w-full rounded-xl px-4 py-3 text-left text-sm text-silver hover:bg-white/5 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <LogOut className="size-4" aria-hidden /> Sign out ({user.name})
                  </span>
                </button>
              ) : (
                <div className="flex gap-2 px-2 pb-1">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 rounded-full border border-silver/30 px-4 py-2.5 text-center text-sm text-frost">
                    Sign in
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 rounded-full bg-champagne px-4 py-2.5 text-center text-sm font-semibold text-obsidian">
                    Register
                  </Link>
                </div>
              )}
            </li>
            {user?.role === 'ADMIN' ? (
              <li>
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-champagne">
                  Admin dashboard
                </Link>
              </li>
            ) : null}
          </ul>
        ) : null}
      </header>

      <main id="main" className="flex-1 pt-16">
        <Outlet />
      </main>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 text-xs text-silver/70 sm:flex-row lg:px-8">
          <p>© {new Date().getFullYear()} AVIORA — Premium Flight Reservation</p>
          <p className="uppercase tracking-[0.18em]">Development build · SQLite data layer</p>
        </div>
      </footer>
    </div>
  );
}
