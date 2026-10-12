# Plan / open work

- Apple Music links without a blank tab (2026-10-06): opening a
  `geo.music.apple.com` link from Safari leaves an `about:blank` tab behind
  after the Music app takes over; plain `music.apple.com` links don't. The
  fork fixed RYM's own release-page links in `e6bfdbb` (May 2026, never sent
  upstream), but upstream's region-preference change (#127, `297cb57`, synced
  in `bb428e9`) brought the problem back for auto-found links by rewriting them
  to `geo.`. Fixed in the fork as `cfafc1d` (keeps the region in the path,
  drops only the host; `toGeoAppleMusicUrl` renamed `toRegionalAppleMusicUrl`,
  plus a regression test), confirmed in Safari. Both places were sent upstream
  as one commit on `fix/apple-music-geo-links` (off `upstream/main` at
  `187349a`): kknq/even-better-rym#144, open. Upstream had since added a
  second lookup step to the Apple Music search, so the port kept their code and
  applied only the rename and host change.

  kknq's review (2026-10-10, changes requested): the change works on their
  machines, but without `geo.` the release page's own links no longer
  redirect to the user's store. They open in the submitter's region (`/us/`
  for kknq, who is in Poland). Fixed on the PR branch as `c46bbbb`, pushed
  the same day: `getFullLink` in `stream-links/use-page-data.ts` now uses
  `streamingPreferences.service_regions.applemusic`, falling back to the
  link's own `loc`. The URL is built from parts there, so no regex is needed,
  despite kknq's suggestion of one. `getFullLink` is exported so the new
  `use-page-data.test.ts` can test it; the preferred-region test fails on the
  code from before the fix. Still open:
  - `c46bbbb` hasn't been tested in Safari, and kknq hasn't re-reviewed it.
  - Region casing is unchecked. The Deezer case lowercases
    `service_regions` values, which hints that RYM may store `PL` rather
    than `pl`. The Apple Music code, both this and `search.ts`, uses the
    value as-is.
  - The fork has the same gap: its `getFullLink` still uses `data.loc`. It
    gets the fix when #144 merges and is synced, but the fork's
    `use-page-data.ts` differs from upstream's (no `metadata.ts` or
    `release-type.ts` split), so expect a conflict there.

  Once #144 merges and is synced, drop this entry.

- App Store v1.1 submission prep (started 2026-08-14): tagged the exact
  commit that was on `main` when the v1.0 build was submitted for review
  (`app-store-v1.0-submission` on `5d776223`, pushed to origin — see
  `CLAUDE.md`'s "App Store Connect metadata" section), then diffed forward
  from there to find what actually needs to go in the next version's
  description/release-notes updates rather than guessing. Found one real new
  feature (`chart-shortcuts`), two import bug fixes (Melon host permission,
  Qobuz locale rewrite), one reliability fix (Tidal autofind matching), and
  one regression worth calling out rather than glossing over: `5ed78c70`
  disabled the Release Submission Helper's auto-import "Credits" checkbox
  (it accepted the first search result with no disambiguation) — the old App
  Store description's claim that Import auto-fills credits is no longer
  true and was corrected.

  Drafted `app-store-description.txt` (also fixed several copy/paste
  corruption artifacts in the user's originally-pasted description text by
  cross-referencing `src/shared/pages.ts`'s canonical popup hint strings,
  rather than guessing at the missing words) and `whats-new.txt`, both saved
  to `app store submission stuff/` (see `CLAUDE.md`). Neither has been
  explicitly confirmed as final/approved by the user yet.

  Regenerating `mac_release_page_2560x1600.png` to match the other App Store
  screenshots took several wrong turns (centered crop, then a
  reverse-engineered horizontal-shift transform, then a tight content-bbox
  crop) before the user supplied their own actual `sips` two-command
  pipeline, which turned out to reproduce the reference file byte-for-byte —
  see `CLAUDE.md`'s "Producing a `*_2560x1600.png` macOS screenshot" section
  for the exact commands. The uneven black margin around the window in the
  output (61/49/20/162 px) is expected, not a defect, once produced that way.

  **Still open**: whether to commit the `screenshots/` → `app store
  submission stuff/` migration — `git status` currently shows all six files
  under the previously-tracked `screenshots/` as deleted, uncommitted (see
  `CLAUDE.md` and the corresponding `docs/todo.md` entry).

- Autofind-link triage (started 2026-08-14, debug tooling **done and
  committed**; the actual autofind failures are still untriaged — see below):
  the user reported
  some of the stream-links "autofind" icons aren't finding matches. Extended
  `src/modules/import-check/` with a second panel (`search-panel.tsx`) that
  runs a single artist/title pair against all 8 `SEARCHABLES` services'
  `search()` directly — see `CLAUDE.md`'s "`src/modules/import-check/` debug
  page" section for the full design (shared `check-runner.ts` runner,
  caching caveat, `.env` key dependency for Spotify/Tidal/YouTube).
  Build/lint/typecheck verified clean, committed as `6b301ca`. Results
  are only trustworthy after an Xcode rebuild + re-granting "Allow on
  Every Website" in Safari (extension UUID changes per rebuild, resetting
  that grant per the Beatport/Melon/LiveMixtapes investigation below).

  Follow-on (same day): the user also asked to auto-print the debug page's
  `safari-web-extension://` URL to the background console (so it doesn't
  need to be typed by hand each rebuild) and to gate all of this debug
  tooling so it can't ship. Added a `VITE_DEBUG_TOOLS` build-time flag —
  `vite.config.ts` only includes the `import-check` page's
  `additionalInputs.html` entry when it's `"true"`, and
  `background/index.ts` only logs the URL under the same
  `import.meta.env.VITE_DEBUG_TOOLS` check — plus a `build:safari:debug` npm
  script that sets it inline (mirrors `build:safari`'s existing
  `MANIFEST_VERSION`/`EXTENSION_DISPLAY_NAME` pattern). Chose a build-time
  env flag over Vite's own `DEV`/`PROD` mode specifically because
  `build:safari` runs in production mode — gating on `import.meta.env.DEV`
  would have silently dropped the debug page from the exact build this
  project's Safari workflow uses. Verified both ways by actually building
  and inspecting `dist/`: a plain `build:safari` has no `import-check` files
  and no trace of the log string in the background bundle (dead-code
  eliminated, not just unlinked); `build:safari:debug` has both. Full
  writeup in `CLAUDE.md`'s "`src/modules/import-check/` debug page" section.
  `dist/` was left rebuilt via the plain (non-debug) script afterward.

  Bug found testing the above (same day): the console.log hardcoded
  `browser.runtime.getURL("import-check/index.html")`, missing the
  `src/modules/` prefix the real on-disk `dist/` path (and the built
  manifest's `web_accessible_resources` entry) actually needs — navigating
  to the printed URL produced Safari's "Safari Can't Find the File" /
  `NSURLErrorDomain -1100`. Fixed to
  `browser.runtime.getURL("src/modules/import-check/index.html")`; confirmed
  by the user after an Xcode rebuild that the corrected URL opens the page.
  Also researched (see `CLAUDE.md`'s "Debugging: reaching the extension's
  own pages in Safari" section) whether the `safari-web-extension://<uuid>`
  itself could be made stable across rebuilds — no supported way found, it's
  assigned by macOS's own extension registration system, not app-side
  config.

  **Committed** to `main` as `6b301cae` (the debug-page/panel/gating work).

  **Tidal autofind — diagnosed and fixed (2026-08-14, commit `eeda6525`):**
  running the search panel against "Violent Magic Orchestra – Death Rave"
  reproduced a consistent `Tidal: FAIL — HTTP 400: {"errors":[{"code":
  "INVALID_RESOURCE_ID","detail":"Invalid resource ID","source":{"pointer":
  "data/id"}}]}`. Root cause confirmed by testing directly against Tidal's
  live `v2/searchResults` API with the project's own `.env` credentials
  (read-only diagnostic calls): `src/shared/services/tidal/search.ts` was
  putting the search query in the URL **path** as a resource ID
  (`GET /v2/searchResults/{query}`) — every possible value there is
  rejected (confirmed by testing a single letter `a` through full
  multi-word queries, all `INVALID_RESOURCE_ID`), and omitting the ID
  entirely returns `"At least one filter is required"`. The working shape,
  confirmed live: `GET /v2/searchResults?filter[query]={query}&countryCode=
  US&include=albums` — the query belongs in a `filter[query]` query
  parameter, not the path. This also exposed a second bug: the response's
  `data` field is an **array** of result objects (JSON:API collection
  shape), not a single object, so `relationships.albums` lives at
  `data.data[0].relationships`, not `data.data.relationships` — the old
  parsing code assumed the latter and would have silently returned
  "not found" even if the URL had been correct.

  Confirmed via `git log --follow` that every commit touching this file is
  authored by `kknq` (upstream) — this is a pre-existing bug in the
  original codebase, not something introduced by this fork. Per the user's
  explicit "fix it, it's a real bug regardless," fixed anyway (see
  `feedback_upstream_kknq_code` memory — this doesn't change that
  standing rule, since the user gave explicit ask here rather than it
  being touched unprompted).

  Fixed in `search.ts`: request now hits `v2/searchResults` with
  `filter[query]` added to `urlParameters` (raw, unencoded — the existing
  `fetch()` wrapper's `URLSearchParams.append` already handles encoding);
  `TidalSearchResponse`'s `data` retyped as `TidalSearchResult[]`; parsing
  reads `data?.data?.[0]?.relationships?.albums?.data`. Verified with
  `tsc --noEmit`, `biome check`, `eslint`, and `npm run build:safari` —
  all clean. **Manually tested and confirmed working by the user** in the
  Safari-wrapped app. Committed as `eeda6525`.

- `EvenBetterRYM/` checkpoint commit before "Update to recommended settings"
  (2026-08-14, open — not yet resolved): while wrapping up the autofind-link
  triage session above, Xcode prompted to "Update to recommended settings"
  on the `EvenBetterRYM.xcodeproj` project, which the user flagged as
  potentially irreversible. Rather than risk that change being unreviewable
  afterward, committed the private `EvenBetterRYM/` repo's pre-existing
  uncommitted state as-is (`a8b383c`) first, explicitly as a revertible
  checkpoint — the user's own reasoning: "if we commit, we can always revert
  the change later." That commit includes two things unrelated to today's
  session, accumulated since the repo's last commit (`1fd1c238`,
  2026-08-05): build-number bumps (`CURRENT_PROJECT_VERSION` 1→9,
  `MARKETING_VERSION` 1.0→1.1) from App Store submissions, and a stray file,
  `EvenBetterRYM (macOS) copy-Info.plist` (just
  `SFSafariWebExtensionConverterVersion: 26.4.1` boilerplate, not wired into
  any build phase). Diagnosis of that stray file: the macOS app target's
  build settings have both `GENERATE_INFOPLIST_FILE = YES` and an explicit
  `INFOPLIST_FILE = "macOS (App)/Info.plist"` set simultaneously — a
  conflicting combination that plausibly causes Xcode to write its
  auto-generated plist under a "copy" name instead of overwriting the
  explicit one, which then got dragged into the project navigator as an
  inert, unattached file reference. **Still open**: whether to actually
  apply "Update to recommended settings" (not done yet, just made safely
  revertible), and whether to clean up the stray copy-Info.plist / the
  `GENERATE_INFOPLIST_FILE`/`INFOPLIST_FILE` conflict that likely caused it.
  Observed 2026-10-01: `EvenBetterRYM/project.pbxproj` has an uncommitted
  change, not made by Claude, switching all four macOS configurations'
  `MACOSX_DEPLOYMENT_TARGET` from `11.0` to
  `$(RECOMMENDED_MACOSX_DEPLOYMENT_TARGET)` (resolves to 14.0 under Xcode 27).
  That's plausibly this "recommended settings" update having been applied.
  Unconfirmed, and the keep/revert decision is tracked in `docs/todo.md`.

- `chart-searchbar` → `main`: brought the `chart-shortcuts` feature
  work over (done 2026-08-06, squashed as `f96852bd` — see `CLAUDE.md`'s
  "GitHub repo notes" section for the cherry-pick/squash mechanics and the
  lint-config fixes it surfaced). The user's ask was specifically
  "cherry-pick the 17 commits then merge them in as one commit" after asking
  why a plain `git merge` wasn't used — the reasoning: a full merge can't
  selectively exclude the 3 commits that only look unmerged (they diverged
  independently with equivalent code on `main` already), and resolving the
  `docs/*.md` conflicts is much more tractable one commit at a time than as
  one giant merge diff. Both `main` and `chart-searchbar` were pushed after.

- macOS app target build-into-`/Applications`, third attempt — succeeded
  (2026-08-05): unlike the two reverted attempts above (which tried to copy
  the built product out of DerivedData with a Run Script `ditto`/`mv`), this
  attempt used Xcode's own install-relocation settings instead —
  `DEPLOYMENT_LOCATION = YES` plus `DSTROOT` pointed at a symlink
  (`~/.xcode-dstroot-root` → `/`, kept outside `/tmp` and outside the
  iCloud-synced repo path) and `INSTALL_PATH = /Applications`, scoped to
  just the `EvenBetterRYM (macOS)` target. Hit the same
  `ENABLE_USER_SCRIPT_SANDBOXING` sandboxing wall as attempt 1 (this time
  blocking the pre-build symlink self-heal script, `ln(...) deny(1)
  file-write-unlink`), fixed the same way: `ENABLE_USER_SCRIPT_SANDBOXING =
  NO` on just this target. User rebuilt in Xcode and confirmed it worked.
  Full settings/reasoning documented in `CLAUDE.md`'s "Building the macOS
  app straight into `/Applications`" section; `docs/todo.md`'s entry marked
  Done. Not yet re-diagnosed *why* this approach succeeds where the
  Run-Script-copy approach's Safari-extension-registration problem (root
  cause never identified) didn't — plausibly because this way there's only
  ever one on-disk `.app` produced per build location, rather than a
  DerivedData copy and a separately-produced `/Applications` copy existing
  side by side, but that's a guess, not confirmed. Known tradeoff:
  `DEPLOYMENT_LOCATION = YES` still produces both a DerivedData copy and a
  `/Applications` copy with the same bundle ID after every build (Xcode's
  behavior, not something this setup avoids) — worth revisiting if Safari
  extension registration confusion resurfaces.

- DSTROOT symlink Clean error, fixed (2026-08-14): running "Clean Build
  Folder" in Xcode started failing with `Could not delete
  ~/.xcode-dstroot-root because it was not created by the build system`.
  Root cause: the symlink was created manually (`ln -s`) before any build
  ever ran, so it was never stamped with the
  `com.apple.xcode.CreatedByBuildSystem` xattr that authorizes Xcode to
  clean it — Xcode's build system has no separate "leave this alone but
  don't error" state, only "owned/cleanable" vs. "unowned/protected". Fixed
  in two parts: (1) `xattr -s -w com.apple.xcode.CreatedByBuildSystem true
  ~/.xcode-dstroot-root` — note the `-s` flag is required for a symlink;
  the plain `xattr -w` from Xcode's own error message follows the link and
  tries to write to `/` itself, which fails with `Operation not permitted`.
  (2) The existing pre-build "Verify DSTROOT symlink" phase
  (`project.pbxproj`, previously check-only — see the `feature/chart-
  shortcuts` era note above for its original sandboxing history) was
  rewritten to actually self-heal: recreates the symlink with `ln -sfn /
  ...` if missing/wrong, then **re-applies the xattr every run**, since a
  freshly recreated symlink is a new filesystem object that loses any
  previously-set xattr — without the re-stamp, the very next Clean would
  hit the same error again. Still exits 1 with a clear message if
  recreation itself fails (e.g. a permissions problem), rather than
  silently building against a broken DSTROOT. Renamed the phase to
  "Verify/recreate DSTROOT symlink" to match. Validated with `plutil -lint`
  after editing, then **rebuilt in Xcode and confirmed by the user
  (2026-08-14) that Clean now works.**

- App Store Connect listing for "EvenBetterRYM for Safari" (iOS + macOS,
  v1.0): metadata (description, promo text, copyright, support URL, age
  ratings, content rights) filled in — see `CLAUDE.md`'s "App Store Connect
  metadata" section for the exact values chosen and why. Submitted for
  review on 2026-07-28, same day the popup scroll fix (commit `5d776223`)
  was cherry-picked to `main`.

(Safari iOS manifest `persistent` flag fix landed in commit `3d803f30` — see
`docs/codebase.md` for the reasoning if needed.)

- `chart-shortcuts-customization` branch (started 2026-08-22, in progress —
  automated checks clean and 3 checkpoint commits made, but the plan's full
  manual Safari testing checklist has not been run to completion): adds a
  standard "press keys to record a shortcut" customization UI for the
  chart-builder's ~31 keyboard shortcuts, which were previously hardcoded
  with no way to rebind or resolve collisions with browser/OS shortcuts.
  Full design plan (superseded by what actually shipped, described below,
  but useful for the original reasoning) is at
  `/Users/lillyanasimson/.claude/plans/quizzical-tumbling-key.md`.

  **Decisions made via `AskUserQuestion`, with reasoning not visible in the
  code itself:**
  - Persistence: `storage.local` always + native `UserDefaults` mirror
    (native wins on read, self-heals `storage.local` on mismatch) — chosen
    over storage-only (wiped by Safari's "Clear History", the exact problem
    native settings were introduced to fix in the first place — see
    `CLAUDE.md`'s native-settings section) and over native-only (no native
    host on Chrome/Firefox builds).
  - UI location: a second view inside the existing popup (a "Customize
    shortcuts" button on the Chart Shortcuts row), per the user's own
    mockup screenshot — not a separate options page or an in-page editor on
    the RYM chart page itself.
  - Binding shape: all ~31 actions fully independent, each holding an
    *array* of combos (not a single string) — needed because "Update
    Chart" shipped with two default bindings (`Ctrl+Enter` and
    `Ctrl+Space`), which a single-combo-per-action model couldn't represent.
  - Conflict handling: reject the recording and show inline
    `Already used by "<Action>"` rather than silently overwriting.
  - Live rebinding: an already-open chart page must reflect a rebind made
    in the popup **without a page refresh** — this was **not** in the
    original plan and was added mid-review at the user's explicit
    insistence ("Add this, otherwise users will think it is broken"),
    implemented via a `browser.storage.onChanged` subscription in
    `chart-shortcuts/app.ts`'s `mount()` that rebuilds the combo→action map
    and re-renders the on-page hint panel in place.

  **A real pre-existing bug found and fixed as a side effect, not the
  original goal:** the old dispatch matched `event.key.toLowerCase()`
  *before* consulting `event.shiftKey`, so `Ctrl+Shift+1/2/3` (exclude
  genre/influence/either) never actually worked on `main` — `event.key`
  for the `1` key becomes `"!"` when shift is held, which never matched the
  lookup table. The rewrite keys everything off `event.code` (layout- and
  shift-independent: `"Digit1"` regardless of modifiers) instead, which
  fixes this as a side effect. Documented in the commit message so it
  isn't mistaken for new functionality. Tradeoff, flagged rather than
  hidden: `event.code` is physical-position-based, so on a non-QWERTY
  layout the recorded/displayed key won't match the keycap label (same
  tradeoff VS Code and browsers make).

  **Two bugs an advisor review caught before commit, both fixed:**
  1. `event.code` also distinguishes the main Enter from the numpad Enter
     (`"Enter"` vs `"NumpadEnter"`), where the old `event.key === "Enter"`
     matched both — without a fix this would have silently dropped
     numpad-Enter support for "Update Chart". Fixed by adding
     `ctrl+NumpadEnter` as a third default binding.
  2. The Swift `keybindings.get` handler did `value as Any` on a
     `String?`, which works by accident (every code path degrades to the
     `storage.local` fallback either way) but isn't explicit about the
     first-run/no-value-yet case. Cleaned up to an explicit `if let`/
     `NSNull()` branch.

  **Also fixed while touching this area:** the three existing tab-less
  background message handlers (`settingsGetAll`, `settingsSet`,
  `storageSet`) had no `.catch` on their response chain — a rejected
  native call (guaranteed on any non-Safari build, which has no native
  host) meant `sendResponse` was never invoked and the caller's `await`
  hung forever rather than failing. This was a real, silent bug on
  Chrome/Firefox builds, not something introduced by this feature. All
  five handlers (the three existing plus the two new `keybindings*` ones)
  now have a `.catch` fallback.

  **Two UI regressions found from the user's own screenshots after the
  initial implementation, both fixed as follow-up commits:**
  - Wrapping each popup row's label+toggle in an extra flex container (to
    make room for the new "Customize shortcuts" button) broke the
    `justify-content: space-between` that pins every feature's toggle to
    the popup's right edge — not just Chart Shortcuts, every row. Root
    cause: a single-child flex container has nothing to distribute
    "space-between" against. Fixed by reverting to one flat flex row per
    item (the label's existing `flex: 1` already does the right-alignment
    work), with the Customize button inserted as a sibling between the
    label and the toggle rather than wrapping them separately.
  - The recorder's conflict/error message ("Already used by ...") was
    rendered as the `value` of a fixed-170px `readOnly` `<input>`, which
    can't wrap text and silently clipped long messages. Fixed by moving it
    to a sibling `<div>` with `flexBasis: "100%"`, which forces it onto its
    own line within the row's `flex-wrap` layout so it wraps normally.
    "Customize mappings" was also renamed to "Customize shortcuts" per the
    user's request in the same round.

  **Branch/commit state as of 2026-08-22:** `even-better-rym` repo, branch
  `chart-shortcuts-customization` (off `main`), 4 commits: `3593e934`
  (main feature — registry, binding logic, popup UI, messaging/background
  wiring, README section since this feature had never been documented),
  `220a707` (popup alignment fix), `58260e6` (recorder error-clipping
  fix). `EvenBetterRYM/` repo (separate git repo, branch `master`), 1
  commit: `cc2a289` (the Swift `keybindings.get`/`keybindings.setAll`
  handler, storing the JSON override map under `keybindings.chartShortcuts`
  in `UserDefaults` — deliberately outside the `pages.` prefix, since
  `handleGetAll`'s boolean-only scan would otherwise silently drop a
  string value stored there). All three main-repo commits and the one
  Xcode-repo commit are explicit checkpoint commits made at the user's
  request (see `[[feedback-commit-as-safety-checkpoint]]` memory) — none
  claims the feature is fully manually verified end-to-end.

  `EvenBetterRYM/project.pbxproj` has an unrelated 5-line uncommitted diff
  that predates this session and was deliberately left unstaged both times
  a commit was made in that repo during this work — not investigated, not
  this feature's concern; see `docs/todo.md`.

  **Confirmed working via the user's own screenshots in the real Safari
  app** (so an Xcode rebuild did happen at least once during this work):
  the popup's Customize view renders and groups all actions, recording a
  new combo and live conflict detection both work, and the post-fix
  right-aligned toggle layout looks correct. **Not yet confirmed** (no
  explicit statement either way in this session): the native-mirror
  persistence across a full quit/reopen, survival through Safari's "Clear
  History", `Ctrl+Shift+1/2/3` actually firing on the real chart page, and
  live rebinding while a chart page is already open. See `docs/todo.md`.

  **Platform-native modifier key labels (2026-08-22, follow-up round):**
  `formatCombo` (`src/shared/chart-shortcuts/binding.ts`) now renders
  modifier keys to match the host OS instead of always showing generic
  words. Off Mac: `Ctrl` / `Alt` / `Shift` / `Command`, joined with
  `" + "` (e.g. `Ctrl + Shift + 1`). On Mac: the native `⌃` / `⌥` / `⇧` /
  `⌘` glyphs, joined with a plain space (e.g. `⌘ ⇧ O`) — in Apple's own
  canonical modifier order (Control, Option, Shift, Command), which
  already matched this codebase's existing `ctrl, alt, shift, meta`
  ordering from `comboFromEvent`.

  Two things worth knowing if this area is touched again:
  - `formatCombo` takes `mac` as an explicit parameter (`mac: boolean =
    isMacPlatform`) rather than reading a module-level platform constant
    directly. This was a real bug fix, not a style choice: Node's
    `navigator.platform` reports the actual host OS running the test
    process (confirmed: `"MacIntel"` under Node 22 on this dev machine),
    so a module-level constant made the existing "formats as Ctrl/Alt"
    vitest cases fail purely because the test suite happened to run on a
    Mac. See `CLAUDE.md`'s note in the same area for the general rule to
    reuse.
  - Getting the Mac glyphs to actually *look* native took two rounds: the
    right Unicode code points alone weren't enough — the shortcut chip's
    monospace font lacked San Francisco's custom glyph shapes and
    rendered them as a flat "^"-style caret (confirmed against the user's
    own screenshot of Safari's native menu bar). Switching the chip
    (`src/modules/popup/styles.ts`) to the popup's existing system-UI
    font stack fixed the shapes. The user was skeptical of this
    diagnosis throughout ("I think you're wrong") and asked to try
    removing the space between glyphs too, to match native macOS's tight
    packing (`⇧⌘N`, no space) — that came back looking "more squished"
    than genuine macOS rendering, meaning the font-family fix didn't
    fully close the gap to native and some further rendering-metrics
    difference (kerning/spacing, not glyph shape) remains undiagnosed.
    Reverted to space-separated glyphs as the accepted compromise rather
    than continuing to chase exact native fidelity — see `docs/todo.md`.

  **Commits added this round:** `bcd264e` (Option/Control/Command word
  labels + `" + "` spacing), `35b556d` (docs-only, the pending
  `/preserve` notes from the previous round), `d69f073` (native
  `⌃⌥⇧⌘` glyphs on Mac + the chip font-family fix) — all in
  `even-better-rym`, all explicit checkpoint commits per
  `[[feedback-commit-as-safety-checkpoint]]`, none manually verified in a
  real Safari rebuild yet. `EvenBetterRYM/` also got one unrelated
  checkpoint commit (`ba4f145`, an Xcode-generated build-number bump that
  predated this round and wasn't touched by any feature work).

- Beatport import failure investigation (started 2026-07-28, in progress):
  importing
  `https://www.beatport.com/release/isarnian-bloodlines-d_b-counterfuture-hi-shock/4255009`
  via the release-submission "Import" form fails in the macOS Safari app.

  Built `src/modules/import-check/` (see `CLAUDE.md`'s "Debugging" section)
  to call `resolve()` directly for all 10 resolvable services at once,
  without needing to drive the real RYM page. Results (2026-07-28, macOS
  Safari, after rebuilding in Xcode): **6 pass** (Apple Music, Bandcamp,
  Discogs, SoundCloud, Spotify, YouTube), **3 fail with the same error**
  (Beatport, Melon, LiveMixtapes), **1 fails for an unrelated reason**
  (Qobuz).

  Root cause for the 3 shared failures, confirmed via the background page's
  own console log (not just the tooltip): this is **CORS, not Cloudflare**.
  The log shows, for all three, `Origin safari-web-extension://… is not
  allowed by Access-Control-Allow-Origin. Status code: 200` — the server
  *did* respond (200), Safari just refuses to hand the body to script
  because there's no ACAO header for the extension's origin.
  `TypeError: Load failed` (surfaced in `Failed`'s tooltip,
  `src/shared/components/failed.tsx`) is just WebKit's generic label for a
  CORS-rejected fetch, not a distinct network error.

  Critically, this log came from the **background page's** console, so the
  CORS rejection is happening on the *background-script fetch fallback*
  (`src/modules/background/fetch.ts`), which is supposed to bypass CORS via
  `host_permissions` — and isn't. This means the existing code comment in
  `src/shared/utils/fetch.ts` ("the background page can't reach external
  APIs even with host permissions" is iOS-only) is likely wrong, or at
  least incomplete — the same limitation may apply on macOS. The 6 passing
  services most likely just send permissive CORS headers themselves, so
  their first-attempt content-script-level fetch succeeds and never
  reaches the broken fallback.

  Adding `https://*.melon.com/*` to `host_permissions`
  (`src/manifest.ts:18`, since the real Melon URLs are all `www.melon.com`
  and only the bare `melon.com` was previously listed) did **not** fix
  Melon — confirming the failure isn't a missing-permission-string typo,
  it's the deeper CORS-bypass-not-working issue above. That permission
  addition is still correct/worth keeping regardless.

  **Resolved (2026-07-28):** granting website access ("Allow on Every
  Website") for the extension in Safari → Settings → Extensions fixed all
  3 — re-running `import-check` afterward (no rebuild) showed Melon,
  Beatport, and LiveMixtapes all PASS. Confirmed root cause: Safari
  requires the user to explicitly grant per-site website access before
  background-script fetches can bypass CORS via `host_permissions` — it is
  not auto-granted the way Chrome does it. Because the extension's
  `safari-web-extension://<uuid>` changed on every Xcode rebuild this dev
  session (`395B9F53` → `EACE8B78` → `40E05BA3` → `D5758C9D`), Safari
  treated each rebuild as a fresh install and reset that grant, which is
  why the manifest-only fix (adding `*.melon.com`) looked like it hadn't
  worked. Not a code bug and not a platform limitation needing an
  architectural fix — this was pure dev-workflow friction from rebuilding
  in Xcode. Worth remembering for future Safari extension debugging
  sessions: **after any Xcode rebuild, re-grant website access for the
  extension before re-testing anything that hits the background-fetch
  fallback**, or failures will look like regressions that aren't real.

  Qobuz's failure (`Could not get release data for URL
  safari-web-extension://.../import-check/index.html`) was an unrelated
  pre-existing bug, not part of this investigation: `document_.URL` on a
  `DOMParser`-created document doesn't retain the fetched page's URL in
  WebKit (it reflects the parsing document's own URL instead), which was
  just misleading error text — the real issue was that
  `src/shared/services/qobuz/resolve.ts`'s URL rewrite only *replaced* an
  existing `xx-xx` locale segment, never *inserted* one. Real Qobuz URLs
  (e.g. `open.qobuz.com/album/<id>`, the share-link format) have no locale
  segment at all, so the rewrite was a no-op and the request landed on
  `www.qobuz.com/album/<id>` with no locale — confirmed via curl this
  404s, while `www.qobuz.com/us-en/album/<id>` 200s and has the expected
  `application/ld+json` tags. **Resolved (2026-07-28):** `resolve.ts` now
  strips any existing subdomain/locale and always rebuilds the URL as
  `www.qobuz.com/us-en/<path>`. Confirmed fixed via `import-check` in
  Safari.

  Also tried a Selenium/`safaridriver`-based e2e test (`e2e/`) that drives
  the actual "Import" form end-to-end first, but abandoned as the primary
  approach: Cloudflare detects `navigator.webdriver` (set by Safari's
  remote-automation mode) and serves a bot challenge on navigation to the
  RYM page itself, blocking the test before it can even reach the import
  form. Kept in the repo per explicit user choice even though currently
  unused. (Note: this Cloudflare/`navigator.webdriver` issue is real but
  distinct from the CORS root cause found above — don't conflate the two;
  earlier in this investigation a `curl` test showing Beatport's Cloudflare
  "Just a moment" challenge page was mistakenly treated as the likely root
  cause for all 3 failures, but the background-page console log showing
  `Status code: 200` + ACAO rejection proves the real browser request
  wasn't Cloudflare-challenged at all — that curl-based theory should be
  discarded.)

- Separate, real bug spotted while debugging the above (unrelated to
  fetch/CORS, not yet fixed): `src/modules/background/index.ts`'s
  `setTabIcon` (called from the `browser.tabs.onUpdated` listener) uses
  `browser.action.setIcon`/`.setTitle` unconditionally, but the Safari
  build forces Manifest V2 (`npm run build:safari`), where the correct
  namespace is `browser.browserAction`, not `browser.action` — causing an
  unhandled `TypeError: undefined is not an object (evaluating
  's.action.setIcon')` in the background console on every
  rateyourmusic.com tab navigation. Confirmed this does *not* explain the
  CORS/fetch failures above (different listener, doesn't block message
  handling) — it's a separate, real, pre-existing bug worth its own fix.

- `feature/chart-shortcuts` branch: ports the Tampermonkey userscript
  at `Userscripts/RYM Chart Prefix Commands.user.js` (sibling directory to
  this repo, outside git) into `src/modules/chart-shortcuts/` as a
  toggleable feature (`chartPrefixCommands` page key, gated on `/charts/*`).
  Manually tested in the Safari-wrapped app and confirmed working (prefix
  commands, Ctrl+1/2/3/D shortcuts, exclude toggle, hint text placement) as
  of 2026-07-27, after fixing a content-script isolated-world bug where
  `window.RYMchart` calls were routed through `runScript()` — see `CLAUDE.md`
  for the general pattern. Built Safari-first per the user's workflow —
  feature branches here aren't merged straight into `main`; the user merges
  the relevant changes into their own fork's main branch by hand once a
  branch is where they want it.
- The chart-shortcuts hint text is inserted as bare content directly
  into RYM's own `.page_chart_query_free_section_label` div via
  `label.insertAdjacentHTML("beforeend", ...)` — no wrapping `<span>`/`<div>`
  — so it structurally matches the label's own bare text node (confirmed
  against a DevTools screenshot of the target DOM shape) and inherits the
  label's font/color for free. Idempotency guard is `label.dataset.ebrHint`
  (an ID-based `document.getElementById` guard doesn't work once there's no
  wrapping element with an ID).
- `docs/todo.md` has two open follow-ups from this branch's work: (1)
  whether a browser-automation MCP connector is worth setting up so future
  sessions can drive a live browser directly instead of relying on pasted
  console output, (2) making the macOS app target build straight into
  `/Applications` (blocked on Xcode script sandboxing; user is doing this
  one manually). The third item (matching hint text font/color to RYM's
  label) resolved itself as a side effect of the DOM-structure change above.

- macOS app target build-into-`/Applications` attempt (2026-07-28, fully
  reverted): tried making `EvenBetterRYM (macOS)` build straight into
  `/Applications` instead of the user manually dragging the built app there.
  Landed a Run Script build phase ("Move to /Applications", after "Embed
  Foundation Extensions") that `rm -rf`s any existing
  `/Applications/EvenBetterRYM.app` and then either `ditto`s or (per the
  user's actual manual habit) literally `mv`s the built `.app` out of
  DerivedData into `/Applications`. This required
  `ENABLE_USER_SCRIPT_SANDBOXING = NO` on just that target's Debug/Release
  configs (see `docs/todo.md` for why). This part worked mechanically — the
  script did move/copy the app correctly.
  The actual blocker: Safari's Extensions list kept showing only the Debug
  build (the one Xcode's Run action launches from DerivedData), never the
  `/Applications` copy the script produced, which is the opposite of what
  the user needs (only ever one instance of the app registering the
  extension with Safari — a second copy risks conflicting/duplicate
  extension entries and broke the settings-popup scroll). Tried fixing this
  by adding an explicit shared `.xcscheme`
  (`EvenBetterRYM.xcodeproj/xcshareddata/xcschemes/EvenBetterRYM
  (macOS).xcscheme`, previously an implicit Xcode-autocreated scheme with no
  file on disk) that redirected the Run action to launch
  `/Applications/EvenBetterRYM.app` directly via `PathRunnable` instead of
  the DerivedData build product. Confirmed the scheme parsed and resolved
  correctly (`xcodebuild -list` / `-showBuildSettings` both worked), but it
  still didn't change which copy Safari picked up — root cause was never
  identified (candidates not yet ruled out: code-signing/entitlement
  differences between the DerivedData and moved/copied bundle, Safari/
  Launch Services caching extension registration from an earlier launch
  location, or Safari resolving the extension via the running process
  rather than the app's on-disk path). User decided to fully revert rather
  than keep debugging blind — all of the above (Run Script phase, the
  sandboxing override, the shared `.xcscheme`) has been removed, back to
  the pre-2026-07-28 state where the user copies the build into
  `/Applications` by hand. If revisited, worth debugging with actual
  Console.app/`pluginkit -m` output on why Safari registers the DerivedData
  copy specifically, rather than guessing further.

- Popup settings window scroll fix (2026-07-28, commit `747289e5`): the
  feature-toggle list stopped scrolling on an external monitor (worked fine
  on the built-in display). Root cause took a few rounds of live Web
  Inspector diagnostics to pin down — see `CLAUDE.md`'s "Popup sizing"
  section for the durable technical explanation (Safari's popup
  measure-then-clamp model, why `height: 100%` doesn't work, why
  `flexShrink: 0` on the cards was needed). The `maxHeight: 600` value is a
  hardcoded guess based on what this specific external monitor clamped to —
  not verified against the built-in display or other monitors post-fix, so
  it's plausible (not confirmed) that the built-in display's popup now
  scrolls unnecessarily where before it fit everything without scrolling.
  Not treated as a blocking issue since scrolling working is strictly better
  than content being unreachable, but worth a quick manual check next time
  the built-in display is used.

- Popup scroll fix cherry-picked to `main` and shipped (2026-07-28): commit
  `747289e5` was cherry-picked onto `main` as `5d776223` (docs commit
  `9523a9aa` was intentionally left off `main` — it documents
  `chart-searchbar`-branch-specific session tradeoffs, not something `main`
  needs). Pushing hit the now-removed "Reckon comprehension" ruleset (see
  `CLAUDE.md`'s "GitHub repo notes"); once that was deleted, `main` was
  pushed directly and the user submitted the resulting build to the App
  Store the same day.

- `chart-searchbar` branch: committed (`0e831ab3`) a set of reference files
  the user is using as source material for this branch's work —
  `charts_source.html` / `apple_music_source.html` (saved RYM page-source
  dumps) and a saved third-party GitHub issue page
  (`uBlock-LLC:uBlock` #1366, about Safari erasing extension settings on
  "clear web history" — background reading related to the native-settings
  persistence approach documented in `CLAUDE.md`), plus `screenshots/`
  (macOS app release-page/add-release screenshots at various sizes). Only
  `screenshots/.DS_Store` was deliberately excluded from that commit (Finder
  metadata, no value in git) — everything else was kept as-is per the user's
  choice. No feature code for `chart-searchbar` itself has been written yet
  as of this commit.

- `chart-shortcuts` redesign (started 2026-08-05, **research done,
  plan drafted, but never actually presented back to the user for
  confirmation before the session moved on to an unrelated permission-prompt
  task — pick this up by recapping the plan and the open question below
  before writing any code**): the user reported the known "competing
  interfaces" bug recurring — RYM's own chart-builder search dropdown and
  this module's custom suggestion overlay fighting each other. Root cause
  confirmed by reading `app.ts`: `CONTAINER_ID`/`LIST_ID`/`INPUT_ID` are
  RYM's own native browse-widget DOM element ids (`ui_browser_list_contents_
  page_charts_settings` etc., confirmed against the `RYMbrowser`-owned
  markup in `charts_source.html`), and the module's `renderFreeMode()`
  overwrites `container.innerHTML` with its own rows while
  `observeContainerOverwrites()` watches that same container via
  `MutationObserver` and re-renders on top whenever RYM's own AJAX result
  handler (`RYMbrowser._onResults`) redraws it — a literal redraw war.
  `suppressNativeKeyUp`/`suppressNativeBlur`/`overrideNativeFocus` compound
  this by replacing the same `on*` handlers RYM assigned to the input.

  **Decision**: abandon the custom overlay entirely. Keep only the keyboard
  shortcuts (Ctrl+1/2/3 → top/secondary/either genre, Ctrl+D → descriptor,
  Shift/Ctrl+\` → exclude, Ctrl+Enter → create chart), which apply to
  whatever the *first parent-level* (never sub-genre/sub-descriptor) match
  is for the currently-typed query — i.e. add functionality on top of RYM's
  native dropdown without ever touching its rendering, so a user can freely
  use the shortcuts, click Include/Exclude buttons, or click "Browse
  sub-genres/descriptors" without the two interfaces stepping on each other.

  Investigated RYM's own `browser.js` bundle
  (`cdn.sonemic.net/dist/rym25/js/ui/browser.js`, downloaded to scratch and
  read directly since it isn't part of this repo) to find the real data
  source for "first option that appears," rather than approximating it with
  the module's own separate fetch (a divergence risk an advisor review
  flagged: the module's own debounce is 180ms vs. native's 50ms, so a fast
  Ctrl+1 press could act on stale/empty local suggestions while RYM's own
  list already shows something different). Findings, durable and worth
  reusing for the actual implementation:
  - `RYMbrowser.currentResultSet["page_charts_settings"]` holds the exact
    JSON (`{results: [...]}`) currently rendered in RYM's own list — reading
    this directly (via `runScript()` + a `CustomEvent` round-trip back to
    the content script, the existing pattern documented in `CLAUDE.md`'s
    Feature module pattern section) is the exact, non-approximating source
    of "the first option that appears," not a second independent fetch.
  - `RYMbrowser.path["page_charts_settings"]` is the sub-browse navigation
    stack; empty means the currently-displayed list is top-level (genre/
    descriptor) results, non-empty means the user has clicked into
    "Browse sub-genres/descriptors" and the list now holds sub-items — the
    shortcut handlers must check this and no-op (fall through, don't
    preventDefault) when non-empty, per "just use the parent."
  - `RYMbrowser.addBrowserItem(id, filterType, itemId, name)` just calls
    `RYMchart.addBrowserItem(filterType, itemId, name)` (same function this
    module already calls) then clears the input and nav path — confirms the
    module's existing `applyItem()` approach already matches native
    behavior exactly, no change needed there.
  - Endpoint/params match exactly: both native (`RYMbrowser._doSearch`) and
    this module's `fetchSuggestions` hit `/api/1/browse/music/` with
    `{q, component}` — so if the module keeps its own fetch instead of
    reading `currentResultSet` directly, results should be identical when
    not racing a very recent keystroke.

  Full removal list an advisor review specified (full deletions, not
  conditional forwarding, since e.g. `overrideNativeFocus` never saved the
  original `onfocus` to forward to): `renderFreeMode`, `suggestionRow`,
  `freeModeHeader`, `bindSuggestionClicks`, `render`, `showList`/`hideList`,
  `observeContainerOverwrites`, `suppressNativeKeyUp`, `suppressNativeBlur`,
  `overrideNativeFocus`, `handleTabCycle`, `handleEscape` (Tab/Escape must
  fall through to RYM once there's no overlay to navigate/close). The
  exclude-mode `[EXCL]` indicator moves into the static hint text already
  injected by `insertShortcutHint` (outside the list container, so it can't
  fight anything) rather than the overlay's dynamic header.

  **Resolved and implemented (2026-08-05):** plan recapped for the user and
  confirmed, including the open data-source question — the user chose
  reading `RYMbrowser.currentResultSet` live via the injected-script +
  `CustomEvent` round-trip (the exact, non-approximating option) over
  keeping the module's own parallel fetch. `app.ts` was rewritten:
  - Removed entirely: `renderFreeMode`, `suggestionRow`, `freeModeHeader`,
    `bindSuggestionClicks`, `render`, `showList`/`hideList`,
    `observeContainerOverwrites`, `suppressNativeKeyUp`, `suppressNativeBlur`,
    `overrideNativeFocus`, `handleTabCycle`, `handleEscape`, plus the now-dead
    `fetchSuggestions`/`suggestionCache`/`scheduleSearch`/`onInput` (the
    module's own parallel fetch, superseded by reading native state).
  - Added: `queryNativeBrowser(scope)` — injects a script reading
    `RYMbrowser.path["page_charts_settings"]` and dispatches a `CustomEvent`
    back with `{ subBrowseActive, item }` (first result whose `component`
    matches the requested scope, only computed when `path` is empty). A
    review caught that the first draft read `RYMbrowser.currentResultSet`
    ("last rendered"), which can be stale relative to the just-typed query
    if a shortcut is pressed before RYM's own ~50ms-debounced search
    round-trip lands — silently applying the *wrong* genre/descriptor with
    no error, worse than the old design's safe no-op on empty local
    `suggestions`. Fixed by reading `RYMbrowser.resultCache` instead, keyed
    by the exact `JSON.stringify({q, component})` that produced it (same
    key `_doSearch` computes) built from the input's live value — a missing
    cache entry for the current text means "no match yet," never a wrong
    one. `component` is read from the browse root's `data-component`
    attribute (confirmed `""` for the charts page via `charts_source.html`)
    rather than hardcoded, so it stays correct if RYM's markup changes.
    `applyNativeMatch()` awaits this and no-ops (doesn't call `applyItem`)
    when `subBrowseActive` is true or no item matched — this is what
    enforces "never sub-genres/sub-descriptors, just the parent." The
    Ctrl+1/2/3/D keys still always `preventDefault`/`stopPropagation`
    synchronously (needed to block the browser's own reserved shortcuts,
    e.g. Ctrl+D bookmark) regardless of the async result — only the *filter
    application* is gated on native state, not event consumption. This is
    an implementation-level interpretation of "no-op" (don't apply a
    filter) rather than "let the browser/RYM handle the key" (not possible
    synchronously since native state requires an async round-trip); flagged
    to the user as a judgment call rather than a literal follow of the
    original plan wording.
  - `applyItem()` (calls `RYMchart.addBrowserItem` directly) was unchanged,
    confirmed already matching native behavior exactly (see above).
  - The `[EXCL]` exclude-mode indicator now lives in a `<span
    class="ebr-exclude-badge">` inside the static hint text inserted by
    `insertShortcutHint`, toggled via `updateExcludeBadge()` — matches the
    plan's intent to move it out of the (now-removed) dynamic overlay header.
  - `chart-shortcuts.css`: removed the now-dead `.ebr-active` and
    `.ebr-type-badge` rules (overlay-only), kept `.ebr-exclude-badge`.

  Verified: `tsc --noEmit`, `eslint src/modules/chart-shortcuts/`,
  `biome check src/modules/chart-shortcuts/` all clean, and
  `npm run build:safari` succeeds end-to-end. **Manually tested and
  confirmed working by the user (2026-08-05)** in the Safari-wrapped app —
  shortcuts select the right parent-level genre/descriptor against RYM's
  live dropdown, and clicking "Browse sub-genre" / typing normally in the
  native widget is untouched. Committed.

- `EvenBetterRYM/` private git repo (2026-08-05): prompted directly by the
  DSTROOT symlink incident above — two risky `project.pbxproj` build-system
  edits in one session, with only a manual `.bak` copy as a safety net
  (no real diff/revert/blame available for the mistake that broke the
  build). Discussed making this a **second, private** repo rather than
  tracking `EvenBetterRYM/` in the public `even-better-rym` repo, since the
  `DEVELOPMENT_TEAM` exposure concern documented in `CLAUDE.md` (real Apple
  Developer Team ID, would become permanently public) only applies to the
  public repo — a private one sidesteps it entirely. Set up: `git init`
  inside `EvenBetterRYM/`, its own `.gitignore` (`xcuserdata/`, `.claude/`,
  `.DS_Store`, `*.bak.*`), initial commit `1fd1c23`. Local-only until
  2026-09-06, when it got a remote: pushed to the new private GitHub repo
  `ArkfallBravo/even-better-rym-safari` (`origin`, branch `master`). A new
  repo was created rather than reusing the older private
  `ArkfallBravo/Better-RYM-for-Safari` (abandoned, unrelated history).

  Considered automating "keep the two repos in sync": since main-repo
  commits don't actually touch any file the Xcode repo tracks (they're
  disjoint file sets, coupled only by `dist/`-path references at build
  time, and `dist/` itself is gitignored/untracked in both), the only real
  automation candidate was "auto-commit whatever's sitting in
  `EvenBetterRYM/` whenever the main repo is committed to, so Xcode-side
  changes never get forgotten." Rejected auto-commit (and auto-push) as too
  risky — generic/no-review commit messages, possible half-finished or
  broken state getting committed silently — in favor of a **reminder-only**
  git hook: `.husky/post-commit` in the main repo (untracked, personal-only)
  prints a warning after each main-repo commit if `EvenBetterRYM/` has
  uncommitted changes, but never commits or pushes anything itself. Full
  reasoning and setup details are in `CLAUDE.md`'s "Building the macOS app
  straight into `/Applications`" section.

  Also surfaced as an explicit standing instruction (saved to memory,
  `feedback-commit-means-both-repos`): a bare "commit" from the user means
  commit in **both** repos when both have relevant uncommitted work, not
  just whichever one the conversation was most recently focused on.

- Tracklist artist-link picker (started 2026-10-01 on branch
  `tracklist-artist-links`, **confirmed working in Safari and merged into
  `main` on 2026-10-02; a few edge cases are unchecked, and the upstream PR
  is on hold**, see the end of this entry). Goal: on import,
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
  - Rejected capture mechanism (first implementation): point
    `currentElement` at a hidden scratch input and read `assocId` from
    `patchCreateShortcut`'s `EbrArtistShortcutInsertedEvent`. It failed
    because `createShortcut` never runs; it was replaced by reading the
    clicked row directly (below).
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
  - Respond to review on #150. The PR body asks kknq whether
    "[unknown artist]" should count as a release row's link.
  - Then clean up: `refs/ebr/picker-port-commit1-tree` and the two port
    stashes ("upstream picker port, commit 2 state" `8de7df2`, and the older
    "picker port (uncommitted)") are no longer needed; deleting them needs
    the user's go-ahead.
  - Rebuild the fork for Safari (`npm run build:safari` + `xcodebuild`),
    since the upstream build replaced the installed app.
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
      2026-10-07). Rejected: having the picker call `fillTracks` itself,
      which would rewrite the whole tracklist from the import (losing the
      user's edits), recapitalize plain artist names, need the import
      options, and ignore the "Tracks" checkbox. `fill` reaches
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
  - Earlier note: the user's Safari test of the upstream build was pending. After
    the simplify pass, steps 2 (tracklist auto-apply), 3 (quick successive
    picks) and 5 (VA) need testing against the rebuilt build, since the
    queues changed, and so does an import's own tracklist fill (with and
    without "preserve track lengths"), since `fillTracks` changed. Image download spinning in that build is upstream's
    missing Safari fallback (see `CLAUDE.md`), not the port.
  - Port simplify pass (2026-10-06): fixes folded into the two commits, no
    separate `simplify:` commit. Skipped: batching the filed-under edits
    into one `runScript` (unknown whether RYM renumbers entries after a
    delete); skipping an apply whose plan is unchanged (minor); keeping
    `injectArtistLinkFormatting()` inside `Promise.all` (trips ESLint's
    `await-thenable`). The user then chose to route kknq's
    `fillTracks` through the shared tracklist editor (above).
  - Things the user's test should cover: single-artist release; Vholume
    prefill and auto-apply; an issue with inherit pairing and leftover
    removal; quick successive release picks (the new queue); a VA release.
    Also upstream's new "[unknown artist]" button (`file-under-controls.tsx`,
    added after #124): clicking it while a release row is active records
    it as that row's link. Ask whether that is wanted.

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
  unsynced until after the PR, as a separate task. `artist-pickers` is
  missing 18 upstream commits, including `e1f45a5` ("[unknown artist] works
  again"), so the "[unknown artist]" behaviour can only be judged on the
  upstream build.
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
    pass. Not yet tested in Safari.
  - **Release-picker removal bugs (found by the user in Safari,
    2026-10-07, fixed and uncommitted):** removing an artist from Filed
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

- Upstream sync (started 2026-10-02, branch `sync-upstream`): merging all
  32 `upstream/main` commits not yet on the fork (last sync was `25ce505`,
  2026-07-25) up to `167255d` (#124). Status: done and committed (see the
  status paragraph at the end of this entry); only merging into `main`
  remains.

  How it was resolved, so a later sync can follow the same reasoning:
  - Three upstream commits are the user's own PRs, which kknq squashed
    (#73 `72a5160` chart shortcuts, #82 `ee8d43d` artist-link formatting,
    #79 `6f53493` Qobuz). For files that first appeared in those PRs
    (add/add conflicts) and for `release-submission/app.tsx` and
    `page-functions.ts` (upstream only touched them in #82), the file was
    re-merged with `git merge-file`, using the squash commit as the base.
    That leaves only kknq's later edits as "theirs" and cut, for example,
    `actions.ts` from 32 conflicts to 1. Don't use a squash commit as the
    base for files that other upstream commits changed before that squash:
    the fork lacks those changes, so they would look like fork deletions
    and be dropped.
  - Feature-enabled settings: the fork's native `UserDefaults` round-trip
    stays the store. Upstream's per-feature defaults (`hideReviews`/
    `hideCommentBoxes` off) and its legacy `genreChartControls` fallback
    (the old `filmChartGenreLinks`/`filmGenreChartButton` keys) now live
    in one pure function, `resolvePageEnabled` in
    `src/shared/page-enabled.ts`. It applies those to the native settings
    map and is used by `getPageEnabled`, upstream's `getAllPageEnabled`
    (popup) and the background's toolbar-icon check. The native
    `handleGetAll` returns every `pages.*` bool, legacy keys included, so
    the fallback sees them. It lives in its own file because importing
    `page-settings.ts` in vitest loads `webextension-polyfill`, which
    throws. `runPage` keeps the fork's try/catch; upstream dropped the
    `await`.
  - Keybinding broadcast: kept the fork's `keybindingsSet` → native mirror
    → `keybindingsUpdated` path and dropped upstream's parallel
    `keybindingsChanged` message, which nothing on the fork sends.
  - `background/fetch.ts`: union. The fork's `body` and non-2xx `error`
    early return, plus upstream's try/catch and `status`/`statusText`,
    which the Discogs carousel reads.
  - Popup `app.tsx`, `hide-votes/app.ts`, `map/overlay.ts`: took upstream's
    versions. The fork's only changes there were formatting and the
    `groupBy`/`cardFlat` cleanup, which upstream's `featureGroups` popup
    supersedes. `pages.ts` took upstream's keys and `featureGroups`, which
    replace `pageGroupLabels`.
  - kknq's edits to the user's own PR code were adopted: #83 `984afd8`
    dropped Space from "Update chart"'s default bindings (it clashes with
    Windows' alt+Space and macOS's ctrl+Space input-source switch; it can
    still be bound by hand) and made the Back button "←"-only. Also adopted
    the `splitArtistList` helper in `artist-shortcuts.ts` and the
    `binding.ts` tidy-ups (#119 `e88fd73`), and the `ShortcutView`
    `onSettingsChange` prop (#88 `9dce6b6`). The fork's `ctrl+` defaults
    stay instead of upstream's `primary+` (ctrl on macOS, alt elsewhere).
  - Version follows upstream's jump from 2.3.0 to 2.7.0; the Safari
    extension's manifest version follows `package.json`.
  - Upstream's changelog tab (`onInstalled` opens `changelog.html` on every
    update) is kept. `changelog.html`/`changelog.css` were added to the
    Xcode project's Resources group and to both extension targets' Copy
    Bundle Resources phases (same `../../dist/...` references as
    `background.html`), and show up in the built `.appex`.

  Done on top of the merge as separate commits, so the merge commit stays a
  pure resolution (decided 2026-10-02, the user asked for both):
  - ESLint is clean on all of `src` (`main` had 17 errors, the merge 9).
    Fixes: `dom.ts`'s observer became a `const` declared after the closures
    that use it; `fillTracks`/`fillExtraFields` in `fillers.ts` dropped
    `async` because `runScript` is synchronous;
    `injectArtistLinkFormatting` is synchronous and is now called before the
    `Promise.all` in `release-submission/app.tsx` instead of inside it;
    `qobuz/search.ts` uses `querySelector<HTMLAnchorElement>`;
    `hide-ratings/generic-page.ts`'s click handler wraps an async `toggle`;
    the carousel test's mock returns `Promise.reject`. The two `_other`
    errors in `visibility/settings.ts` were fixed in `eslint.config.js`
    (`no-unused-vars` with `ignoreRestSiblings`) rather than by editing
    kknq's merge functions.
  - Every non-boolean preference now goes through one native-mirrored
    channel, so Safari's "clear history" can't wipe it: kknq's rating and
    review visibility (`brym.visibility.ratings`/`.reviews`), vote
    visibility (`brym.voteVisibilitySettings`), the stream-links "missing
    links" display type (`brym.missingLinksDisplayType`, old upstream code
    that had never been mirrored) and the chart-shortcut bindings.
    - `src/shared/utils/mirrored-setting.ts` is the pure logic, taking the
      four store operations as parameters so vitest can test it without
      `webextension-polyfill`. A read returns the native copy and rewrites
      `storage.local` if it differs; a native miss with a local value
      copies local to native, which is how settings saved before this
      change get mirrored on first read. When the native read fails (no
      native host), it returns the local value without trying a native
      write, so Chrome/Firefox don't send a write and broadcast on every
      read. A write goes to `storage.local`
      first, then native, best-effort.
    - `src/shared/utils/stored-settings.ts` wires it to `storage.local` and
      the background messages `jsonSettingGet`/`jsonSettingSet` (with
      `.catch` fallbacks carrying `error`, so a missing native host on
      Chrome/Firefox reads as a failure rather than a missing value).
      `subscribeToStoredSetting` listens for `jsonSettingUpdated`, which
      the background now broadcasts to every open RYM tab on any set
      (previously only chart pages, only for keybindings).
    - Swift: `json.get`/`json.set` take a `key` and store under
      `json.<key>` in `UserDefaults`, never at a caller-supplied raw key
      and never under `pages.`. They replace `keybindings.get`/`setAll`.
      `json.get` falls back to the old `keybindings.chartShortcuts` key for
      `brym.chartShortcutBindings`, so bindings that only survived natively
      aren't lost.
    - `visibility/settings.ts` and `hide-votes/settings.ts` keep kknq's
      dynamic `import()` so their tests still load without the polyfill.

  Status: the user tested in Safari on 2026-10-06 and it works. Committed
  on `sync-upstream` as the merge, then the ESLint fixes, then the native
  port, plus the Xcode repo (changelog references and the Swift handler,
  without the on-hold deployment-target hunks). Not pushed, and no PR (the
  user said not to open one). Next: merge `sync-upstream` into `main` when
  the user asks.

  Not pursued: the Discogs carousel fetches only through the background
  script, which per `shared/utils/fetch.ts` can't reach external APIs on
  iOS. The user said to ignore iOS (2026-10-06).

- Second upstream sync (2026-10-10, branch `sync-upstream-2.8` off
  `artist-pickers`): merging the 18 `upstream/main` commits after #124, up
  to `567497b` (#149). Done on a branch off `artist-pickers` rather than
  `main`, since `main` lacks the first sync and the picker work. Status: the
  user tested it in Safari on 2026-10-11 and it works; committed as merge
  `784e447`, and `main` fast-forwarded to it. Pushed to `origin/main` as
  `fc9b6fa` on 2026-10-11. The branch `sync-upstream-2.8` is now
  `refs/archive/sync-upstream-2.8`, as are the other merged branches
  (see `CLAUDE.md`, "Archived branches"), so references above to
  `artist-pickers`/`sync-upstream` as branches mean those archive refs.
  - Upstream renamed `runPage`/`getPageEnabled`/`setPageEnabled`/
    `getAllPageEnabled` to `runModule`/`getModuleEnabled`/
    `setModuleEnabled`/`getAllModulesEnabled` and auto-merged those names
    into every module. `page-settings.ts` keeps the fork's native
    round-trip, `resolvePageEnabled` defaults and `runModule` try/catch
    under the new names. The background's toolbar-icon check keeps
    reading `settingsCache`.
  - `messaging.ts`: the fork's settings messages plus upstream's
    `spotifySearch`/`wikipediaSearch`; upstream's keybinding messages stay
    dropped, as in the first sync.
  - `applemusic/search.ts`: upstream's artist/album lookup fallback, with
    the fork's `toRegionalAppleMusicUrl` (no `geo.` host, PR #144).
  - `vite.config.ts`: the fork's display name and `VITE_DEBUG_TOOLS` page,
    plus upstream's Spotify offscreen page.
  - Upstream's Spotify web search uses `webRequest`/`webRequestBlocking`
    on MV2 (now in the MV2 manifest) instead of Chrome's offscreen
    document. Whether App Store validation accepts that alongside
    `persistent: false` is unchecked; the user's "works" didn't single
    out Spotify.
  - Collection settings (`brym.collection.<kind>`,
    `shared/collection/settings.ts`) now go through
    `getStoredSetting`/`setStoredSetting` (dynamic `import()`, as in
    `visibility/settings.ts`), so they're mirrored to native storage.
    Uncommitted on `main` (2026-10-11), waiting on the user's Safari
    test. `use-settings.ts` still reloads on `browser.storage.onChanged`,
    which per `CLAUDE.md` doesn't reach a Safari content script from a
    popup write, so a popup change may need a page refresh to show.

- Guest credits instead of track links on non-VA releases (started
  2026-10-12 on branch `guest-credits` off `main`, **confirmed working in
  Safari and committed on 2026-10-12; ported to
  `tracklist-artist-links-upstream` as `7735445` and pushed to PR #150 on
  2026-10-12**). It goes into upstream PR #150 too
  (`tracklist-artist-links-upstream`), since the user called it a fix for
  that PR. User decisions (2026-10-12):
  - The tracklist picker only runs on Various Artists and split releases.
    A split is a VA release. On any other release no track gets a prefix,
    including the release artist. This reverses the 2026-10-06 rule that a
    track by A alone on an A & B release gets the picker.
  - Every track artist who isn't a release artist is credited instead:
    role `guest`, tracks field written `2, 12`. Example: Northwind
    (music.apple.com/us/album/northwind/1027973195), Sharm on tracks 2
    and 12.
  - VA picker behavior is unchanged.

  How it works:
  - Both panels key off `isVariousArtistsRelease`
    (`utils/track-artist-links.ts`): the first release artist is "Various
    Artists". Splits need no check of their own, since per the user a
    split is a kind of VA release. A first draft guessed splits from the
    track artists; the user rejected it.
  - The new `use-cases/guest-credit-picker.tsx` sits after `#creditsx`.
    It has one Link/Skip row per guest (`getGuestArtists`,
    `utils/guest-credits.ts`). Link reuses the tracklist picker's "Insert
    link" popup and click reading (`startArtistSearch` /
    `continueArtistSearch` moved into `utils/shortcut-popup.ts`). The
    picked id goes to RYM's page-world `addCredit('a', id, name)`, and the
    same injected script fills `credits_roles_<credits_num>` and
    `credits_tracks_<credits_num>` (`addArtistCredit`,
    `utils/page-functions.ts`). RYM's own Credits search wasn't used, so
    whether its result clicks work in Safari didn't need testing.
  - Re-linking or skipping a guest deletes the line it added before
    (`deleteCredit(N)`). The line number is read from the last
    `#creditsx li.sortable_credit` right after the synchronous fork
    `runScript`. On the upstream branch, `runScript` is async, so the port
    must await `addArtistCredit` before reading it.
  - `useImportSession` (`use-cases/use-import-session.ts`) replaces the
    tracklist picker's `usePickerImport`, so both panels share it.

  - Three buttons in both the tracklist and guest pickers (user,
    2026-10-12). **Link** picks the RYM artist. **Text** writes the name
    as plain text: a plain-name prefix in the tracklist, or an unlinked
    credit line. **Skip** leaves the artist out, so no prefix and no
    credit, but the row stays in the picker. Skip used to mean Text.
    - In the tracklist, a skipped artist's label is `OMITTED_LABEL` (`""`).
      `buildRelinkPlan` drops it, and a track whose labels all drop keeps
      its bare base title.
    - Text credits call RYM's manual-line path, `addCredit('a', 'XXX',
      name)`, then type the name into `credits_artist_N`. RYM's help text
      says manual lines are for "an unlinked credit". Whether RYM accepts a
      plain name there on submit is unchecked.
    - The release-artist picker's Skip is unchanged and still means "plain
      name". It wasn't part of the request.

  The user's Safari test passed all of the checks: Northwind, Link, Text,
  Skip, and a VA release. Upstream port: both commits went on as new
  commits on top of PR #150 rather than folded in (user's choice, so no
  force push). In the port, `addArtistCredit`/`deleteCreditLine` return
  upstream's async `runScript` promise, and the guest panel awaits the
  removal before adding and reading the new line. The tracklist picker kept
  upstream's own `usePickerImport`, which waits for the async tracklist
  fill, so on the upstream branch `useImportSession` serves only the guest
  panel.

- Bonus-track tags on import (2026-10-12, branch `guest-credits`,
  **confirmed working in Safari and committed; ported to
  `tracklist-artist-links-upstream` as `05261c2` and pushed to PR #150 on
  2026-10-12**). `markBonusTrack`
  (`utils/bonus-track.ts`) rewrites a trailing "Bonus Track" (bare, after
  " - ", or in () or [], any case) as " [bonus track]" after the title.
  The user chose after over before, despite first writing "prepend". Only
  those forms count; tags with a qualifier like "(Japan Bonus Track)" are
  left alone. `formatTracks` in kknq's `utils/tracklist.ts` calls it after
  capitalization, so the tag stays lowercase. The user approved that
  one-line change to kknq's file. Known false positive: a song whose real
  title ends in "Bonus Track" also gets rewritten. This goes to PR #150
  with the guest-credits port.

## Archived initiatives

- Apple Music release-title import fix (`Sorry : / /` / `Sorry :p` →
  `Sorry :/` / `Sorry :P`) + the 2026-09-06 `/simplify` pass on branch
  `fix-apple-music-title-slash-mangling` — fully shipped to `main`
  (`56ebb84`) and pushed. Writeup:
  `docs/archive/apple-music-title-fix-and-simplify-2026-09.md`.
- `chart-shortcuts` include-sub / must-contain-all toggle shortcuts
  (2026-08-05), shipped to `main`. Writeup:
  `docs/archive/chart-shortcuts-toggle-shortcuts-2026-08.md`.
