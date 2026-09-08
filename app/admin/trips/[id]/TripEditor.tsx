import Link from "next/link";
import { Alert, Button, Input, Textarea } from "@/components/ui";
import { formatDateRange, formatPrice, nightCount } from "@/lib/trips";
import {
  setTripStatus,
  updateTrip,
  deleteTrip,
  deleteTier,
  addTier,
  uploadTripImage,
  removeTripImage,
} from "@/app/admin/trips/actions";
import {
  AdminField,
  DetailRow,
  EmptyState,
  Fill,
  PageHeader,
  Panel,
  StatusChoice,
  TRIP_STATUS_META,
  Table,
  TableScroll,
  Td,
  Th,
  TripStatusBadge,
  countHeld,
  totalCapacity,
  type BookingStatus,
  type TripStatus,
} from "@/app/admin/admin-ui";

/**
 * The trip editor, with no data access in it.
 *
 * Split from page.tsx the same way BookingsView is, so every state Carter can
 * land in — a published trip with no tiers, a departure that is full, a trip
 * with no photos, a failed delete — can be rendered from fixtures without
 * standing up a session and a database row for each one.
 *
 * Still a Server Component: everything interactive is a form posting one of
 * the actions in ../actions.ts, so nothing here hydrates.
 */

export type EditorTier = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  max_capacity: number | null;
  inclusions: string[] | null;
  bookings: { id: string; status: BookingStatus }[];
};

export type EditorTrip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  description: string | null;
  logistics: string | null;
  status: TripStatus;
  images: string[];
  tiers: EditorTier[];
};

export default function TripEditor({ trip, error }: { trip: EditorTrip; error?: string }) {
  // Cheapest first: that is the order the tiers appear in on the public page,
  // so the editor reads the same way round.
  const tiers = [...(trip.tiers ?? [])].sort((a, b) => Number(a.price) - Number(b.price));
  const capacity = totalCapacity(tiers);
  const held = tiers.reduce((sum, tier) => sum + countHeld(tier.bookings ?? []), 0);
  const isPublished = trip.status === "published";

  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow={trip.destination}
        title={trip.name}
        back={{ href: "/admin/trips", label: "Trips" }}
        actions={
          <>
            <TripStatusBadge status={trip.status} />
            {isPublished && (
              <Button href={`/trips/${trip.id}`} variant="secondary" size="sm">
                View public page
              </Button>
            )}
          </>
        }
      />

      {error && (
        <div className="mt-6">
          <Alert tone="error" title="That did not go through">
            {error}
          </Alert>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
        <Summary label="Dates" value={formatDateRange(trip.start_date, trip.end_date)} />
        <Summary
          label="Length"
          value={`${nightCount(trip.start_date, trip.end_date)} nights`}
        />
        <Summary label="Tiers" value={String(tiers.length)} />
        <div className="min-w-0 border-t border-[--rule-strong] pt-3.5">
          <p className="t-micro text-[--text-secondary]">Spots held</p>
          <div className="mt-2.5">
            <Fill booked={held} capacity={capacity} />
          </div>
        </div>
      </div>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* -- left column: the things that get edited ------------------------ */}
        <div className="flex min-w-0 flex-col gap-6">
          <Panel
            title="Details"
            description="Name, destination and dates as they appear on the public trip page."
          >
            <form action={updateTrip} className="flex flex-col gap-5">
              <input type="hidden" name="trip_id" value={trip.id} />

              <div className="grid gap-5 sm:grid-cols-2">
                <AdminField label="Name" htmlFor="name" required className="sm:col-span-2">
                  <Input id="name" name="name" type="text" defaultValue={trip.name} required />
                </AdminField>

                <AdminField label="Destination" htmlFor="destination" required>
                  <Input
                    id="destination"
                    name="destination"
                    type="text"
                    defaultValue={trip.destination}
                    required
                  />
                </AdminField>

                <div className="hidden sm:block" aria-hidden="true" />

                <AdminField label="Start date" htmlFor="start_date" required>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    defaultValue={trip.start_date}
                    required
                  />
                </AdminField>

                <AdminField label="End date" htmlFor="end_date" required>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    defaultValue={trip.end_date}
                    required
                  />
                </AdminField>

                <AdminField
                  label="Description"
                  htmlFor="description"
                  hint="Shown on the public trip page."
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="description"
                    name="description"
                    rows={5}
                    defaultValue={trip.description ?? ""}
                  />
                </AdminField>

                <AdminField
                  label="Logistics"
                  htmlFor="logistics"
                  hint="Flights, packing, meeting point. Goes out in the confirmation email, not on the public page."
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="logistics"
                    name="logistics"
                    rows={5}
                    defaultValue={trip.logistics ?? ""}
                  />
                </AdminField>
              </div>

              <div className="flex flex-wrap items-center gap-4 border-t border-[--rule-faint] pt-5">
                <Button type="submit" variant="primary" size="sm">
                  Save details
                </Button>
                {isPublished && (
                  <p className="font-body text-body-s text-[--text-secondary]">
                    This trip is published, so saving updates the public page immediately.
                  </p>
                )}
              </div>
            </form>
          </Panel>

          <Panel
            title="Tiers"
            description="What a traveller picks between. Price and capacity here drive the booking flow."
            bleed
          >
            {tiers.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No tiers yet">
                  A trip with no tiers has nothing to book, even once it is published. Add at least
                  one below before you publish it.
                </EmptyState>
              </div>
            ) : (
              <TableScroll label="Tiers on this trip">
                <Table>
                  <thead>
                    <tr>
                      <Th>Tier</Th>
                      <Th align="right">Price</Th>
                      <Th>Booked</Th>
                      <Th>Inclusions</Th>
                      <Th align="right">
                        <span className="sr-only">Actions</span>
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((tier) => (
                      <tr key={tier.id}>
                        <Td className="max-w-[18rem]">
                          <span className="block font-display text-body-s tracking-title text-[--text]">
                            {tier.name}
                          </span>
                          {tier.description && (
                            <span className="mt-1.5 block text-body-s text-[--text-secondary]">
                              {tier.description}
                            </span>
                          )}
                        </Td>
                        <Td align="right" className="whitespace-nowrap">
                          {formatPrice(Number(tier.price))}
                        </Td>
                        <Td className="min-w-[10rem]">
                          <Fill
                            booked={countHeld(tier.bookings ?? [])}
                            capacity={tier.max_capacity}
                          />
                        </Td>
                        <Td className="max-w-[20rem] text-[--text-secondary]">
                          {tier.inclusions && tier.inclusions.length > 0 ? (
                            <ul className="flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
                              {tier.inclusions.map((item) => (
                                <li key={item} className="whitespace-nowrap">
                                  <span aria-hidden="true" className="text-[--text-muted]">
                                    +{" "}
                                  </span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-[--text-muted]">Nothing listed</span>
                          )}
                        </Td>
                        <Td align="right">
                          <form action={deleteTier} className="flex justify-end">
                            <input type="hidden" name="trip_id" value={trip.id} />
                            <input type="hidden" name="tier_id" value={tier.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="text-[--flag-ink]"
                            >
                              Delete
                            </Button>
                          </form>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableScroll>
            )}

            <div className="border-t border-[--rule] p-5">
              <p className="t-micro text-[--text]">Add a tier</p>
              <form action={addTier} className="mt-4 grid gap-5 sm:grid-cols-2">
                <input type="hidden" name="trip_id" value={trip.id} />

                <AdminField label="Name" htmlFor="tier-name" required>
                  <Input id="tier-name" name="name" type="text" required placeholder="Shared room" />
                </AdminField>

                <AdminField label="Price, USD" htmlFor="tier-price" required>
                  <Input
                    id="tier-price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="2400"
                  />
                </AdminField>

                <AdminField
                  label="Max capacity"
                  htmlFor="tier-max-capacity"
                  hint="Leave blank for no limit."
                >
                  <Input id="tier-max-capacity" name="max_capacity" type="number" min="1" />
                </AdminField>

                <AdminField
                  label="Inclusions"
                  htmlFor="tier-inclusions"
                  hint="Comma separated."
                >
                  <Input
                    id="tier-inclusions"
                    name="inclusions"
                    type="text"
                    placeholder="Flights, Hotel, Meals"
                  />
                </AdminField>

                <AdminField label="Description" htmlFor="tier-description" className="sm:col-span-2">
                  <Textarea id="tier-description" name="description" rows={3} />
                </AdminField>

                <div className="sm:col-span-2">
                  <Button type="submit" variant="secondary" size="sm">
                    Add tier
                  </Button>
                </div>
              </form>
            </div>
          </Panel>

          <Panel
            title="Photos"
            description="The first photo is the one the public trip card uses."
          >
            {trip.images.length === 0 ? (
              <EmptyState title="No photos yet">
                A published trip with no photo still renders, but the card and the trip page both
                fall back to a plain panel. One landscape shot is enough to start.
              </EmptyState>
            ) : (
              <ul className="grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3">
                {trip.images.map((url, index) => (
                  <li key={url} className="flex min-w-0 flex-col gap-2">
                    <div className="border border-[--rule]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- admin tool, not a customer-facing perf-sensitive page */}
                      <img
                        src={url}
                        alt=""
                        className="aspect-[4/3] w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="t-micro text-[--text-muted]">
                        {index === 0 ? "Cover" : `Photo ${index + 1}`}
                      </span>
                      <form action={removeTripImage}>
                        <input type="hidden" name="trip_id" value={trip.id} />
                        <input type="hidden" name="image_url" value={url} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-[--flag-ink]"
                        >
                          Remove
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form
              action={uploadTripImage}
              encType="multipart/form-data"
              className="mt-6 flex flex-col gap-4 border-t border-[--rule-faint] pt-5 sm:flex-row sm:items-end"
            >
              <input type="hidden" name="trip_id" value={trip.id} />
              <AdminField
                label="Add a photo"
                htmlFor="image"
                hint="JPEG, PNG or WebP, under 5MB."
                className="flex-1"
              >
                <input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  className="w-full border border-[--rule-strong] px-3.5 py-2.5 font-body text-body-s text-[--text] file:mr-4 file:border-0 file:bg-transparent file:p-0 file:font-display file:text-micro file:uppercase file:tracking-label file:text-[--accent]"
                />
              </AdminField>
              <Button type="submit" variant="secondary" size="sm" className="sm:mb-9">
                Upload
              </Button>
            </form>
          </Panel>
        </div>

        {/* -- right rail: state, reference, and the one destructive action --- */}
        <aside className="flex min-w-0 flex-col gap-6">
          <Panel title="Status">
            <form action={setTripStatus} className="flex flex-col gap-5">
              <input type="hidden" name="trip_id" value={trip.id} />

              <div className="flex flex-wrap items-center gap-3">
                <span className="t-micro text-[--text-secondary]">Now</span>
                <TripStatusBadge status={trip.status} />
              </div>

              <StatusChoice current={trip.status} />

              <Button type="submit" variant="primary" size="sm" block>
                Update status
              </Button>
            </form>

            {/* The consequence, stated where the control is rather than found
                out afterwards on the public site. */}
            <div className="mt-5">
              {isPublished ? (
                <Alert tone="info" title="Live right now">
                  Anyone can see this trip at{" "}
                  <Link
                    href={`/trips/${trip.id}`}
                    className="text-[--accent] decoration-[--accent]"
                  >
                    /trips/{trip.id.slice(0, 8)}
                  </Link>{" "}
                  and book it. Moving it back to draft takes it down at once.
                </Alert>
              ) : (
                <Alert tone="warning" title="Publishing is instant">
                  {TRIP_STATUS_META[trip.status].blurb} Switching to published puts it on the public
                  site and opens bookings the moment you save.
                </Alert>
              )}
            </div>

            {isPublished && tiers.length === 0 && (
              <div className="mt-4">
                <Alert tone="error" title="Published with no tiers">
                  There is nothing for a traveller to book. Add a tier or move this back to draft.
                </Alert>
              </div>
            )}
          </Panel>

          <Panel title="At a glance">
            <dl className="flex flex-col">
              <DetailRow label="Status">{TRIP_STATUS_META[trip.status].label}</DetailRow>
              <DetailRow label="Destination">{trip.destination}</DetailRow>
              <DetailRow label="Dates">
                {formatDateRange(trip.start_date, trip.end_date)}
              </DetailRow>
              <DetailRow label="Tiers">{tiers.length}</DetailRow>
              <DetailRow label="Spots held">
                {capacity === null ? held : `${held} of ${capacity}`}
              </DetailRow>
              <DetailRow label="Photos">{trip.images.length}</DetailRow>
              <DetailRow label="Trip ID">
                <span className="font-mono text-micro">{trip.id}</span>
              </DetailRow>
            </dl>
          </Panel>

          <Panel
            title="Delete trip"
            description="Only possible once every tier is gone, and a tier only deletes once it has no bookings."
          >
            <form action={deleteTrip}>
              <input type="hidden" name="trip_id" value={trip.id} />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                block
                // Hover fills with --flag-ink, not brand orange: cream on the brand
                // value is 3.2:1 and this label is 11px. On ink it is 4.8:1.
                className="border-[--flag] text-[--flag-ink] hover:border-[--flag-ink] hover:bg-[--flag-ink] hover:text-[--text-on-accent]"
              >
                Delete this trip
              </Button>
            </form>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-t border-[--rule-strong] pt-3.5">
      <p className="t-micro text-[--text-secondary]">{label}</p>
      <p className="mt-2.5 font-body text-body tabular-nums text-[--text]">{value}</p>
    </div>
  );
}
