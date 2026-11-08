'use client';
export default function PortalError({ reset }) {
  return (
    <section className="content-card">
      <h1>We could not load this page.</h1>
      <p>Please try again.</p>
      <button className="button button-dark" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
