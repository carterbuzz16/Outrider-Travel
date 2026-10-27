import { Input, Select } from "@/components/ui";
import { formatDay } from "@/app/(protected)/dates";
import { AdminField } from "@/app/admin/admin-ui";
import type { Ambassador } from "@/lib/ambassadors";

/** The ambassador form's fields, shared by adding (here) and editing (the detail page). */
export default function AmbassadorFields({
  trips,
  values,
}: {
  trips: { id: string; name: string; start_date: string }[];
  values?: Partial<Pick<Ambassador, "code" | "name" | "school" | "email" | "phone" | "instagram">> & { tripId?: string | null };
}) {
  const editing = Boolean(values?.code);
  return (
    <>
      {!editing && (
        <AdminField label="Code" htmlFor="code" required hint="Their last name, usually. Letters and digits.">
          <Input id="code" name="code" required maxLength={32} autoCapitalize="characters" className="py-2" />
        </AdminField>
      )}
      <AdminField label="Name" htmlFor="name" required>
        <Input id="name" name="name" required defaultValue={values?.name ?? ""} className="py-2" />
      </AdminField>
      <AdminField label="School" htmlFor="school">
        <Input id="school" name="school" defaultValue={values?.school ?? ""} className="py-2" />
      </AdminField>
      <AdminField label="Email" htmlFor="email" hint="The account their held spot goes on.">
        <Input id="email" name="email" type="email" defaultValue={values?.email ?? ""} className="py-2" />
      </AdminField>
      <AdminField label="Phone" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" defaultValue={values?.phone ?? ""} className="py-2" />
      </AdminField>
      <AdminField label="Instagram" htmlFor="instagram">
        <Input id="instagram" name="instagram" defaultValue={values?.instagram ?? ""} className="py-2" />
      </AdminField>
      <AdminField label="Trip" htmlFor="trip_id">
        <Select id="trip_id" name="trip_id" defaultValue={values?.tripId ?? ""} className="py-2">
          <option value="">Not set</option>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}, {formatDay(t.start_date)}
            </option>
          ))}
        </Select>
      </AdminField>
    </>
  );
}
