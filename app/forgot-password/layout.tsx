import type { Metadata } from "next";

/*
 * The page itself is a client component, because Field takes its control as a
 * render-prop child and a function cannot cross the server boundary. Client
 * components cannot export metadata, so it lives here instead: this layout is
 * a server component and only wraps the page.
 *
 * noindex because an auth screen in search results is worse than nothing. It
 * outranks the page a person actually wanted and tells them to log in.
 */
export const metadata: Metadata = {
  title: "Reset your password",
  description: "Send yourself a link to reset your Outrider password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
