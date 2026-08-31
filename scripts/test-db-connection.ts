import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$queryRaw`SELECT 1`;
    const [users, trips, tiers, bookings, payments] = await Promise.all([
      prisma.user.count(),
      prisma.trip.count(),
      prisma.tier.count(),
      prisma.booking.count(),
      prisma.payment.count(),
    ]);

    console.log("Database connection successful.");
    console.log({ users, trips, tiers, bookings, payments });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Database connection failed:", err);
  process.exit(1);
});
