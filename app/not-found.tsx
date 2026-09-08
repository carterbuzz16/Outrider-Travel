import Link from "next/link";
import { Button, Logo, SectionDivider, Stamp } from "@/components/ui";

/**
 * 404.
 *
 * Lives at the app root rather than inside (site) so it also catches bad URLs
 * under /bookings and /admin, which is why it carries its own minimal chrome
 * instead of inheriting the marketing nav and footer.
 */
export default function NotFound() {
  return (
    <main className="scheme-charcoal scheme-paint flex min-h-[100svh] flex-col">
      <div className="shell flex flex-1 flex-col justify-center py-20">
        <Link href="/" className="no-underline" aria-label="Outrider, home">
          <Logo variant="inline" className="text-[--text]" />
        </Link>

        <div className="mt-16 flex flex-col items-start gap-7">
          <span className="stamp-type text-[--text-muted]">Error 404</span>
          <h1 className="t-title max-w-[16ch] text-[--text]">
            This route hasn&rsquo;t been scouted
          </h1>
          <p className="t-lede max-w-measure-tight text-[--text-secondary]">
            The page you asked for is not here. It may have moved, or the
            departure may have closed.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button href="/trips" variant="primary" size="lg">
              View trips
            </Button>
            <Button href="/" variant="secondary" size="lg">
              Back to the start
            </Button>
          </div>
        </div>

        <SectionDivider variant="perforation" className="mt-16 max-w-sm" />

        <Stamp text="Outrider · Off route" className="mt-10 w-24 text-[--text-muted]" />
      </div>
    </main>
  );
}
