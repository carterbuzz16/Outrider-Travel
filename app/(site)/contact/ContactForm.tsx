"use client";

import { useState } from "react";
import { Button, Field, Input, Textarea, useToast } from "@/components/ui";
import { sendContactMessage } from "./actions";

export default function ContactForm({ contactEmail }: { contactEmail: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setErrors({});
    try {
      const result = await sendContactMessage({ name, email, message });
      if (result.ok) {
        setSent(true);
        setName("");
        setEmail("");
        setMessage("");
        toast({
          tone: "success",
          title: "Message sent",
          description: "We answer every message within a day.",
        });
      } else {
        setErrors({ form: result.message });
      }
    } catch {
      // The action returns its failures rather than throwing, so reaching here
      // means the request itself never completed.
      setErrors({
        form: `Something went wrong. Please email ${contactEmail} directly.`,
      });
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="border border-[--rule] bg-[--surface-raised] p-8">
        <p className="t-micro text-[--accent]">Received</p>
        <h2 className="t-subheading mt-3 text-[--text]">That is with us</h2>
        <p className="mt-4 max-w-measure font-body text-body leading-[1.75] text-[--text-secondary]">
          We answer every message within a day. If it&rsquo;s urgent, {contactEmail}{" "}
          reaches the same inbox.
        </p>
        <div className="mt-6">
          <Button variant="secondary" size="sm" onClick={() => setSent(false)}>
            Send another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Field label="Name" required>
        {(p) => (
          <Input
            {...p}
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First and last"
            autoComplete="name"
            disabled={busy}
            required
          />
        )}
      </Field>

      <Field label="Email" required>
        {(p) => (
          <Input
            {...p}
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={busy}
            required
          />
        )}
      </Field>

      <Field
        label="Message"
        hint="Trip, chapter, group size, dates. Whatever is useful."
        required
      >
        {(p) => (
          <Textarea
            {...p}
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What can we help with?"
            rows={7}
            disabled={busy}
            required
          />
        )}
      </Field>

      {/* Reserves nothing when empty; announced when it appears. */}
      {errors.form && (
        <p role="alert" className="t-micro text-[--flag-ink]">
          {errors.form}
        </p>
      )}

      <div>
        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? "Sending" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
