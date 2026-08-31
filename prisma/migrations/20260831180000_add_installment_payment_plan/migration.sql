-- Add 'requires_action' to payment_status for off-session installment
-- charges that hit SCA/3DS and need the customer to authenticate
-- on-session, per Stripe's documented pattern for off-session payment
-- failures. Run as its own statement: a new enum value can't be referenced
-- inside the same transaction that adds it.
ALTER TYPE "payment_status" ADD VALUE 'requires_action';

-- CreateTable/AlterTable: installment retry tracking + saved payment method
ALTER TABLE "payments"
  ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_attempted_at" TIMESTAMP;

ALTER TABLE "users"
  ADD COLUMN "stripe_customer_id" TEXT UNIQUE,
  ADD COLUMN "stripe_default_payment_method_id" TEXT;

-- Users could previously UPDATE any column on their own row (RLS restricts
-- rows via auth.uid() = id, not columns) — including role (self-promote to
-- admin) and, as of this migration, stripe_customer_id /
-- stripe_default_payment_method_id (redirect future installment charges
-- onto a different Stripe Customer's saved card). Restrict authenticated
-- self-service UPDATE to just the columns a user should be able to edit.
REVOKE UPDATE ON "users" FROM "authenticated";
GRANT UPDATE ("name", "phone") ON "users" TO "authenticated";
