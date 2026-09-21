"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { sendTestEmail } from "./actions";

/**
 * "Send test to me" for one email. The only input is which email: the address
 * is the signed-in admin's own, decided on the server.
 */
export default function TestSend({ emailId }: { emailId: string }) {
  const [state, formAction, pending] = useActionState(sendTestEmail, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={emailId} />
      <div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send test to me"}
        </Button>
      </div>
      {state && (
        <Alert tone={state.ok ? "success" : "error"} title={state.ok ? "Test sent" : "Not sent"}>
          {state.message}
        </Alert>
      )}
    </form>
  );
}
