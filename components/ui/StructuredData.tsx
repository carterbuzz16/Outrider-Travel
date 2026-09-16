import { isValidElement, type ReactNode } from "react";
import { CONTACT } from "@/lib/site-content";

/**
 * JSON-LD for search engines.
 *
 * Emitted as a script tag rather than markup because that is the only form
 * Google reads it in. Values come from the same content and trip data the page
 * renders, so the two cannot disagree, which is the thing structured data gets
 * penalised for.
 */

export function OrganizationSchema({ siteUrl }: { siteUrl: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "Outrider",
    url: siteUrl,
    email: CONTACT.email,
    areaServed: "US",
    description:
      "Small-group travel for college. Ski weeks and spring break, run end to end.",
    sameAs: [CONTACT.instagram],
    logo: `${siteUrl}/icon.svg`,
  };

  // The WebSite node is what lets a search result name the site "Outrider"
  // rather than guessing a name from the domain.
  const site = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Outrider",
    url: siteUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // The content is our own, built from typed data above, not user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(site) }}
      />
    </>
  );
}

/**
 * The plain text of a JSX answer.
 *
 * FAQ answers are written as JSX so they can link to the clause they cite, but
 * structured data wants a string. Walking the tree here, rather than keeping a
 * second plain-text copy of every answer, is what stops the two drifting apart.
 */
export function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

/** FAQPage markup, from the same questions the page renders. */
export function FaqSchema({ items }: { items: { q: string; a: ReactNode }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        // JSX source line breaks arrive as runs of whitespace.
        text: nodeText(item.a).replace(/\s+/g, " ").trim(),
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function TripSchema({
  siteUrl,
  trip,
}: {
  siteUrl: string;
  trip: {
    id: string;
    name: string;
    destination: string;
    description: string | null;
    startDate: string;
    endDate: string;
    priceFrom: number;
    images: string[];
    bookable: boolean;
  };
}) {
  const url = `${siteUrl}/trips/${trip.id}`;
  const data = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: trip.name,
    url,
    description: trip.description ?? undefined,
    image: trip.images.map((src) => `${siteUrl}${src}`),
    touristType: "College groups",
    itinerary: {
      "@type": "Place",
      name: trip.destination,
    },
    offers: {
      "@type": "Offer",
      price: trip.priceFrom,
      priceCurrency: "USD",
      url,
      // Reflects the real state: while bookings are closed this must not claim
      // the trip is purchasable, or the listing is wrong the moment it is read.
      availability: trip.bookable
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder",
      validFrom: trip.startDate,
    },
    startDate: trip.startDate,
    endDate: trip.endDate,
    provider: {
      "@type": "TravelAgency",
      name: "Outrider",
      url: siteUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
