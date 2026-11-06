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

- **Capture a pick through `createShortcut` and a hidden scratch input**
  (rejected, 2026-10-01). Point RYM's `currentElement` at a hidden input
  and read the id from `patchCreateShortcut`'s
  `EbrArtistShortcutInsertedEvent`. It failed because the popup rows'
  inline `onclick` never runs in the user's Safari, so `createShortcut`
  is never called. The picker reads the clicked row's `onclick` text
  instead. Bring back if those inline handlers start running.

- **Have the picker call `fillTracks` itself** (rejected, 2026-10-07, in
  the upstream port). It would rewrite the whole tracklist from the import
  (losing the user's edits), recapitalize plain artist names, need the
  import options, and ignore the "Tracks" checkbox. Both go through
  `editAdvancedTracklist`'s queue instead. Bring back only if the picker
  ever needs a full re-import of the tracklist.

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

## Raised by the 2026-10-09 simplify review (not done)

- **Patch RYM's `addFiledUnder` to skip artists already listed** (deferred).
  It would replace removing repeats after the fact
  (`removeRepeatedFiledUnderEntries`), as `chart-shortcuts` patches
  `RYMchart`. It changes page behaviour and needs a Safari test. Bring back
  if the remove-after pass causes flicker or extra list changes.

- **Keep `managedIds` in `ReleasePickerState`** (deferred). It is a ref in
  the component, updated from the sync effect and the watcher. Moving it
  into the pure state would put the "which entries may the picker remove"
  rule under test. Bring back if that rule breaks again.

- **Make Apply a "Done" button** (deferred; the user's call). Choices apply
  immediately, so Apply only picks up outside edits and closes the popup.

- **Model RYM's field trimming in pure code instead of reading the page
  back after each write** (deferred). `showCurrent` reads the tracklist
  after writing it. A pure trim would avoid the read, but the no-false-undo
  rule depends on the two matching exactly.

- **Return the same objects when nothing changed and compare by reference**
  (deferred). It would replace `isSamePickerState`'s JSON comparison. That
  comparison leaves out `appliedPlan`, so switching would change which
  edits count as undo steps.

- **Drop the popup click watcher's re-subscription on every choice change**
  (not worth it). It needs refs for the choices and release labels. The
  churn only happens while the popup is open.

## Port order (2026-10-10)

- **Merge upstream into `artist-pickers` before porting** (not chosen). The
  fork is missing 18 upstream commits, and merging them means resolving
  conflicts in fork-only code (Apple Music per-track artists, native
  settings) the port never uses. The port only needs a fast-forward of the
  port branch. Bring back when the fork's own branches need upstream's
  fixes, as a separate task.

- **Split the port into a tracklist-picker commit and a release-picker
  commit** (not chosen). The first port did this. The tracklist picker
  now follows the release picks throughout, so neither commit works on its
  own. Bring back only if kknq asks for smaller commits, which would mean
  splitting the PR's two commits further by hand.

## Guest credits

- **Link through RYM's own Credits search** (not chosen, 2026-10-12). The
  search box (`#credit_searchterm`, `searchCredits()`) would show RYM's
  results in `#creditlist`. The existing `fillArtist` clicks the top result
  without checking, which is the behaviour a mod objected to in the bulk
  auto-link. The guest picker reuses the "Insert link" popup and its click
  reading instead. Bring back if the popup's result clicks stop working in
  Safari; the Credits search's own result clicks are untested.

- **Treat a split release as non-VA by checking its track artists** (rejected
  by the user, 2026-10-12). A first draft counted a release as a split when a
  track lacked one of its artists. The user said a split is a VA release,
  so the only check is that the first release artist is "Various Artists".
  Bring back only if RYM stops treating splits as VA.

- **Put "[bonus track]" before the title** (not chosen, 2026-10-12). The
  request said "prepend", but the user chose after the title.

- **Fold the guest-credit commits into PR #150's existing two commits**
  (not chosen, 2026-10-12). That would need a force push. The user chose
  new commits on top, which is a plain push. Bring back if the PR's history
  needs cleaning before merge.

## Safari app build and Xcode repo

- **Copy the built app into `/Applications` with a Run Script phase**
  (reverted, 2026-07-28). A `ditto`/`mv` after "Embed Foundation
  Extensions", plus a shared scheme that ran the copied app. The copy
  worked, but Safari kept registering only the DerivedData build; the
  cause was never found. Replaced by `DEPLOYMENT_LOCATION = YES` with
  `DSTROOT`/`INSTALL_PATH`. Bring back only with
  `pluginkit -m`/Console.app evidence of why Safari picked the DerivedData
  copy. Full writeup: `docs/archive/safari-app-setup-2026-07-08.md`.

- **Auto-commit `EvenBetterRYM/` whenever the main repo is committed**
  (rejected, 2026-08-05). Generic commit messages and half-finished
  Xcode state could land silently. A reminder-only `.husky/post-commit`
  hook was chosen instead. Bring back if forgotten Xcode-repo changes
  become a recurring problem despite the reminder.
