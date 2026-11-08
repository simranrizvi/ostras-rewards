'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    zipCode: '',
    birthday: '',
    referralCode: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      router.replace('/dashboard');
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
            <i /> START EARNING
          </div>
          <h1>
            Good products.
            <br />
            <em>Good rewards.</em>
          </h1>
          <p>
            Create your Ostras account, share a product photo, and follow every
            check from your workspace.
          </p>
          <div className="auth-side-foot">
            Your details stay connected to your submissions.
          </div>
        </div>
      </aside>
      <section className="auth-main">
        <form className="auth-card register-card" onSubmit={submit}>
          <span className="eyebrow">JOIN OSTRAS</span>
          <h2>Create your account</h2>
          <p>It only takes a minute to get started.</p>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <div className="form-grid">
            <label className="span-two">
              Full name
              <input
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                placeholder="Your name"
              />
            </label>
            <label className="span-two">
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="span-two">
              Password
              <input
                type="password"
                minLength={10}
                required
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="At least 10 characters"
              />
            </label>
            <label>
              Phone <small>Optional</small>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="Phone number"
              />
            </label>
            <label>
              ZIP / postal code
              <input
                value={form.zipCode}
                onChange={(e) => update('zipCode', e.target.value)}
                placeholder="Postal code"
              />
            </label>
            <label>
              Birthday <small>Optional</small>
              <input
                type="date"
                value={form.birthday}
                onChange={(e) => update('birthday', e.target.value)}
              />
            </label>
            <label>
              Referral code <small>Optional</small>
              <input
                value={form.referralCode}
                onChange={(e) => update('referralCode', e.target.value)}
                placeholder="If you have one"
              />
            </label>
          </div>
          <button className="button button-dark button-wide" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'} <span>↗</span>
          </button>
          <div className="auth-switch">
            Already a member? <Link href="/login">Sign in</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
