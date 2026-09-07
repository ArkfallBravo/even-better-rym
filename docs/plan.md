# Plan / open work

- `/simplify` pass on `fix-apple-music-title-slash-mangling` (2026-09-06,
  **partially committed** — safe half landed as `afe3274`, the rest is
  waiting on manual Safari testing): no recent commit's message actually
  started with "Simplify:" (only a 2022 `b9e8647` — predates the convention),
  so diffing "since the last simplify commit" would have meant the whole
  427-file, ~70k-line project history. Re-scoped, per the user's own
  clarification, to "everything we've written that isn't from kknq upstream":
  `git diff <merge-base-with-upstream/main>..main` (merge-base `25ce505e`),
  excluding non-code reference-dump files (`charts_source.html`,
  `apple_music_source.html`, the saved uBlock issue HTML, `docs/*.md`,
  `package-lock.json`) — 79 source files / ~3,840 lines.

  **Important correction mid-session** (now saved as a memory update, see
  `[[feedback-upstream-kknq-code]]`): the user clarified that "don't touch
  kknq's code" means *authored-by-us*, not *falls after the fork's
  merge-base* — code we wrote can also have been contributed back into
  kknq's own repo and would still be ours to simplify. Re-verified every
  finding with `git blame -e -L <range> <file>` against author identity
  (`Helena Simson`/`ArkfallBravo` share one email) before touching it, not
  by which side of the merge-base the file fell on.

  Ran 4 parallel review agents (reuse / simplification / efficiency /
  altitude) against the filtered diff. **Fixed and committed** (`afe3274`,
  all verified ours via blame, verified with `tsc --noEmit` + `npm run
  build` + `npx biome check` + `npx vitest run`, 146/146 passing):
  - `storage.ts`: removed leftover debug `console.log`/`getBytesInUse`
    instrumentation from `get`/`set` (flagged independently by all 3 of the
    reuse/simplification/altitude agents) — restored to byte-identical to
    upstream's original.
  - `native-settings.ts`: collapsed 4 duplicated `if (!response.ok) throw
    ...` blocks into one `assertNativeOk` TS assertion-function helper.
  - `chart-shortcuts/settings.ts`: `overridesFrom` now calls the existing
    `array.ts`'s `equals()` instead of reimplementing array comparison via
    `JSON.stringify`.
  - `applemusic/{resolve,track-artists}.ts`: extracted a shared
    `findTrackLockupScriptText` helper so `getIsVariousArtists`/
    `getTrackArtists` share one DOM scan instead of each independently
    walking `document_.querySelectorAll("script")`.

  **Fixed and fully committed**: added `dom.ts`'s `buildPollForGlobalScript`
  helper so `chart-shortcuts/app.ts`'s `patchRYMChartRemoval` and
  `release-submission/utils/page-functions.ts`'s `patchCreateShortcut`
  (near-identical "poll for a page-world global every 200ms up to 20
  attempts, then monkey-patch it" scripts) both build off it instead of
  each hand-rolling the same polling loop — split into two commits so each
  half only landed once its own manual Safari test passed: `dom.ts` +
  `chart-shortcuts/app.ts` as `93fff72` (chart-shortcut creation/removal
  confirmed working), then `page-functions.ts` as `9328427` (inserting an
  artist/work link into a track title confirmed working).

  **Investigated and explicitly skipped**, each for a documented reason
  (not silently dropped — see `docs/todo.md` for the ones worth revisiting):
  URL-param-loop duplication between `shared/utils/fetch.ts` (ours) and
  `background/fetch.ts` (kknq's — fixing it means editing kknq's loop);
  `fetch.ts`'s direct-fetch-before-background-fallback extra network
  round-trip on CORS-blocked hosts (a deliberate, already-commented design
  tradeoff, not an accident); the small `onClickCreateChart`-suppression
  snippet duplicated twice in `chart-shortcuts/app.ts` (judged not worth
  nested-template-string complexity for 4 lines); `use-release-info.ts`
  pushing the "commit complete state" decision out to its callers (this was
  itself a deliberate change made earlier in this fork, not an accident —
  undoing it means reworking the hook's public API and both call sites);
  `background/index.ts`'s hardcoded `type: "fetch"` fallback in the
  tab-scoped dispatcher's catch path (real gap, but `DownloadResponse`/
  `ScriptResponse` — kknq's types — have no field to carry an error, so a
  correct fix needs widening kknq-authored type declarations);
  `import-controls.tsx`'s sequential `await fill(...)` before `await
  download(...)` (parallelizing would delay when `setInfo` commits the
  "complete" state relative to the cover-art download finishing — a real
  timing/UX change, not verifiable without running the live import flow);
  `runScript`'s direct `<script>`-tag injection vs. `fetchInPage`'s
  still-background-routed injection (confirmed via `git log -S` this is a
  deliberate, documented fix — commit `218d29b`, "fix: Streaming links
  visible" — for `scripting.executeScript` being unavailable in iOS
  Safari's MV2 background, not architectural drift).

  **Also surfaced**: `tokenize.ts`/`tokenize.test.ts`/
  `capitalization.test.ts` were sitting modified on this branch,
  pre-dating and unrelated to this `/simplify` session (this branch's
  actual named purpose, the Apple Music title-slash-mangling fix,
  presumably) — excluded from the `/simplify` commit; still uncommitted,
  see `docs/todo.md`.


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
  Build/lint/typecheck all verified clean; **not yet manually tested** —
  needs an Xcode rebuild + re-granting "Allow on Every Website" in Safari
  (extension UUID changes per rebuild, resetting that grant per the
  Beatport/Melon/LiveMixtapes investigation below) before results are
  trustworthy. Not committed yet, pending that manual confirmation.

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

  **Open question, not resolved — flagged rather than guessed at:** the
  user recalled Tidal autofind sometimes succeeding (a bold, filled
  "found"-style icon, confirmed via `stream-link-icon.tsx` to render at
  `opacity: 0.8` vs. the faint `opacity: 0.15` shared by "not-found" and
  "failed" states — so this wasn't a visual misread of a dim icon) even
  when RYM's page had no pre-existing Tidal link (which would otherwise
  skip `search()` entirely via the `_tag: "exists"` path in
  `stream-link.tsx`). Live testing shows the current API unconditionally
  rejects any free-text path-based ID, and the accepted ID shape
  (`1FBqsKJyGruHdyqg1t3A3MQgQGotdVdRZ`-style, opaque/server-generated)
  reads like a route that has always validated a real ID — suggesting
  Tidal's API contract may have changed since `kknq` wrote this in
  2026-03-14, but this could **not** be confirmed: Tidal's docs site
  (`developer.tidal.com`) is a client-rendered SPA that returns an empty
  shell to both `curl` and `WebFetch`, and no changelog/deprecation notice
  turned up via web search. Left as an explicitly unverified hypothesis,
  not a finding. Separately, but with a real code-level explanation:
  inconsistent *failure* text across attempts (sometimes `HTTP 400`,
  sometimes no error code shown) is explained by two real, still-unfixed
  issues surfaced during this diagnosis — see the `docs/todo.md` entries
  added for both.

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

- Open question (2026-08-05, still unresolved — decision pending): the user
  said "Commit" right after confirming the `/Applications` build fix worked.
  That fix lives entirely in `EvenBetterRYM/project.pbxproj`, which per
  `CLAUDE.md` is **not tracked in git** — so there was nothing from that work
  to commit; asked the user to clarify whether "commit" meant the unrelated
  pending changes visible in `git status` (`CLAUDE.md` modified,
  `docs/.preserve-checkpoint.md`/`docs/memories.md` untracked, both
  predating this conversation) instead.

  The user then asked directly whether committing the Xcode project itself
  would be "sanitary." Checked and recommended **against** committing it
  as-is: `ArkfallBravo/even-better-rym` is a **public** repo (confirmed via
  `gh repo view --json visibility`), and `project.pbxproj` currently has
  `DEVELOPMENT_TEAM = 7C45KQPPCV` (the real Apple Developer Team ID) baked
  in, which would become permanently public. Also found
  `EvenBetterRYM.xcodeproj/xcuserdata/lillyanasimson.xcuserdatad` (personal
  Xcode editor state, present in two places under the project) sitting
  right there ready to get swept in by a naive `git add`, on top of
  `EvenBetterRYM/` already being deliberately gitignored (`.gitignore:12` —
  not an oversight). Offered a sanitized path instead (strip/placeholder the
  team ID, add an explicit `xcuserdata/` ignore, `git add -f` just the
  wanted files) but has not implemented it — full reasoning now lives in
  `CLAUDE.md`'s "Building the macOS app straight into `/Applications`"
  section under "Not committed to git". **Still waiting on the user's
  decision**: sanitize-and-commit `project.pbxproj`, or leave it fully
  untracked with the writeup in `CLAUDE.md` as the only durable record.

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

- `chart-shortcuts` new toggle shortcuts (started 2026-08-05,
  **implemented, build-verified, awaiting the user's manual in-browser test
  before commit**): follow-on to the redesign above. Added keyboard
  shortcuts covering the chart-builder's per-category checkboxes (see the
  `page_chart_query_free_section_*` discovery documented in `CLAUDE.md`'s
  Feature module pattern section), confirmed against a second read of the
  cached `charts_source.html` (both the `_include` and `_exclude` sides
  each have their own `_sub_items`/`_all` checkbox ids and
  `onClickBrowserItemSub`/`onClickBrowserItemAll` handlers, keyed by the
  full 8-way `FilterType`, not just the `_include` type):

  - Ctrl+Z/X/C/S → toggle "Include sub-genres" for genres / influences /
    either / descriptors (`onClickBrowserItemSub` on the `_include`
    `FilterType`).
  - Ctrl+Shift+Z/X/C/S → same, but the `_exclude` side ("Exclude
    sub-genres").
  - Ctrl+Q/W/E/A → toggle "Must contain all" for genres / influences /
    either / descriptors (`onClickBrowserItemAll` on the `_include` type).
  - Ctrl+Shift+Q/W/E/A → same, `_exclude` side ("Only exclude items
    containing all").

  **Resolved open question**: the user chose, via `AskUserQuestion`, to
  **remove the sticky "exclude mode" toggle entirely** (was Ctrl+\`,
  module-level `excludeMode` variable) rather than have it either apply
  only to the original Ctrl+1/2/3/D shortcuts or extend to the new
  toggle shortcuts too — every shortcut (old and new) now determines
  exclude purely from literal `event.shiftKey`. This simplified `app.ts`:
  removed `excludeMode`, `updateExcludeBadge`, the `[EXCL]` badge span and
  its `.ebr-exclude-badge` CSS rule (the rule's only consumer), and
  `resetInput` no longer resets/updates any mode state.

  `app.ts` rewrite:
  - Added `Category = "genre" | "sec_genre" | "genre_either" | "descriptor"`
    and `filterTypeFor(category, exclude)`, replacing the ad hoc
    per-key-count `genreFilterTypeFor`.
  - Added `toggleCheckbox(filterType, kind: "sub" | "all")`: builds the
    `page_chart_query_free_section_<filterType>_<sub_items|all>` id, flips
    `checkbox.checked`, then calls the matching `RYMchart.onClickBrowserItem*`
    — one self-contained injected script per action, mirroring the existing
    `applyItem`/`updateChart` pattern. Does **not** suppress
    `onClickCreateChart` around the call (unlike `applyItem`/
    `removeBrowserItem`'s patch) — that suppression was established through
    actual investigation of `addBrowserItem`'s side effects, not verified
    for the checkbox handlers, so it wasn't speculatively added; worth
    checking during manual test whether toggling a checkbox unexpectedly
    triggers a live chart refresh.
  - Replaced `handleGenreShortcut`/`handleDescriptorShortcut` with a single
    `handleApplyShortcut` driven by an `APPLY_KEY_CATEGORY` lookup map
    (`1`/`2`/`3`/`d` → `Category`) plus `APPLY_SCOPE` (`Category` → the
    existing narrower `genre`/`descriptor` native-browse `Scope`). Added
    `handleSubToggleShortcut`/`handleAllToggleShortcut` driven by
    `SUB_TOGGLE_KEY_CATEGORY` (`z`/`x`/`c`/`s`) and
    `ALL_TOGGLE_KEY_CATEGORY` (`q`/`w`/`e`/`a`). All four handlers key off
    `event.key.toLowerCase()` (safe for letters and digits since Shift
    doesn't change `event.key`'s letter/digit, only case/symbol — matches
    the existing Ctrl+D handler's approach) plus `event.shiftKey`.
  - `insertShortcutHint` now renders the user's 24 supplied lines verbatim
    (`HINT_LINES` array, `<br>`-joined) in place of the old abbreviated
    `^1/2/3 top genre · ^D top descriptor · +Shift = exclude` block —
    normalized the pasted text's inconsistent straight/curly quotes to
    plain `"` throughout for consistency with the rest of the array.
  - `src/manifest.ts`'s `chart-shortcuts` content-script entry no
    longer references `chart-shortcuts.css` (deleted — its only rule
    was the now-removed `.ebr-exclude-badge`).

  Verified: `tsc --noEmit`, `eslint src/modules/chart-shortcuts/
  src/manifest.ts`, `biome check` on the same all clean, `npm run
  build:safari` succeeds end-to-end. **Not yet manually tested in the
  Safari-wrapped app or committed** — per this project's manual-testing
  rule, needs the user to rebuild in Xcode and confirm all 24 shortcuts
  (and the checkbox-toggle chart-refresh question above) behave correctly
  before this gets committed.

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
