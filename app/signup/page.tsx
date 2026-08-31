import Link from "next/link";
import { signup } from "@/app/auth/actions";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main>
      <h1>Sign up</h1>

      {searchParams.error && <p>Error: {searchParams.error}</p>}

      <form action={signup}>
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required autoComplete="name" />
        </div>
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
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <button type="submit">Sign up</button>
      </form>

      <p>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
