# Tracklist and release-artist pickers (2026-10)

The fork's tracklist artist-link picker, release-artist picker and their additions, and the upstream port as kknq/even-better-rym#150. kknq merged #150 on 2026-10-29 and then rewrote much of it for upstream v3.0 (`9d7f253`, `e26d990` and others). Since the v3.1.0 sync (`docs/archive/upstream-sync-3.1-2026-11.md`) the fork runs kknq's version, so the fork-side code described here, including the untested `/simplify` commit `e626c8b`, is mostly gone. kknq's picker also appears on non-VA releases with an opt-in "Add to track titles"; the user chose to keep that (2026-11-06). Moved out of `docs/plan.md` on 2026-11-06.

- Tracklist artist-link picker (started 2026-10-01 on branch
  `tracklist-artist-links`, **confirmed working in Safari and merged into
  `main` on 2026-10-02; a few edge cases are unchecked, and the upstream PR
  kknq/even-better-rym#150 is open**, see "Upstream PR" below). Goal: on import,
  prefix track titles with `[ArtistNNNN] - ` links for per-track artists
  without ever guessing which RYM artist is meant. The earlier bulk
  auto-link (`5ed78c7`, credits flavor) was pulled because it clicked the
  first search result blindly; per the user, a RYM mod objected to the
  resulting wrong links. New approach (user's idea): collect each *unique*
  track-artist name, show the user one picker per name, then apply each
  chosen link to every track with that name. Scope is track-title links
  only (option 1), not credits.

  Findings:
  - `fillTracks` (`release-submission/utils/fillers.ts`, upstream kknq
    code) writes `position|title|duration` only and never uses
    `track.artists`; the picker rewrites titles afterward instead of
    touching it. Only Apple Music sets `Track.artists` (now one entry per
    distinct artist; see below). Spotify drops per-track artists and `alert()`s on likely VA
    releases. Beatport bakes plain `"Name1, Name2 - "` text straight into
    `title`. So per-service artist data has to be normalized before any of
    this works beyond Apple Music.
  - **No custom search UI** (user's call): the picker is RYM's own "Insert
    link to artist or work" popup, so the user sees RYM's real results and
    we don't need to know what a result row contains. Popup internals,
    verified from `cdn.sonemic.net/2.5/js/shortcut.js` (fetchable; only
    rateyourmusic.com itself is Cloudflare-blocked), the saved
    `Release Editing - Rate Your Music.html`, and the user's Web Inspector
    paste of the iframe:
    - `openShortcut(element)` shows `#shortcut` and calls
      `viewshortcut('shortcutartist','')`, which loads
      `/go/search2?type=shortcutartist&func=` into `#shortcutsearchframe`.
    - The iframe's search box is a GET form (no `action`, so it submits to
      the same path) with `#searchterm` plus hidden `searchtype=a`,
      `searchdest=a`, `func=`. To pre-fill, either fill `#searchterm` and
      submit that form through `contentDocument` (same origin). That approach
      is the one implemented, and it's confirmed working in Safari: the frame
      loaded `go/search2?searchterm=…&searchtype=a&searchdest=a&func=`.
    - The release-edit page's inline `createShortcut(type, assoc_id, text)`
      inserts into the page-global `currentElement` and does **not** close
      the popup (`closeShortcut()` is commented out), unlike the CDN
      version. In the user's Safari, though, the result rows' inline
      `onclick` never reaches it (see "First Safari test" below), so the
      picker doesn't use `createShortcut`/`currentElement` at all.
  - **One pick per individual artist (option 1).** Dedupe artist names
    across tracks and have the user pick once per name. Each pick applies to
    every track that name appears on. Example: tracks `A` / `A & B` /
    `B & C` need three picks.
  - **Artists are separated the way Apple Music separates them, not by
    splitting text** (user's call, so band names like `Simon & Garfunkel`
    stay whole). Verified in `apple_music_source.html`: each track's
    `"subtitleLinks"` array has **one entry per distinct artist**, each with
    its own Apple artist ID (track 17 there has `["Parallx", "NENDZA"]`).
    The combined display string (`"artistName":"Parallx & NENDZA"`) is a
    separate field. The old `extractTrackArtist`
    (`services/applemusic/track-artists.ts`, our own code, not upstream)
    read only `subtitleLinks[0].title`, so a multi-artist track silently
    lost every artist after the first. It now returns every entry's `title`
    as `Track.artists`, which fixes the loss and gives the per-artist list
    with no delimiter guessing. The saved file
    has no band-with-`&` example, so treating one as a single entry is
    inferred from Apple's per-artist link model, not observed.
  - The first capture mechanism (a hidden scratch input read through
    `createShortcut`) failed and was replaced by reading the clicked row
    directly (below); see `docs/alternatives.md`.
  - Final title per track:
    `arrayToArtists(names.map(name => token ?? name)) + ARTIST_SEPARATOR +
    capitalizedTitle`, in the track's own artist order (not pick order).
    Capitalize first so `capitalize` never touches tokens or names.
    Gotcha: `arrayToArtists` mutates its input (`pop()`), so pass a copy.
  - Layering: splitting/grouping and title building as pure
    functions in `utils/` with tests; page-world popup driving in
    `utils/page-functions.ts`; the picker panel in `use-cases/`.

  Decisions (user, 2026-10-01):
  - **No preselection.** Every artist starts unpicked, even on an exact name
    match, because RYM has many same-name artists. This overrides
    `docs/todo.md`'s "auto-select exact match" item for this feature.
  - **Every track gets a prefix, always** (user, 2026-10-01, replacing the
    first rule of "only tracks whose artists differ from the release's").
    A track with no artists of its own uses the release artists. Apple Music
    leaves `subtitleLinks` empty on tracks by the album artists, e.g. 48 of
    the 57 tracks on Vholume (Original Soundtrack) by 1000 Eyes & Tom
    Schley, so under the old rule those tracks got no prefix.
  - **Skipped artist:** keep the plain-text name in the prefix
    (`[Artist123] & Some Name - Title`).
  - **Apple Music first.** Spotify/Beatport/LiveMixtapes switching to
    per-track artist data is a separate follow-up, tracked in `docs/todo.md`.

  Implementation (2026-10-01; compiles and unit tests pass):
  - `applemusic/track-artists.ts`: `extractTrackArtists` returns every
    `subtitleLinks` title, using a string-aware bracket matcher plus
    `JSON.parse`. `getTrackArtists` returns `Map<number, string[]>`.
  - `release-submission/utils/track-artist-links.ts` (pure, tested):
    `withReleaseArtistFallback`, `getDistinctTrackArtists`, `buildLinkedTitle`,
    `buildRelinkPlan`, `relinkTracklistLines`, `unlinkTracklistLines`.
  - `utils/page-functions.ts`: `openArtistLinkPopup(anchorId)`,
    `closeShortcutPopup`, `showAdvancedTracklist`/`showSimpleTracklist`.
    `utils/shortcut-popup.ts`: `prefillArtistSearch` loads
    `/go/search2?type=shortcutartist&func=` fresh in the popup iframe, then
    fills and submits its `#searchterm` form.
  - `use-cases/artist-link-picker.tsx`: panel below `#tracks_adv`, driven by
    `importEvent`. A pick auto-advances to the next unpicked artist, and
    Apply rewrites `#track_advanced` (repeatable; see "Follow-up" below).

  First Safari test (2026-10-01): opening the popup and filling in the
  search both worked (the frame loaded
  `go/search2?searchterm=Tom+Schley&searchtype=a&searchdest=a&func=`), but
  clicking a result did nothing. Temporary logging showed RYM's
  `createShortcut` was never called, **even from RYM's own popup with the
  picker uninvolved**. Each result row is
  `<div onclick="window.parent.createShortcut('a', 'NNN');return false;">`
  (inline handler), and those inline handlers don't run in the user's Safari.
  Suspected cause: the console's "Refused to execute a script … 'unsafe-inline'
  … Content Security Policy" errors. Interference from AdGuard or the
  userscript manager (both inject into that frame) is not ruled out.
  Click fix: `watchArtistResultClicks` (`utils/shortcut-popup.ts`) adds a
  capture-phase click listener to the frame's `contentDocument` (re-attached
  on every frame `load`) and reads the artist id from the clicked row's
  `onclick` attribute text with `parseArtistResultId` (tested), so nothing
  depends on RYM's handler running. This removed the hidden scratch input,
  the `setCurrentElement` call, and the picker's use of
  `EbrArtistShortcutInsertedEvent`. Temporary logging removed.

  Second Safari test (2026-10-01): **clicking a result now links the
  artist** (confirmed by the user). Apply only prefixed the tracks whose
  artists differed from the album's, which led to the every-track rule
  above. In the third test the album-artist tracks were prefixed with
  "Various Artists". Root cause: `getIsVariousArtists`
  (`applemusic/resolve.ts`) matched `"subtitleLinks":[{"title":"Various
  Artists"` anywhere in the track-lockup script, and on this page that hit a
  recommended album ("Lunacid (Original Game Soundtrack)") listed after the
  tracklist. The whole release was treated as VA, so the release artists
  (and the fallback) became "Various Artists". This contradicts what
  `b99039c` meant to do ("check the album-level subtitleLinks"). Fix:
  `getAlbumHeaderArtists` (`track-artists.ts`, tested) reads only the
  script's first `subtitleLinks` array, which is the album header on both
  pages checked (Vholume: `["1000 Eyes", "Tom Schley"]`, before the first
  `trackNumber`; `apple_music_source.html`: `E.DN`, likewise). A real VA
  page hasn't been checked, so "the VA header comes first" is inferred.
  This also fixes the release-artist field, which was being filled with
  Various Artists on such pages.

  Third Safari test (2026-10-01): **the user confirmed linking and Apply
  both work** on Vholume, with album-artist tracks prefixed with
  `[Artist1639184] & Tom Schley`.

  Follow-up (user, 2026-10-01): Apply must stay clickable so a changed
  link or name can be reapplied; it no longer locks into "Applied". To keep
  a second Apply from stacking a second prefix, the picker remembers the
  plan it last applied (`appliedPlan`). Each Apply first runs
  `unlinkTracklistLines(text, appliedPlan)` to strip exactly those prefixes,
  then `relinkTracklistLines(text, newPlan)`. Stripping only removes an
  exact match (`removeLinkedPrefix`), so a title the user edited by hand
  keeps its edit, but if they changed the prefix itself it gets a second
  prefix. Reapply confirmed working in Safari by the user (2026-10-01), and
  the work (`bffb8ac`) was fast-forwarded into `main` on 2026-10-02.
  Popup internals written into `CLAUDE.md`. Still unchecked: a real VA
  album still imports as Various Artists (the header-only check changes
  every Apple Music import, so this is the one possible regression on
  `main`); the popup's position beside the panel; and a band name
  containing `&` arriving as one Apple Music entry.

  Upstream PR (2026-10-02 first port; the picker work was finished and
  committed 2026-10-10): kknq/even-better-rym#150, open, from
  `ArkfallBravo:tracklist-artist-links-upstream`, which is based on
  `upstream/main` and pushed to `origin`. Its commits and the port's
  async-`runScript` changes are described in "Upstream port" below. Upstream
  has no per-track Apple Music artists (PR #65 was closed unmerged), so the
  PR carries `Track.artists` and `track-artists.ts` (without
  `getAlbumHeaderArtists`, since upstream has no VA detection). The branch
  tracks `origin` now, so a bare `git push` on it goes to the fork. The PR
  body asks kknq whether "[unknown artist]" should count as a release row's
  link. To test it in Safari, see `CLAUDE.md` ("Testing an upstream-based
  branch in Safari").
  Review status (2026-10-16): kknq asked on 2026-10-11 for test data (URLs
  used during implementation). The user's answer was posted as a PR
  comment (https://github.com/kknq/even-better-rym/pull/150#issuecomment-6217788708),
  and the PR description was rewritten to cover the guest-credit and
  bonus-track commits, the Link/Text/Skip buttons, the unchecked plain-text
  credit on submit and the "Bonus Track" title edge case. The test
  releases, all imported from Apple Music in Safari:
  - Vholume (Original Soundtrack),
    https://music.apple.com/us/album/vholume-original-soundtrack/6808635278:
    VA with per-track artists (Konstantin Schimanowski, 1000 Eyes, Tom
    Schley), for the track picker, title edits, Reset and Undo/Redo.
  - For Inherit from parent, Vholume imported on 1000 Eyes' add-release
    page, https://rateyourmusic.com/releases/ac?artist_id=1639184.
  - Northwind, https://music.apple.com/us/album/northwind/1027973195:
    non-VA, Sharm as a guest on tracks 2 and 12, and it has bonus tracks.
  Waiting on kknq's review; the "[unknown artist]" question is unanswered.
  Decided by the user (2026-10-06): strip the file headers on the upstream
  copies, and fix the `require-await` error in `artist-link-formatting.tsx`
  (the user's own PR #82 code) in this PR by dropping its `async` and
  calling it outside `Promise.all` in `app.tsx` (as the fork's `44a8bcb`
  does; otherwise `await-thenable` fires).

  Next change, 2026-10-06 (**built on branch `artist-pickers` off
  `sync-upstream`; the user confirmed everything works in Safari and it is
  committed there, not pushed. Upstream port built but not committed; see
  "Upstream port" at the end of this entry**): a
  **release-artist ("filed under") picker** plus
  changes to the tracklist picker, shipped upstream as one PR with two
  commits (tracklist picker, then release picker), since the tracklist
  prefill reads the release picks. Origin of the problem: upstream's
  `fillArtist` (Jake Cheek, `dd6095c`, 2021) searches each imported release
  artist and clicks RYM's top result unchecked, on every import (single- or
  multi-artist), unless the "Artists" import field is unticked. Decisions
  (user, 2026-10-06):
  - Tracklist picker shows only if some track's artists differ from the
    release's, compared per artist: a track differs if it has an artist
    not on the release or lacks one of the release's artists (so a track
    by A alone on an A & B release differs). Empty track artists count as
    matching. RYM's docs say an all-matching release lists no track
    artists. When it shows, every
    track still gets a prefix, as before.
  - A track artist spelled identically (case-sensitive) to an imported
    release artist is prefilled with that release row's result: the link
    if linked or inherited, plain text if skipped. This copies the user's
    own pick, so it doesn't conflict with "no preselection" above.
  - When every tracklist row is filled, the picker auto-applies; it stays
    usable and Apply still works afterwards. A later release-picker change
    updates prefilled rows and re-applies, except rows the user changed in
    the tracklist picker.
  - Release picker rows: Link / Skip / Inherit from parent. Parent
    (inherited) filed-under artists auto-pair one-to-one with imported
    names by loose exact match (ignoring case, accents, punctuation,
    spacing; rejected: an edit-distance similarity score, which can pair
    the wrong artist). Inherit can be toggled on any row, with a dropdown
    of unused parent artists, and toggled off again. Parent artists no row inherits are removed.
  - Link uses RYM's own filed-under search box and result list; the pick
    is read from the new `#filed_under_performerx` entry. Clicking a result
    there does add the artist in the user's Safari (confirmed 2026-10-06),
    unlike the shortcut popup's inline handlers.
  - In the fork this replaces `7e3edd0`'s `filedUnderPerformersMatch`
    logic; work on a new branch off `sync-upstream`, then port.
  Implementation (compiles; Biome, tsc, ESLint and 286 tests pass):
  - `fillers.ts`'s `fillArtists` no longer searches. For VA it ticks VA
    and clears the list as before; otherwise it dispatches
    `releaseArtistsEvent` with the names, or with `[]` when the "Artists"
    import field is off, so the pickers never keep the previous import's
    artists. `fill` is now synchronous (so `import-controls.tsx`, upstream
    code, calls it without `await`).
  - `utils/release-artist-links.ts` (pure, tested): loose name matching,
    one-to-one inherit pairing, the filed-under add/remove plan (only
    removes ids the picker manages: the parent's plus ones it linked), and
    the name-to-label map.
  - `utils/filed-under.ts`: reads entries from
    `li.sortable_filed_under_performer` and edits the list through RYM's
    own `addFiledUnder`/`deleteFiledUnder` via `runScript` (RYM's own
    `selectShortcut(..., "filedunder")` passes an empty label, so it isn't
    used). New picks are read with a `MutationObserver`.
  - `use-cases/release-artist-picker.tsx`: panel placed just before
    `#section_filed_under`, because RYM's `updateFiledUnderCoalesce` hides
    that section while "same as parent" is selected (when every artist is
    inherited, the form stays in that mode, and Inherit must still be
    reachable). Every choice change reconciles the filed-under list,
    reorders it to row order (RYM credits artists in list order, and new
    entries are appended at the end) via `updateFiledUnderOrder`, switches off "same as parent" whenever the chosen artists differ
    from the parent's, and publishes `releaseArtistLabelsEvent`. The
    starting labels are published synchronously from the
    `releaseArtistsEvent` listener, before `importEvent`, so the tracklist
    panel never mounts with the previous import's labels.
  - Tracklist picker: hidden unless `hasDifferingTrackArtists`; labels are
    the release labels overridden by the user's own picks
    (`mergeArtistLabels`); auto-applies on every release-label change that
    leaves all rows labelled. Row markup shared in `use-cases/picker-row.tsx`.
  - Known quirk: importing twice on the same page treats the first import's
    linked artists as parent entries, so they show as "inherited from
    parent". The result is still correct.

  Upstream port (first built 2026-10-06, **re-ported with the
  tracklist-picker additions and committed on
  `tracklist-artist-links-upstream` on 2026-10-10 after the user's Safari
  test; pushed to `origin` and opened as kknq/even-better-rym#150 on
  2026-10-10**). The branch was fast-forwarded to
  `upstream/main` `567497b`, then holds two commits: `c706026` (Apple Music
  per-track artists: `Track.artists`, `track-artists.ts`, `resolve.ts`) and
  `c631495` (both pickers, the queues and the `fillers.ts` change). The
  earlier two-commit split (tracklist picker, then release picker) was
  dropped, since the tracklist picker now follows the release picks
  throughout. Built from the fork's `artist-pickers` files plus the async
  changes below; the fork's Apple Music geo-host fix `cfafc1d` was left
  out as a separate fix. Left to do:
  - Respond to review on #150 (see "Review status" above).
  - Differences from the tested fork code, all because upstream's
    `runScript` is async (see `CLAUDE.md`):
    - every filed-under add, remove and reorder is awaited, and
      `syncFiledUnderEntries`/`clearFiledUnderEntries` run through one
      module-level queue in `filed-under.ts`, since the list is page-wide
      (a per-panel queue, the first version, missed the VA clear and a
      remounted panel's first sync);
    - every advanced-tracklist edit goes through
      `editAdvancedTracklist` (now in `utils/simple-tracklist.ts`; the
      first port's `tracklist-editor.ts` is gone): it
      waits its turn in one queue, switches to advanced, applies a text
      transform, and switches back. Both the picker (`replaceArtistLinks`)
      and kknq's `fillTracks` use it (user approved touching `fillTracks`,
      2026-10-07; the rejected alternative of calling `fillTracks` from the
      picker is in `docs/alternatives.md`). `fill` reaches
      `fillTracks` without an earlier `await`, so the import's write is
      queued before `importEvent` and always lands before a picker apply.
      kknq's `tracklist-controls.tsx` still clicks the switch buttons
      directly (a user toggle, not a text edit; left alone);
    - `fill` stays async, with only `fillCoreFields` made synchronous, so
      kknq's `import-controls.tsx` stays untouched. The release picker's
      synchronous label publish still happens before `importEvent`, because
      `import-controls` calls `void fill(...)` first and `fillArtists` runs
      before any `await`.
  - Upstream's own early return when the filed-under list already has
    entries was dropped, since otherwise issues under a parent would never
    reach the picker.
  - `shortcut-popup.test.ts` mocks `~/shared/utils/dom`, mirroring
    `applemusic/search.test.ts`.
  - Upstream-build test results (2026-10-07): 1 (tracklist import, with
    and without preserved lengths, "Tracks" unticked) and 2 (single
    artist) pass. 3 found the manual-edit bug and led to the additions
    below. 4 to 7 not run yet; the "[unknown artist]" question is still
    unanswered. 2026-10-10: the user tested the re-port in Safari and said
    to commit it, without reporting results per check, so whether
    "[unknown artist]" should count as a release row's link is still open.
    Image download spinning in that build is upstream's missing Safari
    fallback (see `CLAUDE.md`), not the port.
  - Port simplify pass (2026-10-06): fixes folded into the two commits, no
    separate `simplify:` commit. Skipped: batching the filed-under edits
    into one `runScript` (unknown whether RYM renumbers entries after a
    delete); skipping an apply whose plan is unchanged (minor); keeping
    `injectArtistLinkFormatting()` inside `Promise.all` (trips ESLint's
    `await-thenable`). The user then chose to route kknq's
    `fillTracks` through the shared tracklist editor (above).
  - Upstream's "[unknown artist]" button (`file-under-controls.tsx`,
    added after #124): clicking it while a release row is active records
    it as that row's link. Asked in the PR body.

- Tracklist-picker additions (started 2026-10-07, **committed on
  `artist-pickers` after passing the user's Safari test 2026-10-09; ported
  upstream and committed 2026-10-10, see "Upstream port" above**; plan approved 2026-10-07). Requested by the user after test 3 of the
  upstream build. Built on the fork (`artist-pickers`) first, then ported
  again (user's choice; the port's async queue and `editAdvancedTracklist`
  code will need the same additions).
  1. **Manual title edits untether a track.** Bug today: typing into a
     track's title, then changing a release pick, re-prefixes the user's
     text. Cause (from the code, not reproduced): `replaceArtistLinks`/
     `unlinkTracklistLines` only strips the old prefix when the title still
     starts with it, then `relinkTracklistLines` adds the new prefix in
     front of whatever is there. Fixed by remembering the title the picker
     last wrote per track key and skipping tracks whose title differs.
     User decision: only **title** edits count (the picker never touches
     positions or durations). Tracks are keyed by position, not title, so
     same-titled tracks are independent; a repeated position is keyed by
     occurrence (`1#1`, `1#2`), answering the user's question about
     duplicates.
  2. **Reset button** to the right of the duration field on each manually
     changed track, which puts the track back under the picker's control.
     User clarification: Reset must immediately give the track every
     automatic change it missed while untethered, i.e. its base title
     prefixed with the labels last applied to the tethered tracks.
  3. **"Inherit from filed under..." dropdown** on each tracklist-picker
     row. User decision: it lists the **release picker's artists**; picking
     one makes the track artist follow that release row's label (so it
     updates when the release pick changes), even when the names are
     spelled differently. Built as `TrackArtistChoice` (linked token /
     skipped / following a release name) replacing `pickedLabels`; the
     identical-spelling prefill is the initial "following same name". User
     confirmed: a track artist can follow a release artist that isn't
     picked yet; it counts as unpicked until that release artist is picked,
     then updates automatically.
  4. **Undo/redo buttons** in the tracklist picker. User decision: cover
     **every tracklist change**, including the user's own typing, not just
     picker actions, but (later answer) **only the user's changes, never
     automatic re-applies**; see "Implementation" below. A typing step ends
     on the `change` event (blur/Enter); RYM's add/delete/clear-all/Copy
     Tracks are steps via the row observer. History resets per import.
  RYM's simple tracklist DOM, from the saved page `Release Editing - Rate
  Your Music.html` (line ~550 script, ~2497 markup):
  - Rows are `<tr id="track_N">` cloned from `#track_base` inside
    `#tracks_simp`, with inputs `track_track_numberN`,
    `track_track_titleN`, `track_track_lengthN` (plus a delete-row button
    cell first). The reset button goes in a `span.ebr-track-reset`
    appended to the length cell and absolutely positioned just past its
    right edge (`left: 100%`, cell made `position: relative`), so it sits
    outside the table (user's request, 2026-10-09). An extra `td` added a
    column; a plain span after the input wrapped under the time.
  - `goAdvanced()` builds `#track_advanced` from those inputs; `goSimple()`
    calls `clearAllRows('track_')` and rebuilds every row from the text. So
    any injected cells are wiped on each advanced/simple round trip (every
    apply) and must be re-added, e.g. from a `MutationObserver` on
    `#tracks_simp`. A delegated `input`/`change` listener on `#tracks_simp`
    survives the rebuilds.
  Status (2026-10-09): **every Safari check passed on the fork**
  (`main-CVkCmXX1.js`): typing untethers, Reset gives the imported title
  with current links and sits outside the table, the dropdown follows a
  differently spelled release artist, undo/redo and undo-keeps-auto-updates,
  repeated track numbers, and the release-picker removal, re-pick,
  duplicate, hand-added and every-parent-artist checks. The user kept the
  "choices apply immediately" behaviour. Committed on `artist-pickers`.
  A `/simplify` pass from `81dc759` (2026-10-09) was **committed as `e626c8b`
  without a Safari test: the user chose to skip it** (built as
  `main-D-ANBC5d.js`). If a release-picker or tracklist-picker regression
  turns up later, suspect this commit first and test against `2860fec`. It is behaviour-preserving: a
  shared `useLatestState` hook, a generic `withChoice`, shared separator
  constants, `getKeyedRows`, `watchTracklistRows` (reset slots no longer
  re-scan on field edits), one parse per filed-under change,
  `getUnchosenIds`, `canApplyChoices` and a named `reapply`.
  Port (2026-10-10): `tracklist-artist-links-upstream` was fast-forwarded
  to `upstream/main` first (kknq's `37364ea` and `567497b` touch neither
  the picker's files nor `dom.ts`/messaging), then the picker work was
  applied with the async `runScript` changes (see "Port caveat" below) and
  committed after the user's Safari test. The fork's `artist-pickers` stays
  unsynced until after the PR, as a separate task. The second sync
  (2026-10-10) later brought those 18 upstream commits, including
  `e1f45a5` ("[unknown artist] works again"), into `main`, so the
  "[unknown artist]" behaviour can now be checked on the fork too.
  - In simple mode the inputs are the source of truth, so a single-title
    change (e.g. Reset) could set the input directly without a mode switch.
  - Row helpers live in RYM's `cdn.sonemic.net/dist/rym25/js/legacy/basereq.js`
    (read 2026-10-07): `divClone` deep-clones `#track_base`, increments the
    global `counter` and inserts the row **before `#track_base` in its
    parent** (the table's implicit `tbody`). `deleteRow` removes `track_N`.
    `clearAllRows` deletes `track_0..counter` and resets `counter` to 0.
    So rows are the `tr[id^="track_"]` siblings of `#track_base`, ids can
    have gaps, and the position field (not `track_N`) is the stable key.
  - `goSimple` trims each field, so a title the picker wrote must be
    compared with the trimmed input value.
  Implementation (2026-10-07), as approved:
  - Pure modules: `utils/track-artist-links.ts` (track keys are position
    plus occurrence, e.g. `1#2`, so repeated positions stay apart; tether
    state of base and last-written title per key; `applyTrackTitles`,
    `getUntetheredKeys`, `resetTrackTitle`; the old
    `unlinkTracklistLines`/`relinkTracklistLines`/`removeLinkedPrefix` and
    `mergeArtistLabels` are gone), `utils/track-artist-choices.ts` (linked /
    skipped / following a release artist), `utils/edit-history.ts`,
    `utils/tracklist-picker-state.ts` (the undo snapshot and
    `applyChoices`/`resetTrack`). DOM: `utils/simple-tracklist.ts`. Hook:
    `use-cases/tracklist-history.ts`.
  - **Undo/redo covers only the user's changes** (user's answer when asked
    whether release picks should be undoable). A release-label change
    replaces the current snapshot instead of adding a step, and undo/redo
    re-applies the *current* release labels to the restored snapshot's
    tethered tracks, so an undo never reverses an automatic update.
  - Apply leaves untethered tracks alone; no keyboard shortcuts (user's
    answers).
  - Behaviour change, not in the user's request (kept by the user,
    2026-10-09): a tracklist-picker choice
    change (Link, Skip, dropdown) now re-applies straight away once every
    artist has a label, instead of waiting for Apply. Restoring an undo
    step has to re-apply its choices, so choices and the written tracklist
    can't be allowed to diverge. Apply still works and closes the popup.
  - `writeTracklistText` writes titles straight into the row inputs when
    only titles change in the simple editor (no rebuild, so focus and reset
    cells survive); anything else goes through one advanced/simple round
    trip (`writeThroughAdvanced`). After a write the snapshot re-reads the
    page, since `goSimple` trims fields.
  - **Port caveat (resolved in the 2026-10-10 port):** with upstream's
    async `runScript`, the row observer sees the rebuilt (trimmed) rows
    before the write's promise resolves, and a half-finished write leaves
    the page out of step with the snapshot. The port queues every
    tracklist write (the picker's and `fillTracks`) in `simple-tracklist.ts`
    and exposes `isTracklistEditPending()`; `recordOutsideEdits` records
    nothing while a write is queued or running, and `showCurrent` commits
    the expected snapshot first, awaits the write, then re-reads the page
    only if no later write is queued. The panel mounts only after
    `waitForTracklistEdits()` (so it reads the import's filled tracklist),
    and an import closes the previous panel straight away, since otherwise
    its label effect would queue a write of the old tracklist behind the new
    fill. A user edit made during a write is folded into the write's
    snapshot rather than becoming its own undo step.
  - The pure undo pieces (`recordUserChange`, `reapplyReleaseLabels`) live
    in `tracklist-picker-state.ts` and are tested, including "undoing typing
    keeps a later automatic update".
  - The release picker's `releaseArtistLabelsEvent` now carries
    `{ names, labels }` (`ReleaseArtistLabels`), so the dropdown lists
    unpicked release artists. `InheritSelect` moved to `picker-row.tsx`.
  - Checks: 312 tests, Biome, tsc, ESLint, `build:safari` and `xcodebuild`
    pass.
  - **Release-picker removal bugs (found by the user in Safari,
    2026-10-07, fixed in `4ca0177`):** removing an artist from Filed
    Under left its row "linked"/"inherited" (so the tracklist kept the
    token, and a removed inherited artist couldn't be re-inherited because
    the dropdown already showed it), and re-picking a removed artist was
    ignored forever. Root cause: the picker never watched removals, and
    its pick watcher skipped any id in `managedIds`, which kept every id it
    had ever linked. Debug logs also confirmed that RYM adds a second copy
    when an already-listed artist is picked (its `addFiledUnder` duplicate
    check compares `[ArtistN]` with a bare `N`, so it never matches).
    Fix: `watchFiledUnderChanges` reports each list change as the newly
    created `li` elements (moved ones don't count) plus the ids still
    listed; the pure `applyFiledUnderChange` clears rows whose artist is
    gone and gives the first new artist no *other* row has chosen to the
    active row (the picker's own sync adds are always for chosen ids);
    a re-picked parent artist counts as inherited.
    `removeRepeatedFiledUnderEntries` deletes later copies. `managedIds`
    now only decides what sync may remove (the parent's ids plus any ever
    chosen), and an added artist no row ends up choosing is dropped from
    it, so a parent artist the user re-adds by hand isn't deleted by the
    next sync (found by a side agent, pre-existing; user asked to fix). The panel keeps `{choices, activeName}` in one state read via
    a ref, so the watcher is set up once per session. In the port (async
    `runScript`), every list edit and every watcher report runs through one
    queue in `filed-under.ts`, so the watcher only reports once an
    in-progress sync has finished; otherwise a report between two adds
    would clear the second chosen artist.
  - **Removing a release pick drops the tracklist link** (user's request,
    2026-10-07): once the picker has written the tracklist
    (`appliedPlan` non-empty), a track artist following an unpicked
    release artist is written by its own name, as Skip does
    (`getWrittenLabels` / `withUnpickedFollowedNames`). Before the first
    write the old gate stays: such an artist counts as unpicked and Apply
    is disabled. A row the user set back to "not picked" still blocks
    automatic updates.
  - **Reset returns the imported title** (user's report, 2026-10-09: text
    typed before the first link became the base Reset returned to). Root
    cause: the base was captured at the picker's first write. Fix:
    `createPickerState` tethers every track to the tracklist the import
    wrote (`tetherTrackTitles`), which is on the page before
    `importEvent` fires because `fill` runs first. So typing before the
    first link also untethers the track. Regression test: "resets a track
    typed over before the first write to its imported title".
  - **Every parent artist is offered in every release row's dropdown**
    (user's request, 2026-10-07, for edge cases the name matching misses).
    `getInheritableEntries`, which hid parent artists other rows already
    inherit, is gone. The import-time loose-name pairing is unchanged. Two
    rows may now inherit the same parent artist; `getChosenEntries` lists
    it once. The user accepted this (more control for the user).
  - The dropdowns' "not inheriting" option now always reads "Don't
    inherit" (user's request), replacing the "Inherit from parent…" /
    "Inherit from filed under…" prompts.
  Design points settled while drafting the plan (2026-10-07):
  - **One rule records undo steps.** On any title/position/length `change`,
    row add/delete mutation (childList on `#track_base`'s parent only, so
    injected reset slots don't retrigger it) or advanced-textarea `change`,
    read the tracklist text and push a step only if it differs from the
    current snapshot. The picker pushes its own writes straight away, so the
    observer's later read matches and is dropped. This rule covers
    add/delete/clear-all/Copy Tracks without special cases. (Rejected
    alternatives: `docs/alternatives.md`.)
  - **Snapshots hold the tracklist text, the tracklist-picker choices and
    each position's base and last-written title**, so undo can't leave
    untethered status out of step with the titles.
  - **Reset needs the base title as it is on the page**, not `Track.title`:
    `fillTracks` capitalizes and turns "untitled" into `[untitled]`. Capture
    each position's title from the page when the picker opens, right after
    the import fills the tracklist (originally at the first apply; changed
    2026-10-09, see "Reset returns the imported title").
