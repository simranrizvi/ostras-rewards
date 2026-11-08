'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useSession } from '../../components/PortalLayout';

const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value))
    : '—';

export default function DashboardPage() {
  const { user } = useSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/dashboard/me')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="page-wrap">
      <section className="welcome-card">
        <div className="welcome-text">
          <span className="eyebrow">YOUR OSTRAS ACCOUNT</span>
          <h1>Good to see you, {user?.fullName?.split(' ')[0]}.</h1>
          <p>Make a product check and follow your points from here.</p>
          <Link className="button button-light" href="/submissions">
            Upload a product photo <span>↗</span>
          </Link>
        </div>
        <div className="welcome-medallion">
          <div>
            <span>✦</span>
            <small>
              YOUR
              <br />
              REWARDS
            </small>
          </div>
        </div>
        <div className="welcome-bottom">
          <span>
            <i /> Account active
          </span>
          <span>Product checks made rewarding</span>
        </div>
      </section>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <div className="stat-grid">
        <article className="stat-card">
          <span className="stat-icon green">✦</span>
          <small>AVAILABLE POINTS</small>
          <strong>{data?.points ?? '—'}</strong>
          <span className="stat-foot">From approved product checks</span>
        </article>
        <article className="stat-card">
          <span className="stat-icon blue">▧</span>
          <small>PHOTO SUBMISSIONS</small>
          <strong>{data?.submissionCount ?? '—'}</strong>
          <span className="stat-foot">Your total uploads</span>
        </article>
        <article className="stat-card">
          <span className="stat-icon gold">◷</span>
          <small>IN REVIEW</small>
          <strong>{data?.pendingCount ?? '—'}</strong>
          <span className="stat-foot">Waiting for a date check</span>
        </article>
      </div>
      <div className="dashboard-lower">
        <section className="content-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">RECENT ACTIVITY</span>
              <h2>Your submissions</h2>
            </div>
            <Link href="/submissions">View all ↗</Link>
          </div>
          {data?.recentSubmissions?.length ? (
            <div className="activity-list">
              {data.recentSubmissions.map((item) => (
                <article className="activity-row" key={item._id}>
                  <div className="activity-thumb">
                    <img src={item.imageUrl} alt="Submitted product" />
                  </div>
                  <div className="activity-copy">
                    <strong>{item.originalFileName}</strong>
                    <span>
                      {item.expiryDate
                        ? `Expiry ${dateLabel(item.expiryDate)}`
                        : 'Expiry date being checked'}
                    </span>
                  </div>
                  <span className={`status-tag ${item.status}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                  <b className="activity-points">
                    {item.pointsAwarded ? `+${item.pointsAwarded}` : '—'}
                  </b>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span>▧</span>
              <strong>Your first product check starts here.</strong>
              <p>
                Upload a clear photo showing the expiry date to create a
                submission.
              </p>
              <Link className="button button-dark" href="/submissions">
                Upload a photo ↗
              </Link>
            </div>
          )}
        </section>
        <aside className="content-card how-card">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>From photo to points.</h2>
          <ol>
            <li>
              <b>1</b>
              <span>
                <strong>Upload a product photo</strong>
                <small>Make sure the expiry date is visible.</small>
              </span>
            </li>
            <li>
              <b>2</b>
              <span>
                <strong>Ostras checks the date</strong>
                <small>Unclear photos go to admin review.</small>
              </span>
            </li>
            <li>
              <b>3</b>
              <span>
                <strong>Get points if it is valid</strong>
                <small>Approved rewards are tied to your account.</small>
              </span>
            </li>
          </ol>
          <div className="safe-note">
            ✦ One photo, one review, one clear record.
          </div>
        </aside>
      </div>
    </div>
  );
}
