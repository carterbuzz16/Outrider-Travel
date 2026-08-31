import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Outrider</h1>
      <p>
        <Link href="/bookings">Your bookings</Link> (requires login)
      </p>
      <p>
        <Link href="/admin">Admin</Link> (requires admin role)
      </p>
    </main>
  );
}
