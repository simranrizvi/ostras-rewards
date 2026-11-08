'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const SessionContext = createContext(null);
export const useSession = () => useContext(SessionContext);

const nav = [
  { href: '/dashboard', label: 'Overview', icon: '◫' },
  { href: '/submissions', label: 'My submissions', icon: '▧' },
  { href: '/rewards', label: 'Reward ledger', icon: '✦' },
];

export default function PortalLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [sessionError, setSessionError] = useState('');
  async function loadSession() {
    setLoading(true);
    setSessionError('');
    try {
      const result = await api('/auth/me');
      setUser(result.user);
    } catch (error) {
      if (error.status === 401) router.replace('/login');
      else setSessionError(error.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadSession();
  }, []);
  useEffect(() => {
    const onExpired = () => router.replace('/login');
    window.addEventListener('ostras:unauthorized', onExpired);
    return () => window.removeEventListener('ostras:unauthorized', onExpired);
  }, [router]);
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
      router.replace('/login');
    } catch (error) {
      setSessionError(error.message);
    }
  }
  if (sessionError && !user)
    return (
      <div className="screen-loading" role="alert">
        <p>{sessionError}</p>
        <button className="button button-dark" onClick={loadSession}>
          Try again
        </button>
      </div>
    );
  if (loading || !user)
    return (
      <div className="screen-loading">
        <span className="spinner" /> Loading your Ostras workspace…
      </div>
    );
  return (
    <SessionContext.Provider value={{ user, setUser }}>
      <div className="portal-shell">
        <aside className="sidebar">
          <Link className="brand-mark" href="/dashboard">
            ostr<span>as</span>
            <i>®</i>
          </Link>
          <div className="workspace-label">YOUR WORKSPACE</div>
          <nav>
            {nav.map((item) => (
              <Link
                key={item.href}
                className={`side-link ${pathname === item.href ? 'active' : ''}`}
                href={item.href}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            {user.role === 'admin' && (
              <Link
                className={`side-link ${pathname.startsWith('/admin') ? 'active' : ''}`}
                href="/admin"
              >
                <span>⌑</span>Admin review
              </Link>
            )}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-tip">
              <span>✦</span>
              <div>
                <strong>Earn with every check</strong>
                <small>Upload a product photo to begin.</small>
              </div>
            </div>
            <button className="logout-button" onClick={logout}>
              <span>↪</span>Sign out
            </button>
          </div>
        </aside>
        <div className="portal-main">
          <header className="portal-topbar">
            <div>
              <span className="crumb">Ostras /</span>{' '}
              {pathname.includes('submissions')
                ? 'My submissions'
                : pathname.includes('admin')
                  ? 'Admin review'
                  : pathname.includes('rewards')
                    ? 'Reward ledger'
                    : 'Overview'}
            </div>
            <div className="top-user">
              <span className="online-dot" />
              <span>{user.fullName}</span>
              <b>{user.fullName?.[0]?.toUpperCase()}</b>
            </div>
          </header>
          <main className="portal-content">
            {sessionError && (
              <div className="alert error" role="alert">
                {sessionError}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </SessionContext.Provider>
  );
}
