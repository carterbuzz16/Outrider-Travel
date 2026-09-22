import RoomPhotos, { type RoomPhoto } from "./RoomPhotos";
import { cn } from "./cn";
import { TAKEN_NOTE } from "./TierTable";
import { tierDisplayName } from "@/lib/tier-display";

/**
 * The rooms behind the packages, image-led.
 *
 * The owner's brief: for each tier, people should see the room they are
 * paying for, the penthouse above all. So the two shared-room packages sit
 * side by side at the same size (they are the same room, with four or with
 * two), and the top package gets the full width and the bigger type below
 * them, which is also the order the price climbs in. At the top are the two
 * penthouses, each its own package that one group books whole: they sit side
 * by side under one "The penthouse" heading, each with its own photographs,
 * numbers and standouts, so they read as one choice with two versions. A
 * penthouse another group has booked shows as taken. (A departure still on
 * the old single TOP package shows the same pair, without the choosing.)
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
  key: "BASE" | "MID" | "PENTHOUSE" | "TOP";
  title: string;
  summary: string;
  upgrade: string;
  figure: { value: string; unit: string };
  facts: { label: string; value: string }[];
  photos: RoomPhoto[];
  penthouses?: PenthouseView[];
  shared?: string;
};

/** Structurally the same as Penthouse in lib/room-media.ts. */
export type PenthouseView = {
  number: string;
  name: string;
  line: string;
  panel: string;
  stats: { value: string; label: string }[];
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
  /** A penthouse another group has booked whole. */
  taken?: boolean;
  room: RoomView;
};

const ORDER = { BASE: 0, MID: 1, PENTHOUSE: 2, TOP: 3 } as const;

/** The package promise for a penthouse, as on its checkout card. */
const WHOLE_PENTHOUSE = "Eight of you, the whole penthouse";

export default function RoomShowcase({
  rooms,
  className,
}: {
  rooms: ShowcaseRoom[];
  className?: string;
}) {
  if (rooms.length === 0) return null;
  const sorted = [...rooms].sort(
    (a, b) => ORDER[a.room.key] - ORDER[b.room.key] || a.tierName.localeCompare(b.tierName),
  );
  const shared = sorted.filter((r) => r.room.key === "BASE" || r.room.key === "MID");
  const choices = sorted.filter((r) => r.room.key === "PENTHOUSE");
  // The old single top package, only when the penthouses are not sold apart.
  const top = choices.length === 0 ? sorted.find((r) => r.room.key === "TOP") : undefined;

  return (
    <div className={cn("flex flex-col gap-16 md:gap-20", className)}>
      {shared.length > 0 && (
        <div className={cn("grid gap-14 md:gap-10", shared.length > 1 && "md:grid-cols-2")}>
          {shared.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      )}
      {choices.length > 0 && (
        <PenthouseGroup
          intro={
            // Not every departure has both (January has 702 only).
            choices.length > 1
              ? `${choices.length === 2 ? "Two" : "Several"} four-bedroom penthouses at The Peaks, one group of eight in each. Pick yours and nobody else sleeps there all week, and your group gets a full day on the mountain with private instructors.`
              : "A four-bedroom penthouse at The Peaks for one group of eight. Nobody else sleeps there all week, and your group gets a full day on the mountain with private instructors."
          }
          note="Each one goes to a single group. Once a group books it, it's theirs."
          shared={choices[0].room.shared}
          cards={choices.flatMap((r) =>
            (r.room.penthouses ?? []).map((penthouse) => ({
              penthouse,
              price: r.price,
              taken: r.taken,
            })),
          )}
        />
      )}
      {top && (
        <PenthouseGroup
          packageLine={<PackageLine tierName={top.tierName} price={top.price} />}
          intro={top.room.upgrade}
          note="There are two, 702 and 830, and each one goes to a single group."
          shared={top.room.shared}
          cards={(top.room.penthouses ?? []).map((penthouse) => ({ penthouse }))}
        />
      )}
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

type PenthouseCardData = {
  penthouse: PenthouseView;
  /** Per person, when each penthouse is its own package. */
  price?: string | null;
  taken?: boolean;
};

function PenthouseGroup({
  packageLine,
  intro,
  note,
  shared,
  cards,
}: {
  /** The old single TOP package names itself once, above the pair. */
  packageLine?: React.ReactNode;
  intro: string;
  note: string;
  shared?: string;
  cards: PenthouseCardData[];
}) {
  return (
    <article className="flex flex-col gap-12 border-t border-[--rule-strong] pt-10 md:gap-14 md:pt-14">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end lg:gap-14">
        <div className="flex flex-col gap-4">
          {packageLine}
          <h3 className="t-title text-[--text]">The penthouse</h3>
        </div>
        <div className="flex flex-col gap-4">
          <p className="max-w-measure font-body text-lede font-light leading-[1.6] text-[--text]">
            {intro}
          </p>
          <p className="max-w-measure font-body text-body-s leading-[1.7] text-[--text-secondary]">
            {note}
          </p>
        </div>
      </header>

      <div className={cn("grid gap-14 md:gap-10", cards.length > 1 && "md:grid-cols-2")}>
        {cards.map((card) => (
          <PenthouseCard key={card.penthouse.number} {...card} />
        ))}
      </div>

      {shared && (
        <p className="max-w-measure border-t border-[--rule] pt-5 font-body text-body-s leading-[1.7] text-[--text-secondary]">
          {shared}
        </p>
      )}
    </article>
  );
}

function PenthouseCard({ penthouse, price, taken = false }: PenthouseCardData) {
  return (
    <section className="flex flex-col gap-6" aria-label={penthouse.name}>
      <div className={cn("relative", taken && "opacity-60")}>
        {penthouse.photos.length > 0 ? (
          <RoomPhotos
            photos={penthouse.photos}
            title={penthouse.name}
            sizes="(min-width: 768px) 45vw, 100vw"
          />
        ) : (
          <RoomPanel
            room={{ title: penthouse.name, figure: { value: penthouse.number, unit: penthouse.panel } }}
            size="large"
          />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <p className="t-micro flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[--accent]">
          <span>{taken ? "Taken" : WHOLE_PENTHOUSE}</span>
          {price && !taken && (
            <span className="tabular-nums text-[--text-secondary]">{price} per person</span>
          )}
        </p>
        <h4 className="t-heading text-[--text]">{penthouse.name}</h4>
        <p className="max-w-measure font-body text-body leading-[1.75] text-[--text-secondary]">
          {penthouse.line}
        </p>
        {taken && (
          <p className="max-w-measure border-l-2 border-[--flag] pl-3 font-body text-body-s leading-[1.6] text-[--text]">
            {TAKEN_NOTE}
          </p>
        )}
      </div>
      <div>
        <dl className="m-0 grid grid-cols-4 border-t border-[--rule]">
          {penthouse.stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn("flex flex-col gap-1.5 py-4", i > 0 && "border-l border-[--rule] pl-3 sm:pl-4")}
            >
              <dt className="t-micro order-2 text-[--text-secondary]">{stat.label}</dt>
              <dd className="order-1 m-0 font-display text-display-s font-extrabold leading-none tabular-nums text-[--accent]">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
        <RoomFacts facts={penthouse.facts} />
      </div>
    </section>
  );
}

/* -- pieces ----------------------------------------------------------------------- */

function PackageLine({ tierName, price }: { tierName: string; price?: string | null }) {
  return (
    <p className="t-micro flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[--accent]">
      <span>{tierDisplayName(tierName)}</span>
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
          The Peaks Resort, Mountain Village
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
