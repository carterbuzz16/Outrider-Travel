"use client";

import { useActionState, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { sendBookingOpenTest, sendBookingOpenToList, sendEarlyAccessTest, sendEarlyAccessToList } from "./actions";

/*
 * The emails /admin/launch can send, each with its own test and real send and
 * the words on its buttons. The head start went on 25 September; the
 * "booking is open to everyone" reminder was added on 28 September.
 */
const EMAILS = {
  "early-access": {
    test: sendEarlyAccessTest,
    send: sendEarlyAccessToList,
    none: "Everyone has it",
    button: (people: string) => `Send the head start to ${people}`,
    confirm: (people: string) => `This emails ${people} their early-access link now.`,
  },
  "booking-open": {
    test: sendBookingOpenTest,
    send: sendBookingOpenToList,
    none: "Nobody left to send it to",
    button: (people: string) => `Send the reminder to ${people}`,
    confirm: (people: string) => `This emails ${people} that booking is open to everyone now.`,
  },
} as const;

/**
 * The two buttons for one of those emails. The real send takes two presses:
 * the first only reveals the confirm, which names how many people it will
 * reach. Mail to a list cannot be taken back.
 */
export default function LaunchControls({
  pending,
  ready,
  email = "early-access",
}: {
  pending: number;
  ready: boolean;
  email?: keyof typeof EMAILS;
}) {
  const copy = EMAILS[email];
  const [testState, testAction, testing] = useActionState(copy.test, null);
  const [sendState, sendAction, sending] = useActionState(copy.send, null);
  const [confirming, setConfirming] = useState(false);
  const people = `${pending} ${pending === 1 ? "person" : "people"}`;

  return (
    <div className="flex flex-col gap-8">
      <form action={testAction} className="flex flex-col gap-3">
        <div>
          <Button type="submit" variant="secondary" size="sm" disabled={testing}>
            {testing ? "Sending…" : "Send a test to me"}
          </Button>
        </div>
        {testState && (
          <Alert tone={testState.ok ? "success" : "error"} title={testState.ok ? "Test sent" : "Not sent"}>
            {testState.message}
          </Alert>
        )}
      </form>

      <form action={sendAction} className="flex flex-col gap-3 border-t border-[--rule] pt-6">
        {!confirming ? (
          <div>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={!ready || pending === 0 || sending}
              onClick={() => setConfirming(true)}
            >
              {pending === 0 ? copy.none : copy.button(people)}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="max-w-measure font-body text-body text-[--text]">
              {copy.confirm(people)} It can&rsquo;t be unsent.
            </p>
            <input type="hidden" name="confirm" value="send" />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="primary" size="md" disabled={sending}>
                {sending ? "Sending…" : `Yes, send to ${people}`}
              </Button>
              <Button type="button" variant="secondary" size="md" disabled={sending} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {sendState && (
          <Alert tone={sendState.ok ? "success" : "error"} title={sendState.ok ? "Sent" : "Not sent"}>
            {sendState.message}
          </Alert>
        )}
      </form>
    </div>
  );
}
