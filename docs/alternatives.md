# Alternatives

Designs that were considered and not built, with why and what would bring
each back. Read this before redesigning a piece, or when a fix isn't working,
to avoid re-deriving a rejected approach. The living plan (`docs/plan.md`)
describes how the code works now.

## Tracklist picker

- **Suppress the picker's own writes with a "writing now" flag** (rejected,
  2026-10-07). Idea: ignore the row observer while the picker writes. It
  can't work here: the fork's `runScript` is synchronous, but observer
  callbacks run as a microtask after the flag has been cleared. The chosen
  rule instead records the picker's writes straight away, so the observer's
  later read matches the current snapshot and is dropped. Bring back only if
  that rule starts recording false undo steps.

- **Key tracks by title** (rejected, 2026-10-07). Two tracks with the same
  title would then share one tether entry. Positions are the key; a repeated
  position is split by occurrence (`1#1`, `1#2`).

- **Strip the old prefix when a release pick is removed** (not chosen,
  2026-10-09). The alternative to the chosen behaviour: a track artist
  following a removed release artist is written by its plain name, which
  is what Skip writes. Stripping would have removed the link without leaving
  a name. Bring back if the plain name is unwanted on those tracks.

- **Capture each track's base title at the first apply** (rejected,
  2026-10-09). Anything typed before the first link became the title Reset
  returned to. Now every track is tethered to the imported title when the
  picker opens (`tetherTrackTitles`).

- **Put the Reset button in its own table column** (rejected by the user,
  2026-10-09). It widened the table. The chosen placement appends a span to
  the Time cell and positions it just past the cell's edge. A plain span after
  the input wrapped under the time.

- **Wait for Apply before a choice changes the tracklist** (kept as the
  alternative; the user chose immediate apply, 2026-10-09). Immediate apply
  is a behaviour change from the earlier design. Bring back if immediate
  writes cause unwanted tracklist changes.

## Release artist picker (Filed Under)

- **Skip any RYM addition whose id is in `managedIds`** (the original
  design; root cause of the "forever unable to link" bug, 2026-10-07). The
  set kept every id the picker had ever linked, so a re-picked artist was
  ignored. Now the set only decides what sync may remove, and a pick counts
  when RYM adds a new entry that no other row has chosen.

- **Track entries the picker itself added, and ignore only those**
  (proposed 2026-10-09, not built). It was replaced by the chosen-ids rule,
  which needs no extra state and handles removal and re-pick.

- **Hide parent artists another row already inherits from the dropdown**
  (replaced, 2026-10-09). The user wants every parent artist offered, so two
  rows can inherit the same one. Bring back only if that causes real
  confusion.

- **Re-picking a parent artist counts as "linked"** (not chosen). It counts
  as "inherited", which only changes the status text, since both give the
  same token. Bring back if the difference matters to the user.
