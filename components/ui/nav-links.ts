export type NavLink = { label: string; href: string };

/**
 * The account entry point, shared by the nav bar and the footer.
 *
 * It lives in its own module rather than in NavBar because NavBar is a client
 * component: a Server Component importing a constant across that boundary gets
 * a client reference, not the value, and reading `.label` off it throws at
 * render time. Footer is a Server Component, so the constant has to sit
 * somewhere neither side has claimed.
 *
 * The href is /bookings rather than /login on purpose. Middleware already gates
 * /bookings, so a signed-out visitor is redirected to /login?next=/bookings and
 * the login page carries its own "Create an account" link. One href therefore
 * covers logging in, signing up, and coming back to look at your trips. The
 * alternative — reading the session to choose between "Log in" and "Account" —
 * means reading cookies in the (site) layout, which opts every marketing page
 * out of static rendering for the sake of one word.
 */
export const ACCOUNT_LINK: NavLink = { label: "Account", href: "/bookings" };
