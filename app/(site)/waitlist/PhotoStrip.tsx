import Image from "next/image";

/**
 * A slow, endless strip of the place.
 *
 * The set is rendered twice so the CSS loop has no seam (see .marquee-track in
 * globals.css); the second copy is hidden from assistive tech so the
 * photographs are only described once. Hovering pauses it, and reduced motion
 * turns it into an ordinary strip you can scroll sideways.
 *
 * Alt text follows the Destinations page, which was written by looking at the
 * photographs: the filenames in public/images/telluride do not match what is in
 * them.
 */

const PHOTOS = [
  { src: "/images/telluride/groomers.jpg", alt: "Telluride's brick main street with the peaks standing behind it.", caption: "Main street" },
  { src: "/images/telluride/gondola-night.jpg", alt: "A gondola cabin above the valley with the San Juans behind.", caption: "The free gondola" },
  { src: "/images/telluride/apres.jpg", alt: "A skier turning through deep snow, spray thrown up behind.", caption: "330 inches a year" },
  { src: "/images/telluride/dining.jpg", alt: "A stone terrace set with fire tables and lanterns at dusk.", caption: "Dinner, arranged" },
  { src: "/images/telluride/town-christmas.jpg", alt: "Main street at night under strung lights, the mountain behind.", caption: "The town after dark" },
  { src: "/images/telluride/powder.jpg", alt: "A timber hut mid-mountain with people out on the deck.", caption: "Mid-mountain" },
  { src: "/images/telluride/tomboy.jpg", alt: "Wine and a board of food set out by a fire.", caption: "The end of the day" },
];

export default function PhotoStrip() {
  return (
    <div className="marquee overflow-hidden" role="region" aria-label="Photographs of Telluride">
      <ul className="marquee-track m-0 list-none gap-4 p-0 md:gap-6">
        {[0, 1].map((copy) =>
          PHOTOS.map((photo) => (
            <li
              key={`${copy}-${photo.src}`}
              aria-hidden={copy === 1 || undefined}
              className="group w-[68vw] shrink-0 sm:w-[42vw] lg:w-[30vw] xl:w-[26rem]"
            >
              <figure className="m-0">
                <div className="relative aspect-[4/5] overflow-hidden bg-[--surface-inset]">
                  <Image
                    src={photo.src}
                    alt={copy === 1 ? "" : photo.alt}
                    fill
                    sizes="(min-width: 1280px) 26rem, (min-width: 1024px) 30vw, (min-width: 640px) 42vw, 68vw"
                    className="object-cover transition-transform duration-slow ease-out group-hover:scale-[1.04]"
                  />
                </div>
                <figcaption className="t-micro mt-3 text-[--text-muted]">{photo.caption}</figcaption>
              </figure>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
