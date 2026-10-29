/*
 * The ambassador portal as a home-screen app (29 October 2026): "Add to Home
 * Screen" opens /ambassador/dashboard full screen, with the brand's colors
 * behind the launch. Scoped to /ambassador/ so the rest of the site still
 * opens in the browser. Public and the same for everyone, so it can be cached.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      name: "Outrider Ambassadors",
      short_name: "Outrider",
      description: "Your link, your count and your friends, live.",
      start_url: "/ambassador/dashboard",
      scope: "/ambassador/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#f2efea",
      theme_color: "#3e342f",
      icons: [
        { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
