"use client";

import { useId, useState } from "react";
import { joinWaitlist } from "@/app/waitlist-actions";
import styles from "@/app/page.module.css";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (!value || busy) return;

    setBusy(true);
    setStatus("");
    try {
      const result = await joinWaitlist(value);
      if (result.ok) {
        setEmail("");
        setStatus("You're on the list.");
      } else {
        setStatus(result.message);
      }
    } catch {
      // Network-level failure — the action itself returns errors rather than
      // throwing, so this is a lost connection, not a rejected signup.
      setStatus("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.field}>
        <label className="sr-only" htmlFor={inputId}>
          Email address
        </label>
        <input
          id={inputId}
          className={styles.input}
          type="email"
          name="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setStatus("");
          }}
          placeholder="EMAIL"
          autoComplete="email"
          required
          disabled={busy}
        />
        <button className={styles.submit} type="submit" disabled={busy}>
          {busy ? "Sending" : "Join the list"}
        </button>
      </div>
      {/* Reserves its own line height so submitting doesn't shift the form. */}
      <p className={styles.status} role="status" aria-live="polite">
        {status}
      </p>
    </form>
  );
}
