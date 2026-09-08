import { redirect } from "next/navigation";

/**
 * /cancellation — kept as a redirect into the Terms, not as its own document.
 *
 * Cancellation, refunds, the deposit and the installment plan are one set of
 * rules, and the worst outcome here is two documents that both describe them
 * and quietly disagree after somebody edits one. A traveller reading a standalone
 * cancellation policy that contradicts the terms they agreed to is a dispute
 * waiting to happen, so there is exactly one source of truth: section 7 of the
 * Terms of Service, with the payment plan and the force-majeure rules either
 * side of it.
 *
 * The route stays because it was live and may be bookmarked or linked
 * externally. The footer now links straight to the section instead.
 *
 * If the business later wants a genuinely separate, signable cancellation
 * policy, register it in lib/legal.ts and render it with LegalDocument the same
 * way the other three pages do — and move the clauses out of the Terms rather
 * than duplicating them.
 */
export default function CancellationPage() {
  redirect("/terms#cancellation");
}
