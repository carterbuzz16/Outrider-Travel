"use client";

import { Checkbox, Field, InlineInput, Input, Select, Textarea } from "@/components/ui";

/** Field owns its ids through useId, so the demos live in a client island. */
export default function FormDemo() {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-6">
        <Field label="Full name" required>
          {(p) => <Input {...p} placeholder="First and last" autoComplete="name" />}
        </Field>

        <Field label="Email" hint="We only write when a departure opens.">
          {(p) => <Input {...p} type="email" placeholder="you@example.com" />}
        </Field>

        <Field label="Departure" error="Pick a departure to continue.">
          {(p) => (
            <Select {...p} defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              <option>Telluride · Feb 2027</option>
              <option>Niseko · Jan 2027</option>
              <option>Chamonix · Mar 2027</option>
            </Select>
          )}
        </Field>

        <Field label="Disabled" hint="Locked until a deposit clears.">
          {(p) => <Input {...p} disabled placeholder="Unavailable" />}
        </Field>
      </div>

      <div className="flex flex-col gap-6">
        <Field label="Anything we should know?" hideLabel>
          {(p) => (
            <Textarea {...p} placeholder="Anything we should know?" rows={7} />
          )}
        </Field>

        <Checkbox label="Send me the journal — roughly once a month, never more." />

        <div className="flex flex-col gap-2">
          <p className="t-micro text-[--text-secondary]">Inline variant</p>
          <InlineInput placeholder="Email" type="email" aria-label="Email" />
        </div>
      </div>
    </div>
  );
}
