"use client";

import { useActionState, useState } from "react";
import { Alert, Button } from "@/components/ui";
import { sendEarlyAccessTest, sendEarlyAccessToList } from "./actions";

/**
 * The two buttons on /admin/launch. The real send takes two presses: the
 * first only reveals the confirm, which names how many people it will reach.
 * Mail to a list cannot be taken back.
 */
export default function LaunchControls({ pending, ready }: { pending: number; ready: boolean }) {
  const [testState, testAction, testing] = useActionState(sendEarlyAccessTest, null);
  const [sendState, sendAction, sending] = useActionState(sendEarlyAccessToList, null);
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
              {pending === 0 ? "Everyone has it" : `Send the head start to ${people}`}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="max-w-measure font-body text-body text-[--text]">
              This emails {people} their early-access link now. It can&rsquo;t be unsent.
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
