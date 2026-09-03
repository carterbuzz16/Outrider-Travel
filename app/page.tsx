import Image from "next/image";
import { joinWaitlist } from "@/app/waitlist-actions";

export default function Home({
  searchParams,
}: {
  searchParams: { error?: string; joined?: string };
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0f2027] px-6 py-20 text-center">
      <Image src="/brand/hero.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f2027]/75 via-[#1a557b]/55 to-[#0f2027]/90" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        <Image src="/brand/logo.png" alt="Outrider" width={140} height={79} priority className="drop-shadow-lg" />

        <h1 className="text-3xl font-light uppercase tracking-[0.35em] text-white sm:text-4xl">Outrider</h1>

        <p className="text-balance text-sm text-white/85 sm:text-base">
          Small-group trips to the places worth chasing. We&apos;re putting the finishing touches on
          things — leave your email and we&apos;ll let you know the moment bookings open.
        </p>

        <form action={joinWaitlist} className="mt-2 flex w-full flex-col gap-3 sm:flex-row">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-md border border-white/30 bg-white/10 px-4 py-3 text-sm text-white placeholder-white/60 backdrop-blur-sm outline-none focus:border-white"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-md bg-white px-6 py-3 text-sm font-medium text-[#1a557b] transition hover:bg-white/90"
          >
            Notify me
          </button>
        </form>

        {searchParams.joined && <p className="text-sm text-white">You&apos;re on the list — we&apos;ll be in touch.</p>}
        {searchParams.error && <p className="text-sm text-red-200">{searchParams.error}</p>}
      </div>
    </main>
  );
}
