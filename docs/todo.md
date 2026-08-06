# Todo

- **Done (2026-08-06)**: `chart-shortcuts`'s advanced-query toggle
  shortcuts (Ctrl+F/V/R, Ctrl+Shift+R/F/V), plus the follow-on redesign
  making all `chart-shortcuts` shortcuts fire at the document level
  instead of only while the chart-builder search input has focus — see
  `docs/plan.md`'s "advanced query" entry for 2026-08-06 for the full
  history (initial R/F/V mapping → debugging why it only worked with the
  input focused → page-wide redesign → final F/V/R remap). Manually tested
  and confirmed working by the user, committed as `fb4d1e8f`.

- Fix `src/modules/background/index.ts`'s `setTabIcon`: uses
  `browser.action.setIcon`/`.setTitle`, which is `undefined` under the
  Safari build's Manifest V2 (should be `browser.browserAction` for V2).
  Causes an unhandled `TypeError` in the background console on every
  rateyourmusic.com navigation. Confirmed unrelated to the CORS
  investigation above — separate real bug.

- Look into whether a browser-automation MCP connector (e.g. Playwright or
  Chrome DevTools MCP) is worth setting up so Claude Code can drive/inspect
  a live browser (run console commands, read DOM state) itself instead of
  relying on manually pasted console output during debugging sessions like
  the `chart-shortcuts` one.

- **Done (2026-08-05)**: set up the macOS app target (`EvenBetterRYM.xcodeproj`)
  to build directly into `/Applications`. Two earlier attempts (below) were
  reverted; a third approach, using Xcode's own install-relocation settings
  instead of copying the built product with a Run Script, is what finally
  worked — confirmed by the user after a real rebuild. See
  "Building the macOS app straight into `/Applications`" in this file's
  Safari-wrapper section for the settings (`DEPLOYMENT_LOCATION`, `DSTROOT`
  pointed at a symlink, `ENABLE_USER_SCRIPT_SANDBOXING = NO` on just this
  target) and the known tradeoff (two `.app` copies with the same bundle ID
  after each build).
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

- Track-artist autofill should only auto-select an exact match; when
  multiple candidate matches are found for a track artist, it should not
  silently pick one — display a warning to the user instead so they can
  resolve it manually.

- **Done (2026-08-05)**: `chart-shortcuts` redesign to stop its custom
  suggestion overlay from fighting RYM's own native chart-builder dropdown —
  see the `chart-shortcuts` redesign entry in `docs/plan.md` for the
  full before/after. Manually tested and confirmed working by the user in
  the Safari-wrapped app.

- `EvenBetterRYM/` now has its own private local-only git repo (see
  `docs/plan.md`'s "`EvenBetterRYM/` private git repo" entry) — no GitHub
  remote created yet. Optional follow-up if the user wants real off-machine
  backup rather than just local history: create a private GitHub repo and
  push. Not urgent since the local repo alone already solves the "no diff/
  revert available" problem that prompted it.

- The unrelated Xcode `/Applications`-build-location documentation added to
  `CLAUDE.md`/`docs/plan.md`/`docs/todo.md` earlier in this session is
  still uncommitted in the main repo (deliberately left out of the
  `chart-shortcuts` commit since it's a separate topic — see that
  commit's scoping in `docs/plan.md`). Commit it (as its own commit) next
  time these docs are touched, or whenever explicitly asked.

- Separate, unrelated error surfaced in the extension background page's
  console while debugging the above (not yet investigated, not yet
  triaged/prioritized by the user): `[settings] failed to hydrate from
  native side – Error: Invalid call to browser.storage.local.set(). Disk
  I/O error.` — appeared on every background-page load. Confirm whether
  this is new or pre-existing, and whether it's actually causing any
  observable problem, before investigating further.
