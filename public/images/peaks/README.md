# Photographs: The Peaks Resort

Photos in this folder appear on /telluride ("Where you stay"), on each
Telluride trip page, and on the package cards and order summary at checkout.
`lib/room-media.ts` lists which file belongs to which room, with its alt text
(the description read aloud to screen-reader users). A photo only shows once
its file exists here and it has a line there; a room with none shows a
typographic panel instead of a picture.

**Format:** landscape, about 3:2, at least 1600px wide, JPEG, sRGB, under
about 800 KB each. The `-1` photo of each room is its hero and its checkout
card image, so make it the room at its best, shot wide.

| File                       | Used for          | What is in the frame                                                                                                          |
| -------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `two-king-1.jpg`           | BASE and MID      | A Two King room: two white king beds, dark leather headboards, sliding door to a balcony at sunset. Same room for both packages. |
| `penthouse-702-1.jpg`      | PENTHOUSE 702     | Hero. The great room: two dining tables, leather sofas, stone fireplace, vaulted wood ceiling with skylights, mountains at dusk |
| `penthouse-702-2.jpg`      | PENTHOUSE 702     | The long dining table set for ten under an iron chandelier, floor-to-ceiling windows at dusk                                   |
| `penthouse-702-3.jpg`      | PENTHOUSE 702     | The kitchen with breakfast bar and granite counters, a dining table on a red rug, stairs to the fourth bedroom                 |
| `penthouse-830-1.jpg`      | PENTHOUSE 830     | Hero. The top-floor great room under a log-beam ceiling, windows on every side over Mountain Village                          |
| `penthouse-830-2.jpg`      | PENTHOUSE 830     | The primary bedroom: king bed, coffered ceiling, windows to Mt. Wilson and aspens                                              |
| `penthouse-830-3.jpg`      | PENTHOUSE 830     | The bunk room: two bunk beds with a full bed below each, a window onto the valley                                             |
| `peaks-exterior-night.jpg` | /telluride        | The resort from above on a winter night, lit windows, heated pool, snowy peaks behind ("Where you stay")                      |

The old single TOP package, if a departure still has one, shows both
penthouses' photographs.

**Still wanted**, if the resort or the owner has them: 702's primary suite and
family room; 830's living space and a second angle on its 270-degree view; the
Two King room's bathroom; the spa. Name them in the same pattern
(`penthouse-702-4.jpg`, `two-king-2.jpg`, ...) and add a line for each in
`lib/room-media.ts`.
