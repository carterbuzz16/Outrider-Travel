// Seeds trips/tiers only — not bookings or payments, since several pages
// (bookings/[id]/pay, bookings/[id]/confirmation) call Stripe directly
// using a booking's stored stripe_payment_intent_id, and a fake id there
// would throw a real Stripe API error the moment someone clicked in.
// Re-runnable: clears previously seeded rows (marked via the trip name
// prefix below) before inserting fresh ones.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const SEED_PREFIX = "[seed] ";

const trips: {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  description: string;
  status: Database["public"]["Enums"]["trip_status"];
  tiers: { name: string; price: number; max_capacity: number; description: string; inclusions: string[] }[];
}[] = [
  {
    name: `${SEED_PREFIX}Patagonia Trekking Expedition`,
    destination: "Torres del Paine, Chile",
    start_date: "2027-03-10",
    end_date: "2027-03-20",
    description: "A 10-day guided trek through Patagonia's granite peaks and glacial lakes.",
    status: "published",
    tiers: [
      {
        name: "Standard",
        price: 4200,
        max_capacity: 12,
        description: "Shared lodge rooms, all meals included.",
        inclusions: ["Guided treks", "Lodging", "All meals", "Airport transfers"],
      },
      {
        name: "Private Suite",
        price: 6800,
        max_capacity: 4,
        description: "Private room upgrade with mountain views.",
        inclusions: ["Guided treks", "Private suite", "All meals", "Airport transfers", "Spa access"],
      },
    ],
  },
  {
    name: `${SEED_PREFIX}Kenya Safari Retreat`,
    destination: "Maasai Mara, Kenya",
    start_date: "2027-06-05",
    end_date: "2027-06-12",
    description: "A 7-day luxury tented safari through the Maasai Mara during migration season.",
    status: "published",
    tiers: [
      {
        name: "Classic Tent",
        price: 5400,
        max_capacity: 10,
        description: "Ensuite luxury tented camp.",
        inclusions: ["Daily game drives", "Lodging", "All meals", "Park fees"],
      },
    ],
  },
  {
    name: `${SEED_PREFIX}Iceland Northern Lights`,
    destination: "Reykjavik, Iceland",
    start_date: "2027-01-15",
    end_date: "2027-01-20",
    description: "5-day aurora-chasing trip with hot springs and glacier hikes. Still finalizing itinerary.",
    status: "draft",
    tiers: [
      {
        name: "Standard",
        price: 3100,
        max_capacity: 14,
        description: "Boutique hotel, small-group tours.",
        inclusions: ["Aurora tours", "Lodging", "Breakfast", "Glacier hike"],
      },
    ],
  },
  {
    name: `${SEED_PREFIX}Alps Ski Week (past)`,
    destination: "Chamonix, France",
    start_date: "2026-01-05",
    end_date: "2026-01-12",
    description: "A past trip, kept closed for testing the closed-trip state.",
    status: "closed",
    tiers: [
      {
        name: "Standard",
        price: 3800,
        max_capacity: 16,
        description: "Chalet stay with lift passes.",
        inclusions: ["Lift passes", "Lodging", "Breakfast"],
      },
    ],
  },
];

async function main() {
  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: existing } = await admin.from("trips").select("id").like("name", `${SEED_PREFIX}%`);
  if (existing && existing.length > 0) {
    const ids = existing.map((t) => t.id);
    await admin.from("tiers").delete().in("trip_id", ids);
    await admin.from("trips").delete().in("id", ids);
    console.log(`Cleared ${ids.length} previously seeded trip(s).`);
  }

  for (const trip of trips) {
    const { tiers, ...tripFields } = trip;
    const { data: inserted, error: tripError } = await admin.from("trips").insert(tripFields).select("id").single();

    if (tripError || !inserted) {
      console.error(`Failed to insert trip "${trip.name}":`, tripError);
      continue;
    }

    const { error: tierError } = await admin
      .from("tiers")
      .insert(tiers.map((tier) => ({ ...tier, trip_id: inserted.id })));

    if (tierError) {
      console.error(`Failed to insert tiers for "${trip.name}":`, tierError);
      continue;
    }

    console.log(`Seeded "${trip.name}" (${trip.status}) with ${tiers.length} tier(s).`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
