import Plate, { type PlateImage } from "./Plate";
import { cn } from "./cn";

/**
 * A value proposition as an editorial spread: one picture, one column of type,
 * sides alternating down the page. This is the deliberate alternative to a row
 * of icons in cards — the layout most sites reach for and the one that makes
 * four different claims look like the same claim four times.
 *
 * No numbering. These are four separate claims, not four steps, and numbering
 * things that are not a sequence is decoration pretending to be structure.
 */

export default function EditorialPair({
  index,
  eyebrow,
  title,
  body,
  image,
  className,
}: {
  /** Zero-based, and used only to alternate which side the picture sits on. */
  index: number;
  eyebrow: string;
  title: string;
  body: string;
  image?: PlateImage | null;
  className?: string;
}) {
  const pictureRight = index % 2 === 1;

  return (
    <article
      className={cn(
        "grid items-center gap-8 md:grid-cols-2 md:gap-14",
        className,
      )}
    >
      <Plate
        image={image}
        ratio="aspect-[5/4]"
        sizes="(min-width: 768px) 50vw, 100vw"
        // order, not grid-flow: the picture stays first in the DOM so the
        // reading order on a phone is always picture then text.
        className={cn(pictureRight && "md:order-2")}
      />

      <div className={cn("flex flex-col gap-4", pictureRight && "md:order-1")}>
        <p className="t-micro text-[--text-secondary]">{eyebrow}</p>

        <h3 className="t-subheading text-[--text]">{title}</h3>

        <p className="font-body text-body leading-[1.75] text-[--text-secondary]">
          {body}
        </p>
      </div>
    </article>
  );
}
