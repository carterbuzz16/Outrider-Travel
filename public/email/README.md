# public/email

Images requested by Outrider's transactional emails, served at
`https://www.outrider.travel/email/<file>`. Templates use the www host
directly: the bare domain 308s to it, and not every mail client's image
loader follows that redirect. Mail sent before September 24, 2026 asks for
the bare-domain URLs, so those must keep resolving too.

**Never rename, move, recompress or delete these files.** Every email that has
already been delivered requests them by this exact URL for as long as it sits
in someone's inbox. Changing a file here changes, or breaks, mail that has
already gone out, and there is no way to fix a sent message.

To change an image, add a new file under a new name, point the templates at
it, and leave the old one where it is.

| File | Used for |
| --- | --- |
| `email-header-band.png` | Header band |
| `email-hero-telluride.jpg` | Telluride hero photograph |
| `email-band-gorrono.jpg` | Photographic band |
| `outrider-mark-espresso.png` | Mark on light grounds |
| `outrider-mark-paper.png` | Mark on dark grounds |

These paths must stay reachable without a session: `middleware.ts` does not
match `/email`, and `app/robots.ts` does not disallow it. Keep it that way.
