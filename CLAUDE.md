# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser extension (Chrome/Firefox/Safari) adding quality-of-life features to RateYourMusic.com. Built with Vite + Preact + TypeScript, packaged via `@samrum/vite-plugin-web-extension`. A Safari build additionally ships inside a native macOS/iOS app wrapper (`EvenBetterRYM/` Xcode project, not tracked in git).

## Commands

```sh
npm run watch          # rebuild on file change (recommended for dev); reload extension + refresh page after each rebuild
npm run dev             # HMR mode, Chromium only, can hit CORS issues
npm run build            # production build, Manifest V3, output -> dist/
npm run build:safari     # production build for the Safari wrapper: forces MANIFEST_VERSION=2 and sets EXTENSION_DISPLAY_NAME="EvenBetterRYM for Safari"
npm run serve:chrome     # load dist/ into a Chromium instance via web-ext
npm run serve:firefox    # load dist/ into Firefox via web-ext
npm run lint             # biome check (format+lint) && tsc --noEmit && eslint (type-aware TS rules)
npm run format           # biome format --write
npm test                 # vitest
```

Run a single test file/case with vitest directly, e.g. `npx vitest run path/to/file.test.ts` or `npx vitest -t "test name"`.

Husky runs lint on pre-commit (see `prepare` script) — don't bypass it.

`.env` needs `VITE_SPOTIFY_ID`, `VITE_SPOTIFY_SECRET`, `VITE_TIDAL_ID`, `VITE_TIDAL_SECRET`, `VITE_YOUTUBE_KEY` for those services' features to work (Discogs works keyless).

## Manifest version and the Safari wrapper

`src/manifest.ts` generates both Manifest V2 (`getManifest(2, ...)`) and V3 (`getManifest(3, ...)`, the default) from one shared definition (`sharedManifest`). Which one gets built is controlled by the `MANIFEST_VERSION` env var read in `vite.config.ts`.

The Safari native app (`EvenBetterRYM/EvenBetterRYM.xcodeproj`) does **not** have its own build step — its iOS and macOS Safari Web Extension targets both reference `dist/manifest.json`, `dist/assets`, `dist/src`, `dist/background.html`, and `dist/icons` directly via `../../dist/...` path references in `project.pbxproj`. Running `npm run build:safari` regenerates `dist/` and is picked up by both platforms simultaneously — there is no separate iOS vs. macOS JS build. After running it, re-archive/reload in Xcode to see the change.

V2 (Safari) uses a persistent-page background (`background.scripts` + `persistent: false` — Safari on iOS/iPadOS requires `persistent: false` whenever `background.page`/`scripts` is used instead of `service_worker`, or App Store validation fails). V3 uses `background.service_worker`.

Safari-specific native settings persistence: content scripts/popup talk to the background script via `browser.runtime.sendMessage` (see `src/shared/utils/messaging.ts`), and the background script (`src/modules/background/index.ts`) proxies feature-toggle settings through `browser.runtime.sendNativeMessage` to `SafariWebExtensionHandler.swift` (`EvenBetterRYM/Shared (Extension)/`), which persists them via native `UserDefaults` rather than `storage.local` — this was a deliberate change (see `native-settings.ts`) so settings survive Safari's "clear web history" action, which wipes extension storage but not native UserDefaults.

## Debugging: reaching the extension's own pages in Safari

To open any extension-internal page directly (background page, or the
`import-check` debug page below) in the macOS Safari app: Safari > Develop
menu > select the extension ("EvenBetterRYM for Safari") > pick the
background page to open its Web Inspector. In that inspector's Console, run
`browser.runtime.getURL("path/to/file.html")` to get the full
`safari-web-extension://<uuid>/...` URL, then paste that into a normal
Safari tab. The UUID is unique per install and isn't discoverable any other
way from the UI. Checked (2026-08-14) whether this UUID can be made stable
across rebuilds so it wouldn't need re-fetching each time — no supported way
found; it's assigned by macOS's own extension registration system
(`pluginkit`/Launch Services), not by anything in the extension's manifest
or bundle config, and Apple doesn't document the assignment behavior. Not
worth re-investigating without new evidence; the background-script
auto-console-log below is the actual mitigation.

Remember `dist/` regenerating (`npm run build:safari`) is **not** picked up
by a running Safari session until the `EvenBetterRYM (macOS)` target is
rebuilt/relaunched in Xcode — this trips people up because the file/URL
looks like it should just work after a plain `npm run build:safari`.

### `src/modules/import-check/` debug page

An extension-internal page (wired in via `additionalInputs.html` in
`vite.config.ts`, the same mechanism `@samrum/vite-plugin-web-extension`
uses for the popup) that calls services' `resolve()`/`search()` directly,
without navigating to rateyourmusic.com or anywhere else. It exists because
of a specific problem hit while debugging a Beatport import failure that
only reproduced in the macOS Safari app (see `plan.md`): driving the real
"Import" form with Selenium/`safaridriver` (kept under `e2e/`, per explicit
user choice, even though unused) triggers Cloudflare's bot challenge on
navigation, since Safari's remote-automation mode sets `navigator.webdriver`
and Cloudflare detects it — this happens on the RYM page itself, not just on
Cloudflare-fronted target sites, making full-page automation a dead end here.
Calling a service function directly from a page that never navigates
anywhere sidesteps that entirely.

`app.tsx` renders two independent panels, each in its own file:
- `import-panel.tsx` — the original resolve check: one URL per `RESOLVABLES`
  service, entered as a textarea of service-name → URL pairs. The default
  URLs (a specific "The World of Monnom Black" various-artists release, one
  URL per service) came from `e2e/urls.json` (gitignored, personal test
  data) — baking them into this file means they're tracked in git now,
  unlike the gitignored copy.
- `search-panel.tsx` — the autofind check, added to triage "autofind link"
  failures (the stream-links module's `service.search()` icons): a single
  artist/title pair run against every `SEARCHABLES` service (the ones with a
  `search()`, currently 8 — Apple Music, Bandcamp, SoundCloud, Spotify,
  YouTube, Deezer, Qobuz, Tidal), rendering each match's URL as a clickable
  link (not just PASS/FAIL) so a confidently-wrong match is visible, not
  just a thrown error.

Both panels share `check-runner.ts`'s `runChecks()` — the same
parallel-run/`OneShot`-per-key pattern the resolve panel originally had
inline, generalized so the search panel didn't reimplement it. Note for
interpreting search-panel results: every `SEARCHABLES.search()` is
`withCache`-wrapped (`src/shared/utils/cache.ts`), and a **successful**
match is cached in `browser.storage.local` for 1 hour keyed by the exact
`{artist, title}` pair — failures and not-found results are never cached, so
a currently-broken finder always re-hits the network, but re-running the
same pair right after fixing something can still show the old cached URL.
Also: Spotify/Tidal/YouTube's finders need `.env`'s
`VITE_SPOTIFY_ID`/`SECRET`, `VITE_TIDAL_ID`/`SECRET`, `VITE_YOUTUBE_KEY`
respectively — a missing key fails that finder for a reason unrelated to the
finder's own logic, worth ruling out before treating a fail as a real bug.

**Gated behind `VITE_DEBUG_TOOLS` so it doesn't ship**: `npm run build:safari`
(and plain `npm run build`) never include this page — `vite.config.ts` only
adds the `additionalInputs.html` entry when `env.VITE_DEBUG_TOOLS === "true"`,
so with the flag unset the page is absent from `dist/` entirely, not just
unlinked. `npm run build:safari:debug` sets the flag inline (same pattern as
`MANIFEST_VERSION`/`EXTENSION_DISPLAY_NAME` in `build:safari`) to produce a
build that includes it. The background script also logs the debug page's
`browser.runtime.getURL(...)` to its own console on startup, gated on the
same `import.meta.env.VITE_DEBUG_TOOLS` check, so you don't have to type the
`browser.runtime.getURL("src/modules/import-check/index.html")` one-liner by
hand each time — open the background page's Web Inspector (see above) and
the URL is already printed. The path has to be the on-disk `dist/` path
(`src/modules/import-check/index.html`, matching the
`additionalInputs.html` entry and the resulting `web_accessible_resources`
entry in the built `manifest.json`) rather than a shorter `import-check/...`
path — using the shorter form once produced Safari's "Safari Can't Find the
File" / `NSURLErrorDomain -1100`, since it pointed at a resource that
doesn't exist in the bundle. Because the check is a compile-time-constant comparison,
Vite dead-code-eliminates both the console.log call and the import-check
module from a plain `build`/`build:safari` — confirmed by grepping the
built `dist/assets/` for the log string and for `import-check` files after
each build variant, not just by reading the source.

The Safari app's App Store Connect listing needs a Privacy Policy URL. This is hosted as a static page on a dedicated `gh-pages` branch (root `index.html`, orphan branch — no shared history with `main`), published via GitHub Pages at `https://arkfallbravo.github.io/even-better-rym/`. Kept on its own branch rather than in `main`'s `docs/` folder (which holds internal architecture notes like `codebase.md`/`plan.md`, not public content) so `main`'s tree/history stays free of unrelated public-facing HTML. To update the policy text, edit `index.html` on the `gh-pages` branch directly and push — it is not part of the Vite build or `dist/`.

## App Store Connect metadata (macOS/iOS "EvenBetterRYM for Safari" listing)

These values live only in App Store Connect's web UI, not in this repo, so they're recorded here in case the listing needs to be recreated or updated for a future version:

- **Copyright**: `2026 Helena Simson` — matches the name the Apple Developer account is registered under.
- **Support URL**: `https://github.com/ArkfallBravo/even-better-rym/issues` — no dedicated support site, so this points at the repo's issue tracker (same pattern as the privacy policy's contact link).
- **Age Ratings → Capabilities**: `Unrestricted Web Access` = No (the app is a Safari Web Extension whose content scripts only run on rateyourmusic.com per `manifest.ts`'s `content_scripts` matches — no in-app browser); `User-Generated Content` = No (the extension reformats/enhances RYM's existing page content but doesn't itself host, aggregate, or redistribute user-created content as part of its own feature set).
- **Content Rights**: "Yes, it contains, shows, or accesses third-party content, and I have the necessary rights" — the extension displays RYM page content and fetches metadata/embeds from streaming services (Spotify, Apple Music, Bandcamp, Discogs, Tidal, YouTube, etc.) via each service's official public API.

**Tracking what changed since the last submission**: the commit that was actually on `main` when the v1.0 build was submitted for App Store review (2026-07-28) is tagged `app-store-v1.0-submission` (pushed to origin, points at `5d776223`). For a future version's "What's New" text, diff from there — `git log app-store-v1.0-submission..main` — rather than guessing how far back to look. When a new version is submitted, tag that new submission point too (following the same `app-store-vX.Y-submission` naming) so the chain stays unbroken.

**Working drafts of the App Store Connect description and "What's New" text** live in `app store submission stuff/` (untracked — not committed, no `.gitignore` entry either, just never added) as `app-store-description.txt` and `whats-new.txt`. That directory also holds the macOS screenshot PNGs and, as of 2026-08-14, has effectively replaced the previously git-tracked `screenshots/` dir — `git status` currently shows all six files under `screenshots/` as deleted in the working tree, uncommitted. That move/rename hasn't been committed or explicitly resolved; worth confirming with the user whether to commit the `screenshots/` removal (and start tracking `app store submission stuff/`, or keep it untracked) rather than assuming either direction.

**Producing a `*_2560x1600.png` macOS screenshot** (the App Store's required macOS screenshot size): the user's own two-command `sips` pipeline is the canonical method — don't re-derive a crop/scale transform independently, even if the result looks bordered:
```sh
sips -Z 2560 <source>.png --out <source>_2560.png
sips --cropOffset 0 71 --cropToHeightWidth 1600 2560 <source>_2560.png --out <source>_2560x1600.png
```
Verified byte-for-byte identical (0.0 mean pixel diff) against the existing `mac_add_release_2560_1600.png` reference. The `cropOffset 0 71` is calibrated to this project's window screenshots specifically — captured Safari window position/size has been pixel-identical across every source screenshot checked so far (same `content bbox` in raw captures regardless of page content). Reusing these exact two commands is safe as long as future screenshots keep that same window position/size; the output legitimately has an uneven black margin around the window (61px top / 49px bottom / 20px left / 162px right) — that is not a bug to fix, it's what the established pipeline produces.

## GitHub repo notes

`ArkfallBravo/even-better-rym` is itself a fork (of `kknq`'s repo). When opening a PR via the GitHub web UI, it defaults the **base repository** dropdown to the upstream fork parent (`kknq/...`), not `ArkfallBravo/even-better-rym` — if the PR is meant to land in this repo's own `main`, both the base repository and base branch dropdowns need to be set explicitly, or the PR silently proposes merging into the wrong repo entirely.

There was previously a branch ruleset on `main` named "Reckon comprehension (managed)" (a third-party GitHub App requiring a status check before merge/push) — it was deleted via `gh api -X DELETE repos/ArkfallBravo/even-better-rym/rulesets/<id>` on 2026-07-28 because it blocked direct pushes to `main` and the user didn't want it. `main` currently has no required-status-check ruleset; if one reappears unexpectedly, check `gh api repos/ArkfallBravo/even-better-rym/rulesets` before assuming it needs a PR workflow to satisfy it.

`chart-searchbar` diverged from `main` at `10b8f106` and has since kept its own independent `docs/plan.md`/`docs/todo.md` entries in parallel with `main`'s (e.g. both branches separately documented the same Beatport/Qobuz/Melon import-failure investigation from 2026-07-28, in different wording). Cherry-picking `main` fixes onto `chart-searchbar` (or vice versa) reliably conflicts in these two doc files even when the code changes apply cleanly — resolve by keeping both sides' unique content (append rather than pick one), except where one side's wording is simply an earlier/unresolved draft of what the other side already resolved (e.g. "not yet investigated" vs "**Resolved** ..." for the same issue) — keep the resolved version in that case. Always double check `git status`/`git rev-parse --abbrev-ref HEAD` before and after each cherry-pick in a multi-commit sequence — mid-sequence branch state can silently reset between tool calls.

**Bringing `chart-searchbar`'s work to `main` (done 2026-08-06, squashed as `f96852bd`):** `git cherry -v main chart-searchbar` found 20 commits not equivalent to anything on `main`, but 3 of those (pull-credits auto-import, Qobuz locale fix, Melon host permission) were excluded — diffing each pair's code changes only (excluding the three doc files) showed the actual code was identical to what `main` had already independently landed, just narrated differently in docs; only the remaining 17 chart-shortcuts feature/docs commits were cherry-picked. A nastier doc-conflict shape than the paragraph above describes turned up partway through: one commit's conflict block contained a **wholesale duplicate** of a block already merged earlier in the same cherry-pick sequence (not just similar wording) — worth grepping a distinctive phrase from a conflict block against the rest of the file before assuming both sides are unique content to keep. After all 17 applied cleanly, the resulting commits were squashed into one (`git reset --soft <original main tip>` + single commit) per the user's preference — the full granular 17-commit history stays on `chart-searchbar` untouched.

That squash also surfaced two lint-config gaps, now fixed: (1) `biome.json`'s `files.includes` had no exclusion for the non-source reference-dump files `chart-searchbar` had committed (`apple_music_source.html`, `charts_source.html`, a saved GitHub-issue HTML page) — Biome was linting them as real markup and raising ~230 spurious a11y errors; excluding them by exact filename fixed it. Biome's glob syntax requires literal `[`/`]` in a filename to be escaped as `\[`/`\]` (`Character class [] are not supported` otherwise) — the uBlock issue HTML's `[Safari]` prefix needed this. (2) Separately, `npm run lint` (`biome check && tsc && eslint`) was already failing on `main` *before* this work, unrelated to it — `src/modules/hide-votes/app.ts` has a pre-existing Biome error, and Biome has no `vcs.useIgnoreFile` config so it also scans gitignored paths (`.claude/settings.local.json`, the untracked `EvenBetterRYM/` dir) and flags issues there too. Since `biome check` runs first in the chain, that pre-existing failure was silently blocking `tsc`/`eslint` from ever running as part of `npm run lint` — run them directly on specific changed files to verify cleanliness when this happens rather than trusting the chained command's exit code.

## Architecture

### Feature module pattern

Each feature lives in its own directory under `src/modules/`. Every module follows:
- `main.ts` — entry point injected by a `content_scripts` entry in `src/manifest.ts`. Wraps everything in a top-level `await runPage('key', async () => { ... })`.
- `app.ts` / `app.tsx` — the actual feature logic or root Preact component.

`runPage` (`src/shared/page-settings.ts`) checks the feature's enabled/disabled toggle (via `getPageEnabled`, which round-trips through the background script) before running the callback, and swallows errors from `callback()` (e.g. a module failing because an expected DOM element isn't present on some page layout is expected, not fatal).

Adding a module requires wiring it in three places: a `content_scripts` entry in `src/manifest.ts`, a `PageKey` + label/hint entry in `src/shared/pages.ts`, and the module directory itself.

When a module needs to suppress RYM's own native event handling on an element, replace the `on*` property handler (`input.onkeyup = ...`) rather than `addEventListener` — RYM assigns its own handlers via the `on*` properties, so `addEventListener` only adds a second listener alongside the original instead of taking it over, and both fire. Save the original handler reference first and conditionally forward to it so RYM's own behavior still runs once your module's own state no longer needs to intercept it. (`src/modules/chart-shortcuts/app.ts` used to be the example of this pattern via `suppressNativeKeyUp`/`suppressNativeBlur`, overriding the chart-builder search input so its own suggestion overlay could take over — but that overlay turned out to actively fight RYM's own native dropdown rather than coexist with it; see the `chart-shortcuts` redesign entry in `docs/plan.md`, which removes the overlay and those two functions entirely.)

RYM's own chart-builder search widget (`RYMbrowser`, from `cdn.sonemic.net/dist/rym25/js/ui/browser.js`, not part of this repo) is what actually owns the `ui_browser_*` DOM ids (`ui_browser_input_page_charts_settings`, `ui_browser_list_page_charts_settings`, `ui_browser_list_contents_page_charts_settings`) that `chart-shortcuts` reads/writes — these are RYM's own element ids, not ones this codebase created, so any module touching them is touching native UI state, not a sandbox of its own. Useful internals if a future module needs to integrate with this widget rather than replace it: `RYMbrowser.currentResultSet["<id>"]` holds the exact `{results: [...]}` JSON currently rendered in that widget's list (same shape as `/api/1/browse/music/`'s response); `RYMbrowser.path["<id>"]` is the sub-browse navigation stack (empty = showing top-level search results, non-empty = the user has clicked into "Browse sub-genres/descriptors" and the list now holds sub-items); and `RYMbrowser.addBrowserItem(id, filterType, itemId, name)` just forwards to `RYMchart.addBrowserItem(filterType, itemId, name)` (the same function this module already calls directly) before clearing the input and nav path.

Content scripts execute in an isolated JS world: they share the DOM with the page but have their own separate `window`, so a page-defined global (e.g. `window.RYMchart`, `window.streamingPreferences`) is always `undefined` from inside a content script's own code, no matter how long you wait for it — this is not a timing issue, and checking `typeof window.X` in the devtools console won't reproduce it, since the console runs in the page's own world. This bit `chart-shortcuts` directly: an early version called `window.RYMchart.addBrowserItem(...)` straight from `app.ts` and silently no-opped, even though a companion Tampermonkey userscript doing the exact same call (unsandboxed, running in the page's real world via `@grant none`) worked fine. To reach a page global, use `runScript()` (`src/shared/utils/dom.ts`) to inject a `<script>` tag whose contents execute in the page's real world. For a fire-and-forget call with no return value, build the whole operation (including any transient monkey-patching, like temporarily no-op'ing a callback to suppress an unwanted side effect) as one self-contained injected script (see `applyItem`/`updateChart`/`patchRYMChartRemoval` in `chart-shortcuts/app.ts`). To read a value back into the content script, dispatch a `CustomEvent` with the value as `.detail` from the injected script and listen for it via `document.addEventListener` (see `getStreamingPreferences` in `stream-links/use-page-data.ts`).

### Page key registry (`src/shared/pages.ts`)

Single source of truth mapping each `PageKey` to: its URL path prefix (`pages`), popup toggle label (`pageLabels`), popup description (`pageHints`), and which URL-prefix group it's shown under in the popup (`pageGroupLabels`). `globalPageKeys` marks keys (currently just `searchBar`) whose toggle state shouldn't affect the toolbar icon shown by the background script.

### Background script message routing (`src/modules/background/index.ts`)

Single `browser.runtime.onMessage` listener dispatches on a discriminated `message.type` (defined in `src/shared/utils/messaging.ts`): `storageSet`, `settingsGetAll`, `settingsSet` are tab-less messages (from the popup); everything else is tab-scoped and routed through `getResponse`/`getScriptResponse` to handlers in `download.ts`, `fetch.ts`, `script.ts`. The background script also maintains an in-memory `settingsCache` (hydrated from native settings) and updates the toolbar icon per-tab based on whether the current page's feature is enabled — it reads `settingsCache` directly here rather than calling `getPageEnabled`, to avoid a message round-trip back to itself.

`fetch.ts` exists because some cross-origin requests (auth token exchange, API calls without CORS headers) must run from the background script's context rather than a content script.

### Popup sizing (`src/modules/popup/`)

Extension popups (Safari confirmed, likely Chrome/Firefox too) don't expose a normal CSS viewport: the browser first measures the page's natural, unconstrained content size, then separately clamps the *visible* popover to its own max height without giving that clamped region real scroll chrome. That means `height: 100%` on `html`/`body` has no definite containing block to resolve against and silently falls back to content size — it does nothing. The working pattern (see `app.tsx`'s `styles.root`) is a hardcoded pixel `maxHeight` (600, the standard extension-popup max) plus `overflow: hidden` on the root flex column, with the scrollable region (`styles.list`) as a flex child using `flex: 1; minHeight: 0; overflowY: "auto"`. Every direct child of that scrollable flex column also needs `flexShrink: 0` (see `styles.card`/`styles.cardFlat`) — otherwise flexbox's default `flex-shrink: 1` compresses them to fit the clamped space instead of overflowing, which looks like rows overlapping/being crushed rather than a missing scrollbar, and is easy to misdiagnose as a scroll-input problem. Diagnose this class of bug by comparing `element.scrollHeight` to `element.clientHeight` in the popup's Web Inspector console: equal values mean content is being compressed (a flex-shrink problem), not clipped-with-no-scroll (which would show `scrollHeight > clientHeight`).

Known tradeoff: the 600px cap is hardcoded, not measured per-display. It was chosen because it matched the actual clamp observed when debugging on an external monitor, but on smaller/larger displays the browser's real cap may differ — worth revisiting if a future display shows either wasted empty space (real cap > 600) or a cap already reached below 600.

### Streaming service integrations (`src/shared/services/`)

Each service (`spotify/`, `bandcamp/`, `discogs/`, etc.) implements a subset of the `Service` interface (`types.ts`): always `{ id, name, icon, regex }`, plus optionally `Searchable` (artist/title → URL), `Resolvable` (URL → full `ResolveData` metadata), `Embeddable` (URL → embed HTML). `services/index.ts` aggregates all services into `SERVICES` and derives `SEARCHABLES`/`RESOLVABLES`/`EMBEDDABLES` via type-guard filters — features query these arrays rather than importing individual services, so adding a new service only requires implementing it and adding it to the `SERVICES` array. Service icons are co-located per-service (`services/spotify/icon.tsx`, `icon-found.tsx`, `icon-notfound.tsx`); only generic UI icons live in `shared/icons/`.

### Vote history data (`src/modules/vote-history/data/`)

`genres.ts` and `descriptors.ts` are generated files, refreshed via `npm run refresh-genres` / `refresh-descriptors` / `refresh-all`, which run `scripts/vote_history_refresh.py` against manually-downloaded `.htm` pages from RYM's admin queue (see README for the exact URLs) — not something to hand-edit.
