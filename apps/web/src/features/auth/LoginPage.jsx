'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      router.replace(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <aside className="auth-side">
        <Link className="brand-mark" href="/">
          ostr<span>as</span>
          <i>®</i>
        </Link>
        <div className="auth-pitch">
          <div className="eyebrow">
            <i /> PRODUCT REWARDS
          </div>
          <h1>
            A little check.
            <br />A little <em>extra.</em>
          </h1>
          <p>
            Sign in to see your submissions and the rewards you have earned.
          </p>
          <div className="auth-side-foot">
            Your Ostras account keeps everything in one place.
          </div>
        </div>
      </aside>
      <section className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Sign in to Ostras</h2>
          <p>Pick up where you left off.</p>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </label>
          <button className="button button-dark button-wide" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'} <span>↗</span>
          </button>
          <div className="auth-switch">
            New to Ostras? <Link href="/register">Create an account</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
