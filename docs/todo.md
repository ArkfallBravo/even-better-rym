# Todo

- Follow-up candidates surfaced but explicitly skipped by the 2026-09-06
  `/simplify` pass (see `docs/plan.md` for why each was held back — none
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

- **Bug found and fixed (2026-08-22)**: rebinding a shortcut in the popup
  (adding or removing a combo) did not take effect on an already-open chart
  page — the old shortcut kept firing (or the new one didn't) until a full
  page reload. Root cause, confirmed with temporary logging: `setChartShortcutBindings`
  wrote to `storage.local` correctly (confirmed by reload always picking up
  the change), but `subscribeToChartShortcutBindings`'s
  `browser.storage.onChanged` listener never fired in the content script's
  context for a write made from the popup, on this Safari build — a
  cross-context propagation gap, same class of problem the native-settings
  mirror (`native-settings.ts`) already exists to work around elsewhere.
  Fixed by replacing the `storage.onChanged`-based subscription with an
  explicit background-mediated broadcast: `background/index.ts`'s
  `getKeybindingsSetResponse` now calls a new `broadcastKeybindingsChanged`
  (queries tabs matching `*://*.rateyourmusic.com/charts/*` — the
  chart-shortcuts content script's own manifest pattern — and
  `browser.tabs.sendMessage`s each one) before mirroring to native, and
  `subscribeToChartShortcutBindings` now listens for that message via
  `browser.runtime.onMessage` instead of `storage.onChanged`. New
  `KeybindingsUpdatedMessage` type + `isKeybindingsUpdatedMessage` guard
  added to `messaging.ts` for this one-way background→tab broadcast (no
  `id`, not part of the existing request/response `BackgroundRequest` union).
  User confirmed live-updating now works for both add and remove, with the
  chart page left open and not reloaded.

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

- Decide whether to commit the `screenshots/` → `app store submission
  stuff/` migration (2026-08-14): `git status` shows all six files
  previously tracked under `screenshots/` as deleted in the working tree,
  uncommitted, while `app store submission stuff/` (untracked) now holds the
  App Store screenshots plus the draft description/release-notes text. See
  `CLAUDE.md`'s "App Store Connect metadata" section.

- **Done (2026-08-14)**: Tidal autofind failure diagnosed and fixed — the
  `v2/searchResults` search request was using a broken path-based-ID URL
  shape that Tidal's live API unconditionally rejects; fixed to use
  `filter[query]`, plus a response-parsing bug (`data` is an array, not a
  single object) that would have masked even a correct URL. Committed as
  `eeda6525`, user-confirmed working. See `docs/plan.md`'s "Autofind-link
  triage" entry for the full diagnosis, including an open question (why the
  user recalled it sometimes succeeding) that was investigated but left
  unresolved rather than guessed at.

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

- Track-artist autofill should only auto-select an exact match; when
  multiple candidate matches are found for a track artist, it should not
  silently pick one — display a warning to the user instead so they can
  resolve it manually.

- Tracklisting import should strip "feat. <artist>" (and variants) out of
  track titles and instead add those artists to the track's credits with
  role "featured", rather than leaving them embedded in the track name.

- Tracklisting should show the search hint/query used for each artist match
  next to the result, so the user can proofread which search term produced
  which artist before accepting it.

- Tracklisting import should convert square brackets `[]` in track titles to
  parentheses `()`, to match RYM's expected formatting convention.

- **Done (2026-07-31)**: pull-credits auto-import was disabled — removed the
  "Credits" checkbox/option and the `fillCredits`/`fillCredit` functions from
  `src/modules/release-submission/utils/fillers.ts` and
  `use-cases/import-controls.tsx`. The unrelated, upstream (kknq-authored)
  manual "+ artist"/"+ featuring"/"+ remixer" credits UI
  (`use-cases/credits-controls.tsx`) was deliberately left untouched — it's
  user-supervised one credit at a time, not an automatic bulk pull, and
  predates this fork.

- Credits and track-artist matching need a real disambiguation strategy
  instead of the current guesswork. Two candidate approaches: (1) an
  extensive conditional/heuristic system that cross-references the imported
  release's genres against RYM's genre hierarchy to narrow which candidate
  artist is plausible, or (2) hand the artist hint + context to an AI model,
  preferably on-device to avoid per-call monetary cost — Apple's on-device
  AI (Apple Intelligence / Foundation Models framework) would be a strong
  candidate given this is a Safari extension already tied to a native macOS/
  iOS app wrapper.

- **Done (2026-08-05)**: `chart-shortcuts` redesign to stop its custom
  suggestion overlay from fighting RYM's own native chart-builder dropdown —
  see the `chart-shortcuts` redesign entry in `docs/plan.md` for the
  full before/after. Manually tested and confirmed working by the user in
  the Safari-wrapped app.

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

- Set up the macOS app target (`EvenBetterRYM.xcodeproj`) to build directly
  into `/Applications`. Attempted twice now (both reverted — see
  `docs/plan.md` for the full account of the second attempt and why it was
  undone):
  1. A "Copy to /Applications" Run Script build phase (`ditto` after
     "Embed Foundation Extensions"), blocked by Xcode's script sandboxing
     (`ENABLE_USER_SCRIPT_SANDBOXING = YES`, set at the project level) —
     `ditto` couldn't read the built `.app`'s `Contents` directory even with
     it declared in the phase's `inputPaths`/`outputPaths` (those only feed
     Xcode's dependency-analysis graph, not the actual sandbox profile). The
     fix for *that* specific problem is disabling
     `ENABLE_USER_SCRIPT_SANDBOXING` for just the macOS app target's Debug/
     Release configs (not project-wide).
  2. Re-attempted with the sandboxing fix applied, a Run Script phase
     (`ditto`, later changed to a literal `mv` per the user's actual manual
     workflow), and (briefly) an explicit shared `.xcscheme` redirecting
     Xcode's Run action to launch the `/Applications` copy instead of the
     DerivedData one. None of it fixed the underlying issue: Safari's
     Extensions list still only picked up the Debug build, not the
     `/Applications` copy, regardless of which one Xcode's Run action
     launched. Root cause not identified. User reverted all of it and is
     back to doing this manually in Xcode.

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
  2026-08-06 by an unrelated `git stash`/`git stash pop` and restored as
  `stash@{0}` with a descriptive message rather than dropped. Needs the
  user's call: turn it into a real commit, or drop it.
