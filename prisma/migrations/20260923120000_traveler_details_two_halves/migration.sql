-- Traveler details are now asked in two halves (see lib/traveler-details.ts).
--
-- The identity half (legal name, date of birth, school, phone, emergency
-- contact) is asked inline on the confirmation page, straight after the card
-- clears. The gear half (ski or board, ability, sizes) stays on the trip
-- portal, where it belongs: the rental shop needs none of it until weeks out.
--
-- So a row now exists in two valid states, and two columns that were NOT NULL
-- are not knowable at insert time any more. Their CHECK constraints are
-- already NULL-safe (`NULL IN ('ski','snowboard')` is NULL, which a CHECK
-- passes), so only the NOT NULL comes off.
--
-- "Is this traveler done" is no longer "does a row exist". It is
-- gearComplete() in lib/traveler-details.ts, and bookings.details_submitted is
-- still only set when the gear half lands, so the 72-hour chase keeps chasing
-- anyone who has given their name and nothing else.

ALTER TABLE "traveler_details"
  ALTER COLUMN "ski_or_board" DROP NOT NULL,
  ALTER COLUMN "ability_level" DROP NOT NULL;

-- Where they go. Asked once, on the confirmation page, and exported with the
-- roster. Nullable: every row written before this migration predates the
-- question, and no backfill can invent an answer.
ALTER TABLE "traveler_details"
  ADD COLUMN "school" TEXT;

-- The length backstop has to be replaced rather than added to, so school is
-- covered by the same constraint as every other free-text column.
ALTER TABLE "traveler_details"
  DROP CONSTRAINT "traveler_details_text_lengths_check";

ALTER TABLE "traveler_details"
  ADD CONSTRAINT "traveler_details_text_lengths_check" CHECK (
    char_length("legal_name") BETWEEN 1 AND 200
    AND char_length("phone") BETWEEN 1 AND 40
    AND char_length("emergency_contact_name") BETWEEN 1 AND 200
    AND char_length("emergency_contact_phone") BETWEEN 1 AND 40
    AND coalesce(char_length("school"), 0) <= 120
    AND coalesce(char_length("height"), 0) <= 40
    AND coalesce(char_length("weight"), 0) <= 40
    AND coalesce(char_length("shoe_size"), 0) <= 40
    AND coalesce(char_length("dietary_restrictions"), 0) <= 1000
  );
