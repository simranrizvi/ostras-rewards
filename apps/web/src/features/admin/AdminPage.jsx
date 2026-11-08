'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../components/PortalLayout';
import { api } from '../../lib/api';
import { usePagedResource } from '../../lib/usePagedResource';
import Pagination from '../../components/Pagination';
import StatusFilter from '../../components/StatusFilter';

const dateField = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

export default function AdminPage() {
  const { user } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [points, setPoints] = useState('100');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const queue = usePagedResource('/submissions/admin/all');
  const refresh = useCallback(async () => {
    const stats = await api('/dashboard/admin');
    setSummary(stats);
    await queue.refresh();
  }, [queue.refresh]);
  useEffect(() => {
    if (queue.data) setSubmissions(queue.data.submissions);
  }, [queue.data]);
  useEffect(() => {
    if (queue.error) setError(queue.error);
  }, [queue.error]);
  useEffect(() => {
    if (user?.role && user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    refresh().catch((e) => setError(e.message));
  }, [user, router, refresh]);
  async function review(decision) {
    if (!selected) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await api(`/submissions/admin/${selected._id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          note,
          ...(decision === 'approve'
            ? { expiryDate, points: Number(points) }
            : {}),
        }),
      });
      const approved = result.submission?.status === 'approved';
      setMessage(
        decision === 'reject'
          ? 'Submission rejected.'
          : approved
            ? 'Submission approved and points credited to its owner.'
            : 'The product is expired, so no points were awarded.',
      );
      setSelected(null);
      setExpiryDate('');
      setNote('');
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const pendingCount =
    summary?.statuses
      ?.filter((item) => ['pending_review', 'processing'].includes(item._id))
      .reduce((total, item) => total + item.count, 0) ?? 0;
  return (
    <div className="page-wrap admin-page">
      <div className="page-title">
        <div>
          <span className="eyebrow">OSTRAS ADMIN</span>
          <h1>Review product checks.</h1>
          <p>
            Check unclear dates and keep each decision linked to its uploader.
          </p>
        </div>
        <span className="admin-tag">ADMIN WORKSPACE</span>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="alert success" role="status">
          {message}
        </div>
      )}
      <div className="stat-grid admin-stats">
        <article className="stat-card">
          <small>REGISTERED MEMBERS</small>
          <strong>{summary?.users ?? '—'}</strong>
        </article>
        <article className="stat-card">
          <small>TOTAL SUBMISSIONS</small>
          <strong>{summary?.submissions ?? '—'}</strong>
        </article>
        <article className="stat-card">
          <small>POINTS AWARDED</small>
          <strong>{summary?.pointsIssued ?? '—'}</strong>
        </article>
        <article className="stat-card">
          <small>NEEDS REVIEW</small>
          <strong>{pendingCount}</strong>
        </article>
      </div>
      <div className="admin-layout">
        <section className="content-card admin-queue">
          <div className="card-heading">
            <div>
              <span className="eyebrow">REVIEW QUEUE</span>
              <h2>Submissions to check</h2>
              <StatusFilter
                value={queue.status}
                onChange={(value) => {
                  setSelected(null);
                  queue.setStatus(value);
                }}
              />
            </div>
            <button
              className="text-button"
              onClick={() => refresh().catch((e) => setError(e.message))}
            >
              Refresh ↻
            </button>
          </div>
          {submissions.length ? (
            <div className="review-list">
              {submissions.map((item) => (
                <button
                  className={`review-row ${selected?._id === item._id ? 'selected' : ''}`}
                  key={item._id}
                  onClick={() => {
                    setSelected(item);
                    setExpiryDate(dateField(item.expiryDate));
                    setNote(item.reviewNote || '');
                  }}
                >
                  <img src={item.imageUrl} alt="Submitted product" />
                  <span className="review-user">
                    <strong>{item.userId?.fullName || 'Member'}</strong>
                    <small>{item.userId?.email || '—'}</small>
                  </span>
                  <span className={`status-tag ${item.status}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-inline">
              <strong>No submissions yet</strong>
            </div>
          )}
          <Pagination
            meta={queue.data?.pagination}
            onChange={(value) => {
              setSelected(null);
              queue.setPage(value);
            }}
            busy={queue.loading}
          />
        </section>
        <section className="content-card review-detail">
          <span className="eyebrow">SUBMISSION DETAIL</span>
          {selected ? (
            <>
              <img
                className="detail-photo"
                src={selected.imageUrl}
                alt="Product submitted for expiry verification"
              />
              <div className="detail-owner">
                <strong>{selected.userId?.fullName}</strong>
                <small>{selected.userId?.email}</small>
              </div>
              <div className="detail-meta">
                <span>Uploaded</span>
                <b>{new Date(selected.createdAt).toLocaleString()}</b>
              </div>
              <label>
                Expiry date visible on product
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </label>
              <label>
                Reward points
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                />
              </label>
              <label>
                Review note
                <textarea
                  rows="2"
                  maxLength="500"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note"
                />
              </label>
              {['pending_review', 'processing'].includes(selected.status) ? (
                <div className="review-actions">
                  <button
                    className="button button-outline"
                    disabled={busy}
                    onClick={() => review('reject')}
                  >
                    Reject
                  </button>
                  <button
                    className="button button-dark"
                    disabled={busy || !expiryDate}
                    onClick={() => review('approve')}
                  >
                    {busy ? 'Saving…' : 'Approve & award points'}
                  </button>
                </div>
              ) : (
                <div className="rule-callout">
                  This submission has already been reviewed:{' '}
                  <strong>{selected.status}</strong>.
                </div>
              )}
            </>
          ) : (
            <div className="empty-state detail-empty">
              <span>⌑</span>
              <strong>Select a submission</strong>
              <p>Review the product image and verify its expiry date.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
