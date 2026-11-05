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
 *
 * Zemi Miches comes second, so the strip shows both places before it has moved
 * far, and the two places alternate from there.
 */

const PHOTOS = [
  { src: "/images/telluride/groomers.jpg", alt: "Telluride's brick Main Street and clock tower, a snow-covered peak rising straight up behind.", caption: "Main Street" },
  { src: "/images/spring/zemi-aerial.jpg", alt: "Zemi Miches from above: the pools and palm trees running down to a sandy beach, with a calm bay and green mountains behind.", caption: "Zemi Miches" },
  { src: "/images/telluride/gondola-night.jpg", alt: "A gondola cabin above the valley with the San Juans behind.", caption: "The free gondola" },
  { src: "/images/spring/zemi-sailing.jpg", alt: "A small catamaran with three people aboard on calm water, big clouds building over the bay.", caption: "Catamarans on the bay" },
  { src: "/images/telluride/apres.jpg", alt: "A skier in a pink jacket turning through deep powder among snow-loaded pines.", caption: "Knee-deep by lunch" },
  { src: "/images/people/friend-dinner-laughing.jpg", alt: "A young man in a mustard sweater laughing across a candlelit dinner table.", caption: "Main Street, 8 pm" },
  { src: "/images/telluride/town-christmas.jpg", alt: "Main Street at dusk through strings of big colored holiday bulbs, the mountains behind.", caption: "The town after dark" },
  { src: "/images/telluride/powder.jpg", alt: "Skiers on the sunny deck outside the old timber saloon at Gorrono Ranch, mid-mountain.", caption: "Gorrono Ranch" },
  { src: "/images/people/friends-fire-pit-night.jpg", alt: "Two friends in retro ski suits warming their hands over a fire pit as snow falls at night.", caption: "The end of the day" },
];

export default function PhotoStrip() {
  return (
    <div className="marquee overflow-hidden" role="region" aria-label="Photographs of Telluride and Zemi Miches">
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
