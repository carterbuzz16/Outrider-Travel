import Link from "next/link";
import { login } from "@/app/auth/actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  return (
    <main>
      <h1>Log in</h1>

      {searchParams.message && <p>{searchParams.message}</p>}
      {searchParams.error && <p>Error: {searchParams.error}</p>}

      <form action={login}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit">Log in</button>
      </form>

      <p>
        No account? <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
}
