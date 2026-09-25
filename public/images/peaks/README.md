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
| `two-king-room-1.jpg`           | BASE and MID      | Hero. The Two King room: two white king beds, tall leather headboards, sliding door to a balcony over the pines. Same room for both packages. |
| `two-king-room-2.jpg`           | BASE and MID      | A king bed and a cream armchair by the sliding door, the balcony and aspens outside                                            |
| `two-king-room-3.jpg`           | BASE and MID      | The bathroom: long double vanity in dark wood, wood-framed mirror, glass walk-in shower                                        |
| `two-king-room-4.jpg`           | BASE and MID      | The balcony view: fall aspens, pines, the San Juans behind Mountain Village                                                    |
| `penthouse-702-1.jpg`      | PENTHOUSE 702     | Hero. The great room: two dining tables, leather sofas, stone fireplace, vaulted wood ceiling with skylights, mountains at dusk |
| `penthouse-702-2.jpg`      | PENTHOUSE 702     | The long dining table set for ten under an iron chandelier, floor-to-ceiling windows at dusk                                   |
| `penthouse-702-3.jpg`      | PENTHOUSE 702     | The kitchen with breakfast bar and granite counters, a dining table on a red rug, stairs to the fourth bedroom                 |
| `penthouse-702-4.jpg`      | PENTHOUSE 702     | The living room: leather sofas on a patterned rug, wood-plank ceiling, angled windows onto the mountains at dusk               |
| `penthouse-702-5.jpg`      | PENTHOUSE 702     | Dining table set for breakfast, stone fireplace and bookshelves, kitchen with granite breakfast bar                            |
| `penthouse-702-6.jpg`      | PENTHOUSE 702     | The primary bedroom: king bed, two plaid armchairs by a wide window, peaks at dusk                                             |
| `penthouse-702-7.jpg`      | PENTHOUSE 702     | The primary bath: double vanity with bronze sinks, soaking tub under a window                                                  |
| `penthouse-702-8.jpg`      | PENTHOUSE 702     | Twin room: two twin beds on wood-and-iron frames, window seat                                                                  |
| `penthouse-702-9.jpg`      | PENTHOUSE 702     | The family room: leather sofa, coffee table, window seat over Mountain Village                                                 |
| `penthouse-702-10.jpg`     | PENTHOUSE 702     | The entry hall and staircase with an iron forest-and-elk railing                                                                |
| `penthouse-830-1.jpg`      | PENTHOUSE 830     | Hero. The top-floor great room under a log-beam ceiling, windows on every side over Mountain Village                          |
| `penthouse-830-2.jpg`      | PENTHOUSE 830     | The primary bedroom: king bed, coffered ceiling, windows to Mt. Wilson and aspens                                              |
| `penthouse-830-3.jpg`      | PENTHOUSE 830     | The bunk room: two bunk beds with a full bed below each, a window onto the valley                                             |
| `penthouse-830-4.jpg`      | PENTHOUSE 830     | The living room: leather sofas, wood chest, fireplace under the TV, windows onto snow-capped peaks                             |
| `penthouse-830-5.jpg`      | PENTHOUSE 830     | Bedroom: king bed, tall tufted leather headboard, sliding door to a balcony                                                    |
| `penthouse-830-6.jpg`      | PENTHOUSE 830     | Bedroom: king bed with a red throw, sliding door to the balcony, valley and cliffs at dusk                                     |
| `penthouse-830-7.jpg`      | PENTHOUSE 830     | Bathroom: double vanity in dark wood, wood-framed mirror, glass shower                                                         |
| `peaks-exterior-night.jpg` | /telluride        | The resort from above on a winter night, lit windows, heated pool, snowy peaks behind ("Where you stay")                      |

The old single TOP package, if a departure still has one, shows both
penthouses' photographs.

**Still wanted**, if the resort or the owner has them: a second angle on 830's
270-degree view; the spa. Name them in the same pattern (`penthouse-702-11.jpg`,
`two-king-room-5.jpg`, ...) and add a line for each in `lib/room-media.ts`.
