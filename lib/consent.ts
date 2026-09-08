/**
 * Cookie consent — storage, versioning and a subscription.
 *
 * ----------------------------------------------------------------------------
 * WHAT THIS SITE ACTUALLY SETS TODAY
 * ----------------------------------------------------------------------------
 * Nothing that needs consent. As of this writing the app ships no analytics,
 * no tag manager, no advertising pixel and no third-party script beyond
 * Stripe.js, which only loads inside the booking flow and is there to take a
 * payment and screen it for fraud. The only cookies a visitor picks up are:
 *
 *   - `sb-*`  Supabase auth/session cookies, written by `@supabase/ssr` in
 *             lib/supabase/middleware.ts. Signed-in state only.
 *   - Stripe's own cookies, and only once a checkout has been opened.
 *
 * Both are "strictly necessary" under ePrivacy/GDPR (Art. 5(3) exemption), so
 * neither requires opt-in. A banner asking permission for them would be asking
 * permission for nothing — which is why TRACKING_ENABLED below is false and
 * the banner does not render. Flip it the day a measurement script lands, not
 * before.
 * ----------------------------------------------------------------------------
 */

/**
 * Set to `true` at the same time you add analytics — and only then.
 *
 * The one switch that decides whether <CookieConsent /> appears at all. To turn
 * consent on:
 *
 *   1. Flip this to `true`.
 *   2. Load the analytics script *behind* `getConsent() === "accepted"` — never
 *      unconditionally, or the banner is decoration. `subscribe()` below exists
 *      so a script can start the moment consent is given without a reload.
 *   3. Add the new cookies to the privacy policy (/privacy) and bump
 *      CONSENT_VERSION so anyone who already answered is asked again.
 *
 * Typed as `boolean` rather than left as the literal `false` on purpose: the
 * literal type would make every `TRACKING_ENABLED &&` branch statically dead
 * and TypeScript would narrow the code behind it out of existence.
 */
export const TRACKING_ENABLED: boolean = false;

/**
 * Bump when the cookies in play change, so an old "accept" stops counting as
 * informed consent and everyone is asked again against the new policy.
 */
export const CONSENT_VERSION = 1;

/** localStorage key. Namespaced so it can't collide with anything else. */
export const CONSENT_STORAGE_KEY = "outrider:cookie-consent";

export type ConsentValue = "accepted" | "rejected";

type StoredConsent = {
  value: ConsentValue;
  version: number;
  /** ISO timestamp — the record of *when* consent was given, which the GDPR asks for. */
  decidedAt: string;
};

type ConsentListener = (value: ConsentValue | null) => void;

const listeners = new Set<ConsentListener>();

function isConsentValue(value: unknown): value is ConsentValue {
  return value === "accepted" || value === "rejected";
}

/**
 * Read the stored decision.
 *
 * Returns `null` when nothing is stored, when the stored record predates the
 * current CONSENT_VERSION, when the value is unrecognisable, or when storage
 * itself is unreadable. Every one of those means the same thing downstream:
 * we do not have consent, so behave as if the answer were no.
 *
 * Safe on the server — it returns `null` there rather than throwing, so it can
 * be called from code that renders in both places.
 */
export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const record = parsed as Partial<StoredConsent>;
    if (record.version !== CONSENT_VERSION) return null;
    if (!isConsentValue(record.value)) return null;

    return record.value;
  } catch {
    // Private mode, blocked site data, or a corrupt value. Reading storage can
    // throw outright in Safari's private windows, so this is not paranoia.
    return null;
  }
}

/** Has the visitor answered, under the current policy version? */
export function hasDecided(): boolean {
  return getConsent() !== null;
}

/**
 * Record a decision and tell every subscriber.
 *
 * The write can fail — quota, private mode, a browser set to block site data.
 * When it does we still notify, so the current page behaves as the visitor
 * asked; they will simply be asked again next visit, which is the honest
 * failure mode.
 */
export function setConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;

  const record: StoredConsent = {
    value,
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Intentionally swallowed — see above.
  }

  notify(value);
}

/**
 * Clear the decision so the banner asks again. Not wired to any UI yet; it is
 * what a "change your cookie choices" control in the privacy policy would call.
 */
export function resetConsent(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Intentionally swallowed — see above.
  }

  notify(null);
}

function notify(value: ConsentValue | null): void {
  listeners.forEach((listener) => listener(value));
}

/**
 * Watch for changes to the decision. Returns an unsubscribe function.
 *
 * A script that needs consent should subscribe rather than read once at load:
 * that way it starts as soon as Accept is clicked, with no reload, and it also
 * picks up a decision made in another tab (hence the `storage` listener, which
 * only fires for *other* tabs — same-tab changes come through `notify`).
 *
 * On the server this is a no-op returning a no-op, so it is safe to call from
 * an effect that might be set up during SSR.
 */
export function subscribe(listener: ConsentListener): () => void {
  if (typeof window === "undefined") return () => {};

  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== CONSENT_STORAGE_KEY) return;
    listener(getConsent());
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
