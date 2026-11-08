'use client';
import { usePagedResource } from '../../lib/usePagedResource';
import Pagination from '../../components/Pagination';
export default function RewardsPage() {
  const history = usePagedResource('/submissions/rewards/mine');
  const rewards = history.data?.rewards || [];
  return (
    <div className="page-wrap">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR REWARD LEDGER</span>
          <h1>Every point, recorded.</h1>
          <p>Follow the points credited for each approved product check.</p>
        </div>
      </div>
      {history.error && (
        <div className="alert error" role="alert">
          {history.error}
        </div>
      )}
      <section className="content-card history-card">
        <div className="card-heading">
          <h2>Points history</h2>
          <span>{history.data?.pagination.total ?? 0} rewards</span>
        </div>
        {history.loading && !history.data ? (
          <p role="status">Loading rewards…</p>
        ) : rewards.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Date awarded</th>
                  <th>Reason</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward) => (
                  <tr key={reward._id}>
                    <td>
                      {reward.submissionId?.originalFileName || 'Product check'}
                    </td>
                    <td>{new Date(reward.createdAt).toLocaleDateString()}</td>
                    <td>{reward.reason}</td>
                    <td className="points-cell">+{reward.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <strong>No rewards yet</strong>
            <p>Your first approved product check will appear here.</p>
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
