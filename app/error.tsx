"use client";

// The raw error message is never shown: it can carry a database or Stripe
// message meant for us, not the traveler. The digest is safe to show and is
// what we need to find the failure in the logs.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <h1>That didn&rsquo;t load</h1>
      <p>
        Something broke on our end. Try again, and if it keeps happening, email bookings@outrider.travel
        and we&rsquo;ll sort it out.
      </p>
      {error.digest && <p>Reference: {error.digest}</p>}
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
