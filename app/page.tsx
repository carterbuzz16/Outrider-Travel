import Image from "next/image";
import OutriderMark from "@/components/OutriderMark";
import OutriderWordmark from "@/components/OutriderWordmark";
import styles from "./page.module.css";

// The whole site, for now: one static, full-viewport hero. No nav, no links,
// no client JS — see page.module.css for how the layout maps onto the comp.
export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.brand}>
        <OutriderMark className={styles.mark} />
      </div>

      <div className={styles.photo}>
        <Image
          src="/brand/hero.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 48rem) 100vw, 50vw"
          className={styles.photoImage}
        />
        {/* The one piece of real text on the page, so it carries the h1. The
            mark opposite it is the same word in picture form, hence aria-hidden. */}
        <h1 className={styles.wordmark}>
          <span className="sr-only">Outrider</span>
          <OutriderWordmark />
        </h1>
      </div>
    </main>
  );
}
