"use client";

import { Button, Field, Input } from "@/components/ui";
import { resetPassword } from "@/app/auth/actions";
import { MIN_PASSWORD_LENGTH, PASSWORD_RULE } from "@/lib/password";

/*
 * Split out of page.tsx as the one client island on the route. The page itself
 * has to stay a Server Component because it checks the recovery session before
 * deciding what to render; this piece is client only because `Field` takes its
 * control as a render-prop child, which cannot be passed from a server file.
 *
 * There is no "current password" box: the only session here is the one the
 * emailed link created, and Supabase does not ask for the old password to
 * change it. The rule is stated under the first box, before submitting.
 */
export default function ResetPasswordForm() {
  return (
    <form action={resetPassword} className="mt-10 flex flex-col gap-7">
      <Field label="New password" hint={PASSWORD_RULE} required>
        {(field) => (
          <Input
            {...field}
            name="password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        )}
      </Field>

      <Field label="Confirm new password" hint="Type it a second time." required>
        {(field) => (
          <Input
            {...field}
            name="confirm_password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        )}
      </Field>

      <Button type="submit" variant="primary" size="md" block className="mt-1">
        Save new password
      </Button>
    </form>
  );
}
