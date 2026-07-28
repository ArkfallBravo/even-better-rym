# Plan / open work

(Safari iOS manifest `persistent` flag fix landed in commit `3d803f30` — see
`docs/codebase.md` for the reasoning if needed.)

- `feature/chart-prefix-commands` branch: ports the Tampermonkey userscript
  at `Userscripts/RYM Chart Prefix Commands.user.js` (sibling directory to
  this repo, outside git) into `src/modules/chart-prefix-commands/` as a
  toggleable feature (`chartPrefixCommands` page key, gated on `/charts/*`).
  Manually tested in the Safari-wrapped app and confirmed working (prefix
  commands, Ctrl+1/2/3/D shortcuts, exclude toggle, hint text placement) as
  of 2026-07-27, after fixing a content-script isolated-world bug where
  `window.RYMchart` calls were routed through `runScript()` — see `CLAUDE.md`
  for the general pattern. Built Safari-first per the user's workflow —
  feature branches here aren't merged straight into `main`; the user merges
  the relevant changes into their own fork's main branch by hand once a
  branch is where they want it.
- The chart-prefix-commands hint text is inserted as bare content directly
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
  safari-web-extension://.../import-check/index.html`) is an unrelated
  pre-existing bug, not part of this investigation: `document_.URL` on a
  `DOMParser`-created document doesn't retain the fetched page's URL in
  WebKit (it reflects the parsing document's own URL instead), which is
  just misleading error text — the real issue is that
  `src/shared/services/qobuz/resolve.ts:38-45` expects a second
  `application/ld+json` script tag on the fetched page and it's missing,
  likely related to the `usUrl` locale-rewrite at `resolve.ts:77`. Not yet
  investigated further.

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
