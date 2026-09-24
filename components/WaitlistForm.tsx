"use client";

import WaitlistFields from "@/components/ui/WaitlistFields";
import { useWaitlistSignup } from "@/components/ui/useWaitlistSignup";
import styles from "@/app/coming-soon/page.module.css";

/**
 * The coming-soon panel's form.
 *
 * It used to be a hand-built email line with its own copy of the submit logic,
 * which is how it came to send no placement and no campaign tags. It now runs
 * the same hook and the same fields as every other form, so a signup here is
 * stored exactly like one from /waitlist. The panel is espresso, so the
 * fields take the espresso scheme's tokens; `styles.form` keeps its width and
 * its place in the entrance stagger.
 */
export default function WaitlistForm() {
  const signup = useWaitlistSignup("coming-soon");

  if (signup.status === "done") {
    return (
      <p className={styles.status} role="status" aria-live="polite">
        You&rsquo;re on the list.
      </p>
    );
  }

  return (
    <div className={`scheme-espresso ${styles.form}`}>
      <WaitlistFields signup={signup} tone="dark" />
    </div>
  );
}
