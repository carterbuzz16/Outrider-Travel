import RoomPhotos, { type RoomPhoto } from "./RoomPhotos";
import { cn } from "./cn";

/**
 * The rooms behind the packages, image-led.
 *
 * The owner's brief: for each tier, people should see the room they are
 * paying for, the penthouse above all. So the two shared-room packages sit
 * side by side at the same size (they are the same room, with four or with
 * two), and the top package gets the full width and the bigger type below
 * them, which is also the order the price climbs in.
 *
 * Photographs come from lib/room-media.ts, which only returns files that
 * exist. Until a package has any, it gets RoomPanel: the room stated as type
 * on a deep espresso ground (how many to a room, the beds, where), sized
 * exactly as the photograph will be so the layout does not move when the
 * pictures arrive. Deliberately not a grey box or a stock image: a panel that
 * says something true reads as designed, an empty frame reads as broken.
 *
 * Presentational and scheme-aware: it works on paper or inside an espresso
 * section. The data is resolved by the page (server-side, for the fs check).
 */

/** Structurally the same as RoomMedia in lib/room-media.ts, which is server-only. */
export type RoomView = {
  key: "BASE" | "MID" | "TOP";
  title: string;
  summary: string;
  upgrade: string;
  figure: { value: string; unit: string };
  facts: { label: string; value: string }[];
  photos: RoomPhoto[];
};

export type ShowcaseRoom = {
  /** The tier id, for keys. */
  id: string;
  /** The package's name as the team set it in /admin. */
  tierName: string;
  /** Formatted, per person. Omitted where the page cannot show prices yet. */
  price?: string | null;
  room: RoomView;
};

const ORDER = { BASE: 0, MID: 1, TOP: 2 } as const;

export default function RoomShowcase({
  rooms,
  className,
}: {
  rooms: ShowcaseRoom[];
  className?: string;
}) {
  if (rooms.length === 0) return null;
  const sorted = [...rooms].sort((a, b) => ORDER[a.room.key] - ORDER[b.room.key]);
  const shared = sorted.filter((r) => r.room.key !== "TOP");
  const feature = sorted.filter((r) => r.room.key === "TOP");

  return (
    <div className={cn("flex flex-col gap-16 md:gap-20", className)}>
      {shared.length > 0 && (
        <div className={cn("grid gap-14 md:gap-10", shared.length > 1 && "md:grid-cols-2")}>
          {shared.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      )}
      {feature.map((r) => (
        <FeatureRoom key={r.id} room={r} />
      ))}
    </div>
  );
}

/* -- the shared rooms --------------------------------------------------------- */

function RoomCard({ room: { tierName, price, room } }: { room: ShowcaseRoom }) {
  return (
    <article className="flex flex-col gap-6">
      {room.photos.length > 0 ? (
        <RoomPhotos
          photos={room.photos}
          title={room.title}
          sizes="(min-width: 768px) 45vw, 100vw"
        />
      ) : (
        <RoomPanel room={room} />
      )}
      <div className="flex flex-col gap-3">
        <PackageLine tierName={tierName} price={price} />
        <h3 className="t-subheading text-[--text]">{room.title}</h3>
        <p className="max-w-measure font-body text-body leading-[1.75] text-[--text-secondary]">
          {room.upgrade}
        </p>
      </div>
      <RoomFacts facts={room.facts} />
    </article>
  );
}

/* -- the penthouse -------------------------------------------------------------- */

function FeatureRoom({ room: { tierName, price, room } }: { room: ShowcaseRoom }) {
  return (
    <article className="grid gap-8 border-t border-[--rule-strong] pt-10 md:pt-14 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-14">
      {room.photos.length > 0 ? (
        <RoomPhotos
          photos={room.photos}
          title={room.title}
          sizes="(min-width: 1024px) 58vw, 100vw"
          maxThumbs={4}
        />
      ) : (
        <RoomPanel room={room} size="large" />
      )}
      <div className="flex flex-col gap-5 lg:pt-2">
        <PackageLine tierName={tierName} price={price} />
        <h3 className="t-title text-[--text]">{room.title}</h3>
        <p className="max-w-measure font-body text-lede font-light leading-[1.6] text-[--text]">
          {room.upgrade}
        </p>
        <RoomFacts facts={room.facts} className="mt-3" />
      </div>
    </article>
  );
}

/* -- pieces ----------------------------------------------------------------------- */

function PackageLine({ tierName, price }: { tierName: string; price?: string | null }) {
  return (
    <p className="t-micro flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[--accent]">
      <span>{tierName}</span>
      {price && (
        <span className="tabular-nums text-[--text-secondary]">
          {price} per person
        </span>
      )}
    </p>
  );
}

function RoomFacts({ facts, className }: { facts: RoomView["facts"]; className?: string }) {
  return (
    <dl className={cn("m-0 flex flex-col border-t border-[--rule]", className)}>
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 border-b border-[--rule] py-3"
        >
          <dt className="t-micro pt-[0.2rem] text-[--text-secondary]">{fact.label}</dt>
          <dd className="m-0 font-body text-body-s leading-[1.6] text-[--text]">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The room as type, while there is no photograph. Espresso-deep in every
 * context (its own scheme), at the photograph's own 3:2 (a shorter strip on
 * a phone's checkout card), with the one number
 * that tells these rooms apart set large: how many of you share it.
 *
 * Sizes: `large` for the penthouse, `standard` in the showcase, `card` on a
 * checkout package card, `thumb` in the order summary.
 */
const PANEL_SIZE = {
  large: { box: "aspect-[3/2] p-5 sm:p-7", figure: "text-display-xl", unit: "mt-3", place: true },
  standard: { box: "aspect-[3/2] p-5 sm:p-7", figure: "text-display-l", unit: "mt-3", place: true },
  // A short strip on a phone, where three full 3:2 panels would be a wall of
  // espresso; beside the text from sm up, as tall as the card.
  card: { box: "aspect-[5/2] p-4 sm:aspect-auto sm:h-full sm:min-h-[9rem]", figure: "text-display-m", unit: "mt-1.5", place: false },
  thumb: { box: "aspect-[3/2] p-2.5", figure: "text-display-s", unit: "mt-1", place: false },
} as const;

export function RoomPanel({
  room,
  size = "standard",
  className,
}: {
  room: Pick<RoomView, "figure" | "title">;
  size?: keyof typeof PANEL_SIZE;
  className?: string;
}) {
  const s = PANEL_SIZE[size];
  return (
    <div
      className={cn(
        "scheme-espresso relative flex w-full flex-col justify-between overflow-hidden bg-[--surface-inset] text-[--text]",
        s.box,
        className,
      )}
      role="img"
      aria-label={`${room.title}: ${room.figure.value} ${room.figure.unit}`}
    >
      {s.place ? (
        <p className="t-micro text-[--text-secondary]" aria-hidden="true">
          The Peaks Resort · Mountain Village
        </p>
      ) : (
        <span aria-hidden="true" />
      )}
      <div aria-hidden="true" className={cn(s.place && "border-t border-[--rule] pt-4")}>
        <p
          className={cn(
            "font-display font-extrabold uppercase leading-[0.9] tracking-display tabular-nums text-[--accent]",
            s.figure,
          )}
        >
          {room.figure.value}
        </p>
        <p className={cn("t-micro text-[--text]", s.unit)}>{room.figure.unit}</p>
      </div>
    </div>
  );
}
