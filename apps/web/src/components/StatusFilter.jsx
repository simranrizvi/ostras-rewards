const statuses = [
  'pending_review',
  'processing',
  'approved',
  'rejected',
  'expired',
];
export default function StatusFilter({ value, onChange }) {
  return (
    <label className="status-filter">
      Filter by status
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All statuses</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status.replace('_', ' ')}
          </option>
        ))}
      </select>
    </label>
  );
}
