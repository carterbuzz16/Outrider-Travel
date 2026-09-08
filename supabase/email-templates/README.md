# Supabase auth email templates

Supabase sends the account-confirmation and password-reset emails, not this app,
so they cannot be styled from the codebase. They are configured in the Supabase
dashboard. These files are the HTML to paste in, kept in the repo so the wording
is version-controlled and reviewable like everything else.

Out of the box those emails arrive from `noreply@mail.app.supabase.io` with
Supabase's default template, which is why they look blank and untrusted.

## 1. Send them from Outrider (custom SMTP)

Supabase's built-in sender cannot be rebranded and is rate limited to a handful
of emails an hour. Point it at Resend, which is already set up for this project
with a verified `outrider.travel` domain.

**Dashboard → Project Settings → Authentication → SMTP Settings → Enable custom SMTP**

| Field | Value |
| --- | --- |
| Sender email | `bookings@outrider.travel` (must be on the verified domain) |
| Sender name | `Outrider` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your `RESEND_API_KEY` |

## 2. Fix the localhost links

**Dashboard → Authentication → URL Configuration**

- **Site URL**: the real production origin, e.g. `https://outrider.travel`.
  This is what Supabase falls back to when building links, and it is why the
  confirmation email opened `localhost` on a phone. The templates here build
  their links from it, so it must be right.
- **Minimum password length** (Authentication → Providers → Email): raise from
  6 to 8, so Supabase's own error text cannot contradict `lib/password.ts`.
- **Confirm email** must stay enabled, or `/auth/confirmed` is never reached.
- **Redirect URLs**: add every origin that is allowed to receive an auth
  redirect, one per line:
  ```
  https://outrider.travel/**
  https://*.vercel.app/**
  http://localhost:3000/**
  ```

Also set `NEXT_PUBLIC_APP_URL` in the deployment environment. The app passes an
explicit `emailRedirectTo` built from it, which overrides the Site URL fallback.

## 3. Paste the templates

**Dashboard → Authentication → Email Templates.** Match the file to the tab:

| File | Template |
| --- | --- |
| `confirm-signup.html` | Confirm signup |
| `reset-password.html` | Reset password |
| `magic-link.html` | Magic link |
| `email-change.html` | Change email address |

Supabase substitutes `{{ .SiteURL }}` and `{{ .TokenHash }}` when it sends.
Leave those exactly as written.

### Why these do not use `{{ .ConfirmationURL }}`

The default templates use `{{ .ConfirmationURL }}`, which is the PKCE `code`
flow. Completing it needs a code-verifier cookie set in the browser that started
the flow, so signing up on a laptop and then opening the email on a phone
**fails**, which is the most common way people actually confirm an account.

These templates use a `token_hash` link instead. It carries no verifier, so it
works on any device. `app/auth/callback/route.ts` accepts both shapes, so the
default templates keep working if you ever revert.

## Checking it

Sign up with a real address you control and confirm three things: the sender
reads `Outrider <bookings@outrider.travel>`, the design matches a booking
confirmation, and the button goes to the production domain rather than
localhost.
