-- Let legal_acceptances record the ambassador agreement (29 October 2026).
--
-- The live table carries a CHECK, legal_acceptances_slug_check, that allows
-- only the two booking documents ('terms', 'assumption-of-risk'). It was added
-- in the database directly and is in no migration here, so the
-- ambassador_portal migration did not know to widen it, and accepting the
-- agreement in the portal failed. This keeps the same check and adds the one
-- slug the portal writes. Safe to run twice.
ALTER TABLE public.legal_acceptances DROP CONSTRAINT IF EXISTS legal_acceptances_slug_check;
ALTER TABLE public.legal_acceptances ADD CONSTRAINT legal_acceptances_slug_check
  CHECK (document_slug IN ('terms', 'assumption-of-risk', 'ambassador-agreement'));
