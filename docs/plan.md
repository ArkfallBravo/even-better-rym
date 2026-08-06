# Plan / open work

(Safari iOS manifest `persistent` flag fix landed in commit `3d803f30` — see
`docs/codebase.md` for the reasoning if needed.)

- `feature/chart-prefix-commands` branch: ports the Tampermonkey userscript
  at `Userscripts/RYM Chart Prefix Commands.user.js` (sibling directory to
  this repo, outside git) into `src/modules/chart-prefix-commands/` as a
  toggleable feature (page key was `chartPrefixCommands`, renamed to
  `chartShortcuts` on 2026-08-06 — see the popup title/description entry
  below; module directory itself stays `chart-prefix-commands/`, gated on
  `/charts/*`).
  Manually tested in the Safari-wrapped app and confirmed working (prefix
  commands, Ctrl+1/2/3/D shortcuts, exclude toggle, hint text placement) as
  of 2026-07-27, after fixing a content-script isolated-world bug where
  `window.RYMchart` calls were routed through `runScript()` — see `CLAUDE.md`
  for the general pattern. Built Safari-first per the user's workflow —
  feature branches here aren't merged straight into `main`; the user merges
  the relevant changes into their own fork's main branch by hand once a
  branch is where they want it.
- The chart-prefix-commands shortcut cheatsheet (`HINT_LINES` in
  `insertShortcutHint`, `app.ts`) is no longer always-visible bare content —
  as of 2026-08-06 it's collapsed by default behind a "Show/Hide command
  hints" `<span class="ebr-hint-toggle">` inserted into RYM's own
  `.page_chart_query_free_section_label` div, toggling a sibling `<span>`
  wrapping the actual `HINT_LINES` list. The toggle is a `<span>`, not an
  `<a>` — RYM's global stylesheet colors `<a>` elements (blue), so the
  toggle wouldn't inherit the label's own font/color as a link; a `<span>`
  inherits both for free with no override needed. Hover-underline comes from
  a scoped `.ebr-hint-toggle:hover { text-decoration: underline }` rule
  injected via `document.createElement("style")` (same pattern as
  `descriptor-links/app.ts`). The click handler calls
  `event.stopPropagation()` since the parent label has its own `onclick`
  that focuses the search input — without it, toggling the hint list also
  steals focus. Idempotency guard is still `label.dataset.ebrHint` (an
  ID-based `document.getElementById` guard doesn't work once there's no
  wrapping element with an ID). Committed as `e4256f6c` on `chart-searchbar`,
  manually tested and confirmed working by the user.
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

- App Store Connect listing for "EvenBetterRYM for Safari" (iOS + macOS,
  v1.0): metadata (description, promo text, copyright, support URL, age
  ratings, content rights) filled in — see `CLAUDE.md`'s "App Store Connect
  metadata" section for the exact values chosen and why. Submitted for
  review on 2026-07-28, same day the popup scroll fix (commit `5d776223`)
  was cherry-picked to `main`.

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

- `chart-prefix-commands` redesign (started 2026-08-05, **research done,
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
  - `chart-prefix-commands.css`: removed the now-dead `.ebr-active` and
    `.ebr-type-badge` rules (overlay-only), kept `.ebr-exclude-badge`.

  Verified: `tsc --noEmit`, `eslint src/modules/chart-prefix-commands/`,
  `biome check src/modules/chart-prefix-commands/` all clean, and
  `npm run build:safari` succeeds end-to-end. **Manually tested and
  confirmed working by the user (2026-08-05)** in the Safari-wrapped app —
  shortcuts select the right parent-level genre/descriptor against RYM's
  live dropdown, and clicking "Browse sub-genre" / typing normally in the
  native widget is untouched. Committed.

- `chart-prefix-commands` new toggle shortcuts (started 2026-08-05,
  **implemented, manually tested and confirmed working by the user, and
  committed** as `fc0c2219`): follow-on to the redesign above. Added keyboard
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
  - `src/manifest.ts`'s `chart-prefix-commands` content-script entry no
    longer references `chart-prefix-commands.css` (deleted — its only rule
    was the now-removed `.ebr-exclude-badge`).

  Verified: `tsc --noEmit`, `eslint src/modules/chart-prefix-commands/
  src/manifest.ts`, `biome check` on the same all clean, `npm run
  build:safari` succeeds end-to-end. **Manually tested and confirmed
  working by the user (2026-08-05)** in the Safari-wrapped app — including
  the checkbox-toggle chart-refresh question above, which was not flagged
  as a problem. Committed as `fc0c2219` (`src/manifest.ts`,
  `src/modules/chart-prefix-commands/app.ts`,
  `src/modules/chart-prefix-commands/chart-prefix-commands.css` deletion,
  and this `docs/plan.md` entry — `CLAUDE.md` and `docs/todo.md`'s
  pre-existing unrelated uncommitted changes were deliberately left out of
  this commit, staged individually rather than via a blanket `git add`).

- `chart-prefix-commands` Ctrl+Space shortcut + popup copy refresh
  (2026-08-06, **implemented, manually tested and confirmed working by the
  user, committed**): follow-on to the toggle-shortcuts work above.
  - Added Ctrl+Space as a second trigger for "Update chart", alongside the
    existing Ctrl+Enter. Renamed `handleCtrlEnter` to
    `handleUpdateChartShortcut`, widened its key check to
    `event.key === "Enter" || event.key === " "`, and made the same change
    to the document-level fallback listener in `mount()` (the one that
    fires when the chart-builder input itself doesn't have focus). Added
    the corresponding `HINT_LINES` entries. Committed as `a65be72b`.
  - Updated the popup's title/description for this feature (`pageLabels`/
    `pageHints` in `src/shared/pages.ts`) to describe the full current
    shortcut set (apply matches, sub-genre/must-contain-all toggles, update
    chart) instead of the original `+g/-g`-era prefix-command copy.
    Committed as `01f51a56`, then amended in place (still `01f51a56`) after
    the user retitled it to "Custom Chart Shortcuts" and asked to rename
    the `chartPrefixCommands` page key to `chartShortcuts` throughout —
    updated `src/shared/pages.ts` (`PageKey`, `pages`, `pageLabels`,
    `pageHints`) and the `runPage("chartShortcuts", ...)` call in
    `src/modules/chart-prefix-commands/main.ts`. The module's directory
    name and manifest content-script path were deliberately left as
    `chart-prefix-commands/` — the rename request was scoped to the page
    key identifier, not the file layout.
  - Verified: `tsc --noEmit` clean after each change.

- `chart-prefix-commands` "advanced query" toggle shortcuts (2026-08-06,
  **implemented, manually tested and confirmed working by the user,
  committed as `fb4d1e8f`**): covers a different part of the chart-builder
  settings form than the
  existing genre/descriptor filter shortcuts — the "advanced" section's
  rating-source and exclusion checkboxes. DOM ids/handlers were found by
  grepping the cached `charts_source.html` (same source used for the
  `page_chart_query_free_section_*` discovery in `CLAUDE.md`), not live-page
  inspection:
  - Ctrl+R/F/V → `page_chart_query_advanced_users_following` /
    `_followers` / `_self`, via `RYMchart.onClickUsersFollowing()` /
    `onClickUsersFollowers()` / `onClickUsersSelf()` — "Only include ratings
    from users I'm following / who follow me / myself".
  - Ctrl+Shift+R/F/V → `page_chart_query_advanced_exclude_label_ratings` /
    `_catalog` / `_wishlist`, via `RYMchart.onClickExcludeCatRatings()` /
    `onClickExcludeCatCatalog()` / `onClickExcludeCatWishlist()` — "Exclude
    releases I've rated / cataloged / wishlisted".
  - These handlers take no argument (unlike `onClickBrowserItemSub`/`All`,
    which take a `FilterType`), so they needed a separate `toggleAdvanced`
    helper rather than reusing the existing `toggleCheckbox` — same
    checkbox-flip-then-call-handler shape, just without the filterType
    param. Added `AdvancedToggle = { id, handler }`,
    `ADVANCED_USER_TOGGLE`/`ADVANCED_EXCLUDE_TOGGLE` key tables, and
    `handleAdvancedToggleShortcut` (picks the user vs. exclude table based
    on `event.shiftKey`, same pattern as the other handlers) into
    `KEY_HANDLERS`.
  - Original key mapping was R/T/Y (non-shift) — the user asked to change
    T→F and Y→V after reviewing it, since T/Y sit awkwardly for this
    purpose; final mapping is R/F/V (and Shift+R/F/V for the exclude set).
  - User asked to keep the blank-line grouping between `HINT_LINES` blocks
    (one blank line between each shortcut category) for readability after
    an earlier pass had stripped it while cleaning up stray space/tab
    mixing — confirmed blank lines inside the array are pure formatting
    with no effect on the built output, so they're back and will stay.
  - Verified: `tsc --noEmit` and `biome check` clean.
  - **Follow-on (2026-08-06, same day): user reported R/F/V "don't work at
    all," which turned out not to be a code bug.** Initial hypothesis was
    that Safari/Chrome on macOS intercept Ctrl+F and Ctrl+V in text inputs
    as native Cocoa text-editing commands (move-cursor-forward, page-down)
    before the page ever sees them — plausible for F/V but didn't explain
    Ctrl+R, which has no such binding. Confirmed via a live console probe
    (attach a temp `addEventListener('keydown', ..., true)` directly on
    `ui_browser_input_page_charts_settings` in Safari's Web Inspector, then
    press each combo) that the keydown events *did* arrive correctly with
    the right `key`/`code`/`ctrlKey` — the browser wasn't eating them. The
    real cause: `onKeyDown` was only ever attached to the search input
    itself (`input.addEventListener("keydown", onKeyDown, true)`), so the
    shortcuts only worked while that input had focus — which the user
    hadn't realized, since they'd been testing without clicking into it
    first. Confirmed by the user: shortcuts work fine once the input is
    focused.
  - **Resulting redesign, at the user's request: made every
    `chart-prefix-commands` shortcut fire regardless of focus**, not just
    while the search input is focused (previously only Ctrl+Space/Enter
    had this via a separate document-level listener). Replaced the
    input-scoped listener and the old Ctrl+Space/Enter-only document
    listener with one consolidated `document.addEventListener("keydown",
    ..., true)` in `mount()` that calls `onKeyDown(event, input)` — `input`
    is now an explicit param (previously derived unsafely from
    `event.target`, which broke once the listener moved off the input
    itself). Added `isOtherEditableTarget(target, input)` to suppress
    firing when focus is in a *different* text input/textarea/
    contenteditable elsewhere on the page (e.g. the chart title field), so
    the shortcuts don't steal keystrokes from normal typing there — the
    RYM search input itself is exempted from this check so shortcuts still
    work while typing a genre/descriptor query into it.
  - **Final key remap, at the user's request** (a second remap beyond the
    R/T/Y→R/F/V one above): `ADVANCED_USER_TOGGLE` changed from
    R=following/F=followers/V=self to **F=following/V=followers/R=self**;
    `ADVANCED_EXCLUDE_TOGGLE` (Shift+R/F/V = rated/cataloged/wishlisted)
    was already correct and untouched.
  - Verified: `tsc --noEmit`, `biome check`, `eslint` all clean. Manually
    tested and confirmed working by the user (both focused-in-search-box
    and focused-elsewhere cases). Committed as `fb4d1e8f`.

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
  `.DS_Store`, `*.bak.*`), initial commit `1fd1c23`. No GitHub remote
  created yet — local-only for now.

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
