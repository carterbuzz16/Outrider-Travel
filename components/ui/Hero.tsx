import Button from "./Button";
import HeroVideo from "./HeroVideo";
import Plate, { type PlateImage } from "./Plate";
import Stamp from "./Stamp";
import { cn } from "./cn";

/**
 * The opening screen.
 *
 * Typographic by default. With no photograph worth the full viewport, a hero
 * built on type and rules is stronger than a dark rectangle pretending to be a
 * picture: it commits to the mono display face, which is the most distinctive
 * thing the brand owns.
 *
 * Pass `image` when there is a photograph good enough to carry it. The type
 * then moves into a solid panel rather than sitting on a scrim, so contrast is
 * a property of the panel and never depends on what the picture is doing.
 *
 * Video is supported but muted, inline and loop-only, never with sound.
 */

export default function Hero({
  image,
  video,
  eyebrow,
  headline,
  tagline,
  cta,
  secondaryCta,
  stampText,
  className,
}: {
  image?: PlateImage | null;
  video?: { src: string; poster?: string } | null;
  eyebrow: string;
  headline: string;
  tagline: string;
  cta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** Ring text for the seal. Only drawn on the typographic version. */
  stampText?: string;
  className?: string;
}) {
  const hasMedia = Boolean(image || video);

  return (
    // <section>, not <header>: the nav already exposes a banner landmark.
    <section
      className={cn(
        "scheme-charcoal scheme-paint relative isolate flex min-h-[100svh] flex-col overflow-hidden",
        className,
      )}
      aria-labelledby="hero-headline"
    >
      {hasMedia && (
        <>
          <div className="absolute inset-0">
            {video ? (
              <HeroVideo src={video.src} poster={video.poster ?? ""} />
            ) : (
              <Plate image={image} fill mark={false} sizes="100vw" priority position="62% 44%" />
            )}
          </div>
          {/*
            One even wash over the whole frame, because the type is centred and
            can land anywhere in it. Tuned to the image actually in use rather
            than guessed: sampling the alpenglow photograph behind the headline
            and solving for cream at 4.5:1 gives 0.42, so 0.52 is used, which
            keeps a comfortable margin at other viewport shapes without the
            picture going flat.

            0.58, not 0.52: the headline only needs 0.20 and the CTAs 0.36, but
            the eyebrow sits in a brighter band of the frame and needs 0.55 at
            full cream. The small type is what sets this number.
          */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[rgb(26_26_26_/_0.58)]"
          />
          {/* A little extra at the very top, where the nav crosses bright sky. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[rgb(26_26_26_/_0.55)] to-transparent"
          />
        </>
      )}

      {/*
        With a photograph the type sits directly on it, centred, with no panel.
        Contrast is bought with a single even scrim rather than a box, which is
        why the scrim below is tuned against this specific image: see the note
        on the scrim element for the measured numbers.
      */}
      {hasMedia ? (
        <div className="shell relative flex flex-1 flex-col items-center justify-center gap-9 py-32 text-center">
          <p className="t-micro text-[--text]">{eyebrow}</p>

          <h1
            id="hero-headline"
            className="max-w-[16ch] font-display text-display-xl uppercase leading-[0.95] tracking-display text-[--text]"
          >
            {headline}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button href={cta.href} variant="primary" size="lg">
              {cta.label}
            </Button>
            {secondaryCta && (
              <Button href={secondaryCta.href} variant="secondary" size="lg">
                {secondaryCta.label}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="shell relative flex flex-1 flex-col justify-between pb-14 pt-32 md:pb-20 md:pt-40">
          <div>
            <p className="t-micro shrink-0 text-[--text-secondary]">{eyebrow}</p>
          </div>

          <div className="py-10 md:py-14">
            <h1
              id="hero-headline"
              className="font-display text-display-xl uppercase leading-[0.95] tracking-display text-[--text]"
            >
              {headline}
            </h1>
          </div>

          <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between md:gap-16">
            <div className="flex max-w-measure-tight flex-col gap-8">
              <p className="font-body text-lede leading-[1.7] text-[--text-secondary]">
                {tagline}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button href={cta.href} variant="primary" size="lg">
                  {cta.label}
                </Button>
                {secondaryCta && (
                  <Button href={secondaryCta.href} variant="secondary" size="lg">
                    {secondaryCta.label}
                  </Button>
                )}
              </div>
            </div>

            {stampText && (
              <Stamp
                text={stampText}
                className="hidden w-28 shrink-0 text-[--text-muted] lg:block"
              />
            )}
          </div>
        </div>
      )}

    </section>
  );
}
