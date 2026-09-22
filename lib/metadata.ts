import type { Metadata } from "next";

/**
 * Metadata for one public page, with its share card to match.
 *
 * Next does not derive Open Graph or Twitter tags from a page's own title and
 * description: a page that sets only those two inherits the root layout's
 * openGraph block whole. Until this existed, every page on the site told
 * iMessage, Instagram and Slack that it was called "Outrider", described
 * itself with the home page's sentence, and lived at the root URL. For a
 * company that spreads by link in group chats, that preview is the page.
 *
 * The image has to be restated as well. Setting openGraph on a page replaces
 * the inherited block, and the card rendered by app/opengraph-image.tsx went
 * with it. A route with its own opengraph-image file passes `ownImage`, because
 * an image stated here beats the file, and the file's URL cannot be written
 * by hand: inside a route group Next serves it under a hashed name.
 *
 * `title` is the short page name; the layout's template adds "| Outrider" to
 * the document title, and the share card gets the same full string.
 */
export function pageMetadata({
  title,
  description,
  path,
  shareTitle,
  absoluteTitle = false,
  ownImage = false,
}: {
  title: string;
  description: string;
  /** The route, with a leading slash. Resolved against metadataBase. */
  path: string;
  /** A card title when the tab title is too terse to share, e.g. "FAQ". */
  shareTitle?: string;
  /** Use `title` as the whole document title, without the template. */
  absoluteTitle?: boolean;
  /** The route has its own opengraph-image file; leave the image to it. */
  ownImage?: boolean;
}): Metadata {
  const full = absoluteTitle ? title : `${title} | Outrider`;
  const card = shareTitle ?? full;
  const images = ownImage
    ? undefined
    : [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Outrider. Small-group travel for college.",
        },
      ];

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Outrider",
      locale: "en_US",
      title: card,
      description,
      url: path,
      ...(images && { images }),
    },
    twitter: {
      card: "summary_large_image",
      title: card,
      description,
      ...(images && { images }),
    },
  };
}
