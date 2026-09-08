import { Button, Input, Textarea } from "@/components/ui";
import { createTrip } from "@/app/admin/trips/actions";
import { AdminField, PageHeader, Panel, StatusChoice } from "@/app/admin/admin-ui";

export default function NewTripPage() {
  return (
    <main className="shell pb-16">
      <PageHeader
        eyebrow="Back office"
        title="New trip"
        lede="Name, destination and dates are enough to create it. Prices live on tiers, which you add once the trip exists."
        back={{ href: "/admin/trips", label: "Trips" }}
      />

      <form action={createTrip} className="mt-10 flex max-w-narrow flex-col gap-6">
        <Panel title="Details">
          <div className="grid gap-5 sm:grid-cols-2">
            <AdminField label="Name" htmlFor="name" required className="sm:col-span-2">
              <Input id="name" name="name" type="text" required placeholder="Chamonix, week one" />
            </AdminField>

            <AdminField label="Destination" htmlFor="destination" required>
              <Input
                id="destination"
                name="destination"
                type="text"
                required
                placeholder="Chamonix, France"
              />
            </AdminField>

            {/* Destination keeps its own row so the two date fields pair up
                side by side rather than splitting across two rows. */}
            <div className="hidden sm:block" aria-hidden="true" />

            <AdminField label="Start date" htmlFor="start_date" required>
              <Input id="start_date" name="start_date" type="date" required />
            </AdminField>

            <AdminField label="End date" htmlFor="end_date" required>
              <Input id="end_date" name="end_date" type="date" required />
            </AdminField>

            <AdminField
              label="Description"
              htmlFor="description"
              hint="Shown on the public trip page."
              className="sm:col-span-2"
            >
              <Textarea id="description" name="description" rows={5} />
            </AdminField>

            <AdminField
              label="Logistics"
              htmlFor="logistics"
              hint="Flights, packing, meeting point. Goes out in the confirmation email, not on the public page."
              className="sm:col-span-2"
            >
              <Textarea id="logistics" name="logistics" rows={5} />
            </AdminField>
          </div>
        </Panel>

        <Panel
          title="Status"
          description="Start as a draft unless the dates, prices and tiers are already settled. Publishing puts the trip on the public site straight away."
        >
          <StatusChoice current="draft" />
        </Panel>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="primary" size="md">
            Create trip
          </Button>
          <Button href="/admin/trips" variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      </form>
    </main>
  );
}
