import OutriderMark from "@/components/OutriderMark";
import OutriderWordmark from "@/components/OutriderWordmark";
import WaitlistForm from "@/components/WaitlistForm";
import styles from "./page.module.css";

const BADGE_TEXT = "COMING SOON · WINTER 2026 · TELLURIDE · ";

// The whole site, for now: one full-viewport panel. The only interactive
// thing on it is the waitlist form, which is the only client component.
export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.stack}>
        <OutriderMark className={styles.mark} />

        <h1 className={styles.wordmark}>
          <span className="sr-only">Outrider</span>
          <OutriderWordmark />
        </h1>

        <p className={styles.tagline}>Small groups. Well scouted. Coming soon.</p>

        <WaitlistForm />
      </div>

      <div className={styles.badge}>
        <svg
          viewBox="0 0 200 200"
          className={styles.badgeSpin}
          role="img"
          aria-label="Coming soon — Winter 2026, Telluride"
        >
          {/* Full circle, so the text wraps continuously as it rotates. */}
          <path
            id="badge-arc"
            d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"
            fill="none"
          />
          <text className={styles.badgeText}>
            <textPath href="#badge-arc" startOffset="0%">
              {BADGE_TEXT}
            </textPath>
          </text>
        </svg>
      </div>
    </main>
  );
}
