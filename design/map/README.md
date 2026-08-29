# Wine region map — design canvas

Exploration for a page that plots the log on a stylised wine map, so a run of
bottles you liked reads as a cluster over a place whose name you can then learn.

Published canvas: https://claude.ai/code/artifact/5a1e8612-fa95-4c07-9003-38ec2f847e39

## What's here

| File | What it is |
| --- | --- |
| `Main.dc.html` | The page itself, clickable: world → country → region |
| `DataModel.dc.html` | What a bottle stores today, and what a region-level map needs |
| `DirectionA/B/C.dc.html` | Three map treatments — atlas, tile map, country plate |
| `canvas.json` | Where the artboards sit, and the sticky notes |

`wine-region-map.html` is the published canvas — roughly 2 MB, most of it a
bundled editor, and rebuilt from these sources every time. It is deliberately
not committed; see `.gitignore`.

## The map geometry is real, not drawn

The coastlines are Natural Earth outlines (`world-atlas`, 50m for the country
plates and 110m land for the world), simplified with Ramer–Douglas–Peucker down
to a stylised hairline, and the region marks are placed from real coordinates
through the same projection so they land where they belong.

This matters because the first version was hand-drawn from memory and was
unusable — Italy did not read as Italy. Two things bite if it is ever
regenerated: RDP degenerates on a closed ring, whose first and last point are
the same, so a ring has to be split at its farthest point and simplified as two
chains; and Spain's geometry includes the Canary Islands, which drags the
bounding box far enough south-west to wreck the projection unless rings are
clipped to a mainland window.

## Rebuilding

The canvas is re-seeded from these sources with the `design` skill's helper —
`/design` in Claude Code, then edit these files and re-seed. Nothing here is
imported by the app; it is a prototype, and the palette is copied from
`src/app/globals.css` rather than shared with it.
