# Todo

- Follow-ups the 2026-10-02 `/simplify` pass (`4e319a7`) skipped. None
  are urgent:
  - The artist-link picker loads RYM's search frame up to three times per
    artist: `openShortcut`, then `prefillArtistSearch` resetting
    `frame.src`, then the form submit. Waiting for `openShortcut`'s own
    load, or loading the results URL directly, would save one or two page
    requests. Skipped because it could cause a timing bug in the popup;
    needs a Safari test.
  - `tokenize.ts` defines "emoticon" two ways: the tokenizer's anchored
    `EMOTICON_REGEX` versus `splitPhrases`' `matchEmoticonAt`, which also
    requires whitespace or the start of the text before it (":P" right
    after "(" counts for one, not the other). Unifying them changes
    behavior.
  - The "switch to advanced, write `#track_advanced`, switch back"
    sequence exists three times: the fork's `showAdvancedTracklist`/
    `showSimpleTracklist` (used by the picker), kknq's `fillers.ts`, and
    kknq's `tracklist-controls.tsx`, which calls `.click()` directly.
    `fillers.ts`' comment says CSP blocks that. Sharing one helper means
    touching kknq's code, so ask first.
    The upstream picker port (2026-10-07) shares it through
    `editAdvancedTracklist` (`utils/simple-tracklist.ts`), used by the
    picker and kknq's `fillTracks`; the fork still has the three copies
    until that port is merged and synced back.
  - kknq's `arrayToArtists` (`shared/utils/string.ts`) mutates its input
    with `pop()`, so `buildLinkedTitle` has to copy the list first. Making
    it non-mutating also means touching kknq's code.

- Possible upstream PR (idea, not requested): upstream's image download
  doesn't work in Safari, because `background/download.ts` only calls
  `browser.downloads.download`. The fork's fallback (fetch in the
  background, then save through a data-URL link injected into the page)
  could go upstream the way the Apple Music fix did (#144). Seen
  2026-10-06 while testing the picker port; the cause is inferred from the
  code, not confirmed in Safari.

- Follow-up candidates surfaced but explicitly skipped by the 2026-09-06
  `/simplify` pass (see `docs/archive/apple-music-title-fix-and-simplify-2026-09.md`
  for why each was held back — none
  are urgent, listed here so they aren't lost):
  - `fetch.ts`'s direct-fetch-before-background-fallback always retries a
    doomed request for hosts that need the background path; a per-host
    CORS-failure allow-list/memoization would avoid the wasted round-trip.
  - `background/index.ts`'s tab-scoped dispatcher's catch-all fallback
    hardcodes `type: "fetch"` regardless of the original request's type —
    blocked on `DownloadResponse`/`ScriptResponse` (kknq's types) having no
    field to carry an error.
  - `use-release-info.ts`'s `fetchInfo` pushes the "commit complete state"
    decision to its callers (`cover-art-downloader.tsx`,
    `release-submission/app.tsx`), each reimplementing the same `if
    (isComplete(...)) setInfo(...)` check — could be centralized back into
    the hook via an `onComplete` callback parameter.


- **Bug found (2026-08-22)**: pressing a bound "Include descriptor" shortcut
  (`includeDescriptor`, e.g. the user's `Ctrl+Shift+O` binding) adds **two**
  chips to the chart's "Include descriptors" list — the correct matched
  descriptor (e.g. "dark") *and* a second, separately-removable chip
  literally labeled "Descriptors". Confirmed via screenshot: both are real
  filter chips with their own × remove button, not a section-header/grouping
  label. Does **not** happen when adding a descriptor the normal way
  (clicking it from RYM's native dropdown) — only via the shortcut path.
  Ruled out so far: not caused by the `/simplify` cleanup pass on this same
  session (that pass's only edit to `chart-shortcuts/app.ts` was
  parallelizing `main()`'s two startup awaits into `Promise.all`, nowhere
  near `applyItem`/`queryNativeBrowser`/`applyNativeMatch`); not caused by
  the `chart-shortcuts-customization` feature branch either — diffed
  `applyItem`/`queryNativeBrowser`/`applyNativeMatch` in
  `src/modules/chart-shortcuts/app.ts` against commit `740c2ef^` (the
  original hardcoded-shortcuts `chart-prefix-commands` module, pre-dating
  this entire branch) and the logic is byte-for-byte identical — so this bug
  (or its root cause) has existed since the very first hardcoded-shortcuts
  implementation. No literal `"Descriptors"` string exists anywhere in
  `src/shared/chart-shortcuts/` or `src/modules/chart-shortcuts/`, so the
  label is coming straight from RYM's own native search data
  (`RYMbrowser.resultCache`), not fabricated by this extension.

  Instrumented and tested (2026-08-22): added temporary logging around
  `queryNativeBrowser`'s candidate list/resolved `item`, around `applyItem`,
  and monkey-patched `RYMchart.addBrowserItem` itself to log every call (args
  + stack trace) from any caller. Reproduced the shortcut path once with a
  real descriptor ("heavy") — the logs showed `queryNativeBrowser` resolving
  exactly one correct item and `addBrowserItem` being called exactly once,
  with no second call from any source, and the bug did not occur on that
  run. It has not recurred since, including on this rebuilt-with-logging
  build. Instrumentation has been removed (all `[ebr-debug]` logging and the
  `addBrowserItem` patch reverted; `git diff` on `chart-shortcuts/app.ts` is
  now clean against the `/simplify` commit). Leaving this open as
  **unreproduced / status unclear** rather than closing it outright — the
  one confirmed occurrence had a real screenshot (two removable chips: the
  matched descriptor + a second chip literally labeled "Descriptors"), but
  the leading theory (a "browse this whole category" pseudo-entry in RYM's
  search results getting picked up alongside the real match) wasn't
  confirmed and doesn't fit the one instrumented run, which showed only a
  single clean add. The instrumentation was never committed (added and
  removed within the same working-tree session), so if it recurs, re-add
  logging around `queryNativeBrowser`'s resolved item and monkey-patch
  `RYMchart.addBrowserItem` to log every call + stack trace again, and
  capture the console output on the exact reproduction — ideally noting the
  specific descriptor typed and any browsing done earlier in that page
  session.

- Finish manual Safari testing for the `chart-shortcuts-customization`
  branch before treating it as done (see `docs/plan.md` for the full
  design writeup). Confirmed so far via the user's own screenshots/testing:
  the popup's Customize view, recording a combo, live conflict detection,
  and rebinding live-updating an already-open chart page (see the bug entry
  above) all work in the real Safari app. **Not yet confirmed**: native-mirror
  persistence across a full Safari quit/reopen, survival through Safari's
  "Clear History" (the entire reason the native mirror exists), and that
  `Ctrl+Shift+1/2/3` (previously dead on `main`, fixed by this branch's
  `event.code` switch) actually fire on the real chart page.

- The Mac modifier glyphs (`⌃⌥⇧⌘`) in the shortcut popup still don't fully
  match native macOS menu rendering (2026-08-22): switching the shortcut
  chip's font from monospace to the system UI stack fixed the flat
  "^"-style fallback, but removing the space between glyphs (to match
  native's tight packing, e.g. `⇧⌘N`) looked "more squished" than genuine
  macOS rendering per the user's own comparison — some rendering-metrics
  gap beyond font-family remains undiagnosed. Currently shipping with a
  space between glyphs (`⌘ ⇧ O`) as a compromise. Revisit only if
  pixel-exact native fidelity is actually wanted — see `docs/plan.md`'s
  "Platform-native modifier key labels" entry and `CLAUDE.md`'s note in
  the chart-shortcuts architecture section.

- Manually verify the platform-native modifier key labels (Option/Control/
  Command off Mac's word form, `⌃⌥⇧⌘` glyphs on Mac) in an actual Safari
  rebuild — not yet confirmed beyond the user's own screenshot comparison
  of the glyph rendering. See `docs/plan.md`'s "Platform-native modifier
  key labels" entry for what shipped and why.

- `EvenBetterRYM/project.pbxproj` has an unrelated 5-line uncommitted diff
  that predates the `chart-shortcuts-customization` session (2026-08-22) —
  left unstaged both times a commit was made in that repo during that work
  since it wasn't this feature's concern. Not investigated; decide whether
  to commit it as-is or check what changed it first.

- Bandcamp and Qobuz showed "NOT FOUND" (not an error) in the same
  search-panel run that surfaced the Tidal bug above, for the same
  "Violent Magic Orchestra – Death Rave" test pair — not yet checked
  whether that's a real bug (like Tidal was) or a legitimate no-match for
  that specific release. Worth a quick check before assuming autofind is
  otherwise healthy.

- `fetch.ts`'s direct-fetch path has a real bug found while diagnosing the
  Tidal issue above (not yet fixed, affects every service that calls
  `fetch()`, not just Tidal): on a non-2xx response, `if (response.ok)
  return ...` doesn't return, and no exception is thrown, so execution
  falls through to *also* fire a second request via the background-script
  fallback — meaning every failing API call silently double-fires. This
  isn't just wasteful; it's also a likely reason failure error text was
  inconsistent across attempts (which of the two requests' errors surfaces,
  or whether a rate limit gets hit on the second call, can vary run to
  run). Fix: return/throw immediately on a non-ok direct-fetch response
  instead of falling through.

- Tidal's `requestToken()` (`src/shared/services/tidal/auth.ts`) fetches a
  fresh OAuth token on every single search call, with no caching —
  combined with the `fetch.ts` double-fire bug above, this makes Tidal
  autofind more exposed to rate-limiting than it needs to be (Tidal's own
  developer community has reported 429s as early as the 3rd request in a
  burst). Worth caching the token for its `expires_in` duration.

- Decide whether to apply Xcode's "Update to recommended settings" prompt on
  `EvenBetterRYM.xcodeproj` (2026-08-14) — a checkpoint commit (`a8b383c` in
  the private `EvenBetterRYM/` repo) was made first specifically so this is
  revertible either way. See `docs/plan.md`'s "`EvenBetterRYM/` checkpoint
  commit" entry.

- Clean up the stray `EvenBetterRYM (macOS) copy-Info.plist` file and the
  `GENERATE_INFOPLIST_FILE`/`INFOPLIST_FILE` conflict on the macOS app
  target that likely produced it (2026-08-14, private `EvenBetterRYM/`
  repo) — see `docs/plan.md` for the diagnosis. Not urgent since the file
  is inert (not wired into any build phase), but the underlying settings
  conflict should get resolved.

- Fix `src/modules/background/index.ts`'s `setTabIcon`: uses
  `browser.action.setIcon`/`.setTitle`, which is `undefined` under the
  Safari build's Manifest V2 (should be `browser.browserAction` for V2).
  Causes an unhandled `TypeError` in the background console on every
  rateyourmusic.com navigation. Confirmed unrelated to the CORS
  investigation above — separate real bug.

- Import a real Various Artists album from Apple Music on `main` and check
  it still comes in as Various Artists. The VA check was narrowed to the
  album header on 2026-10-01 (see the picker entry in `docs/plan.md`) and
  hasn't been tried on a VA page since.

- Extend the tracklist artist-link picker (on `main`, see `docs/plan.md`)
  beyond Apple Music: make Spotify, Beatport, and
  LiveMixtapes return per-track artists as `Track.artists` data instead of
  baking plain names into `title` (Beatport/LiveMixtapes) or dropping them
  with an `alert()` (Spotify).

- Tracklisting import should strip "feat. <artist>" (and variants) out of
  track titles and instead add those artists to the track's credits with
  role "featured", rather than leaving them embedded in the track name.

- Tracklisting should show the search hint/query used for each artist match
  next to the result, so the user can proofread which search term produced
  which artist before accepting it.

- Tracklisting import should convert square brackets `[]` in track titles to
  parentheses `()`, to match RYM's expected formatting convention.

- Credits and track-artist matching need a real disambiguation strategy
  instead of the current guesswork. Two candidate approaches: (1) an
  extensive conditional/heuristic system that cross-references the imported
  release's genres against RYM's genre hierarchy to narrow which candidate
  artist is plausible, or (2) hand the artist hint + context to an AI model,
  preferably on-device to avoid per-call monetary cost — Apple's on-device
  AI (Apple Intelligence / Foundation Models framework) would be a strong
  candidate given this is a Safari extension already tied to a native macOS/
  iOS app wrapper.

- Separate, unrelated error surfaced in the extension background page's
  console while debugging the above (not yet investigated, not yet
  triaged/prioritized by the user): `[settings] failed to hydrate from
  native side – Error: Invalid call to browser.storage.local.set(). Disk
  I/O error.` — appeared on every background-page load. Confirm whether
  this is new or pre-existing, and whether it's actually causing any
  observable problem, before investigating further.

- Look into whether a browser-automation MCP connector (e.g. Playwright or
  Chrome DevTools MCP) is worth setting up so Claude Code can drive/inspect
  a live browser (run console commands, read DOM state) itself instead of
  relying on manually pasted console output during debugging sessions like
  the `chart-shortcuts` one.

- `npm run lint` currently fails on `main` for reasons unrelated to any
  recent feature work (surfaced 2026-08-06 while bringing `chart-searchbar`
  over): `src/modules/hide-votes/app.ts` has a pre-existing Biome error
  (`lint/style/useTemplate`), and Biome has no `vcs.useIgnoreFile` config so
  it also scans gitignored paths (`.claude/settings.local.json`, files under
  the untracked `EvenBetterRYM/` dir) and flags issues there too. Either fix
  the `hide-votes/app.ts` lint error, or add a `vcs` block to `biome.json` so
  it respects `.gitignore` — whichever is preferred, since right now
  `biome check` failing first in the `npm run lint` chain silently prevents
  `tsc`/`eslint` from ever running as part of that command.

- An old stash entry (debug `console.log` calls added to
  `src/modules/stream-links/stream-link.tsx` and
  `src/shared/services/applemusic/search.ts`, apparently from a prior
  debugging session) is sitting on the stash stack — surfaced accidentally
  2026-08-06 by an unrelated `git stash`/`git stash pop` and restored with
  a descriptive message rather than dropped. Find it by that message in
  `git stash list`, since its index shifts as other stashes are added. Needs the
  user's call: turn it into a real commit, or drop it.

- Check whether RYM accepts a plain-name credit line on submit. The guest
  credit picker's Text choice adds RYM's manual "unlinked credit" line
  (`addCredit('a', 'XXX', name)`) with the name typed in. It's unchecked
  whether RYM keeps that name when the release is submitted. Check on a real
  release (see `CLAUDE.md`, "RYM's credits list").

- Decide whether the release-artist picker's Skip should match the tracklist
  and guest pickers. Its Skip still writes the plain name, and it has no
  "leave out" choice. Asked 2026-10-12; no answer yet.

- Make the collection page pick up a popup change without a refresh.
  `use-settings.ts` reloads on `browser.storage.onChanged`, which doesn't
  reach a Safari content script from a popup write (see `CLAUDE.md`);
  `subscribeToStoredSetting` is the channel that works.

- Decide whether upstream's `reference-links/settings.ts` and
  `user-page/settings.ts` should go through `stored-settings`, so Safari's
  "Clear History" doesn't wipe them (see the v3.1.0 sync in `docs/plan.md`).

- Decide whether the fork restores "only VA releases get track-artist
  prefixes" in kknq's tracklist picker, or raises it with kknq (see the
  v3.1.0 sync in `docs/plan.md`).

- Check whether Safari runs upstream's MAIN-world Spotify diagnostics script
  (`spotify-search/page-errors.ts`) from the MV2 manifest.

- Decide whether to use upstream's `stream-links/placement.ts` for
  music-video pages; it's unused on the fork.

- Sync upstream's `71e70da` (PR #144, Apple Music links without a blank
  tab, merged 2026-10-14) into the fork. Expect a conflict in
  `stream-links/use-page-data.ts`, which differs from upstream's (no
  `metadata.ts` or `release-type.ts` split). Until then the fork's
  `getFullLink` still uses `data.loc` instead of the user's preferred
  region. See the #144 entry in `docs/plan.md`.

- Check the popup on the built-in display. Its `maxHeight: 600` was set
  from what an external monitor clamped to (2026-07-28), so the built-in
  display may now scroll where it used to fit everything (see `CLAUDE.md`,
  "Popup sizing").

- Check whether App Store validation accepts upstream's Spotify web search
  on the Safari build: it adds `webRequest`/`webRequestBlocking` to the MV2
  manifest alongside `persistent: false` (synced 2026-10-10).

- Confirm the drafted `app store submission stuff/app-store-description.txt`
  and `whats-new.txt` (2026-08-14) as final before the next submission.
