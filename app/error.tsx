"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="access-page">
      <h1>Something went wrong.</h1>
      <p>We couldn’t load this page. Please try again.</p>
      <button className="button button-orange" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
