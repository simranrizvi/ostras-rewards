export default function Pagination({ meta, onChange, busy = false }) {
  if (!meta || meta.pages < 2) return null;
  return (
    <div className="pagination" aria-label="Pagination">
      <button
        className="button button-outline"
        disabled={busy || meta.page <= 1}
        onClick={() => onChange(meta.page - 1)}
      >
        Previous
      </button>
      <span>
        Page {meta.page} of {meta.pages} · {meta.total} records
      </span>
      <button
        className="button button-outline"
        disabled={busy || meta.page >= meta.pages}
        onClick={() => onChange(meta.page + 1)}
      >
        Next
      </button>
    </div>
  );
}
