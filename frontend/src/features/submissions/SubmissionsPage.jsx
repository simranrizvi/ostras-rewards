'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { photoUrl } from '../../lib/photo';
import { usePagedResource } from '../../lib/usePagedResource';
import Pagination from '../../components/Pagination';
import StatusFilter from '../../components/StatusFilter';

const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(value))
    : 'Not detected';

export default function SubmissionsPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [points, setPoints] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const history = usePagedResource('/submissions/mine', { poll: true });
  const refresh = history.refresh;
  useEffect(() => {
    if (history.data) {
      setSubmissions(history.data.submissions);
      setPoints(history.data.points);
    }
  }, [history.data]);
  useEffect(() => {
    if (history.error) setError(history.error);
  }, [history.error]);
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function choosePhoto(event) {
    const next = event.target.files?.[0] || null;
    setError('');
    setMessage('');
    if (
      next &&
      !['image/jpeg', 'image/png', 'image/webp'].includes(next.type)
    ) {
      setError('Choose a JPG, PNG, or WEBP photo.');
      event.target.value = '';
      setFile(null);
      return;
    }
    if (
      next &&
      next.size > (history.data?.limits?.maxUploadMb || 8) * 1024 * 1024
    ) {
      setError(
        `Photo must be ${history.data?.limits?.maxUploadMb || 8} MB or smaller.`,
      );
      event.target.value = '';
      setFile(null);
      return;
    }
    setFile(next);
  }
  async function submit(event) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      form.append('image', file);
      const result = await api('/submissions/upload', {
        method: 'POST',
        body: form,
      });
      setMessage(result.message);
      setFile(null);
      setPreview('');
      event.target.reset();
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-wrap">
      <div className="page-title">
        <div>
          <span className="eyebrow">PHOTO SUBMISSIONS</span>
          <h1>Make a product check.</h1>
          <p>
            Upload a clear photo where the product and expiry date are easy to
            read.
          </p>
        </div>
        <div className="points-chip">
          <span>✦</span>
          <div>
            <small>YOUR POINTS</small>
            <strong>{points}</strong>
          </div>
        </div>
      </div>
      <div className="submission-layout">
        <section className="content-card upload-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">NEW CHECK</span>
              <h2>Upload your product photo</h2>
            </div>
            <span className="step-counter">01 / 01</span>
          </div>
          <form onSubmit={submit}>
            <label className={`dropzone ${preview ? 'has-preview' : ''}`}>
              {preview ? (
                <>
                  <img src={preview} alt="Selected product preview" />
                  <span className="change-photo">Choose a different photo</span>
                </>
              ) : (
                <>
                  <span className="upload-icon">↑</span>
                  <strong>Choose a product photo</strong>
                  <small>
                    JPG, PNG, or WEBP · Up to{' '}
                    {history.data?.limits?.maxUploadMb || 8} MB
                  </small>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={choosePhoto}
              />
            </label>
            <div className="photo-guidance">
              <span>✓</span>
              <p>
                Use good lighting and keep the printed expiry date in focus.
                Blurry or unreadable dates will be sent for manual review.
              </p>
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
            <button
              className="button button-dark button-wide"
              disabled={!file || busy}
            >
              {busy ? (
                <>
                  <span className="spinner-light" /> Uploading and checking…
                </>
              ) : (
                <>
                  Submit for date check <span>↗</span>
                </>
              )}
            </button>
          </form>
        </section>
        <aside className="content-card reward-rules">
          <span className="eyebrow">REWARD CHECK</span>
          <h2>What happens next?</h2>
          <div className="rule-item">
            <b>1</b>
            <span>
              <strong>Photo review</strong>
              <small>We read the product expiry date from your image.</small>
            </span>
          </div>
          <div className="rule-item">
            <b>2</b>
            <span>
              <strong>Date comparison</strong>
              <small>Your product expiry date is checked against today.</small>
            </span>
          </div>
          <div className="rule-item">
            <b>3</b>
            <span>
              <strong>Points update</strong>
              <small>If valid, the reward is added to your account.</small>
            </span>
          </div>
          <div className="rule-callout">
            If the date is difficult to read, an admin can review your
            submission.
          </div>
        </aside>
      </div>
      <section className="content-card history-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">YOUR HISTORY</span>
            <h2>All submissions</h2>
            <StatusFilter value={history.status} onChange={history.setStatus} />
          </div>
          <span className="history-count">
            {history.data?.pagination?.total ?? 0} total
          </span>
        </div>
        {history.loading && !history.data ? (
          <p role="status">Loading submissions…</p>
        ) : submissions.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product photo</th>
                  <th>Submitted</th>
                  <th>Expiry date</th>
                  <th>Status</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="submission-product">
                        <img
                          src={photoUrl(item.imageUrl)}
                          alt="Submitted product"
                        />
                        <span>
                          <strong>{item.originalFileName}</strong>
                          <small>
                            {item.reviewNote || 'Product photo submission'}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>{dateLabel(item.createdAt)}</td>
                    <td>{dateLabel(item.expiryDate)}</td>
                    <td>
                      <span className={`status-tag ${item.status}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="points-cell">
                      {item.pointsAwarded ? `+${item.pointsAwarded}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <span>▧</span>
            <strong>No product photos yet</strong>
            <p>Your uploads and date-check results will appear here.</p>
          </div>
        )}
        <Pagination
          meta={history.data?.pagination}
          onChange={history.setPage}
          busy={history.loading}
        />
      </section>
    </div>
  );
}
