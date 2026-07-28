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

## App Store privacy policy

The Safari app's App Store Connect listing needs a Privacy Policy URL. This is hosted as a static page on a dedicated `gh-pages` branch (root `index.html`, orphan branch — no shared history with `main`), published via GitHub Pages at `https://arkfallbravo.github.io/even-better-rym/`. Kept on its own branch rather than in `main`'s `docs/` folder (which holds internal architecture notes like `codebase.md`/`plan.md`, not public content) so `main`'s tree/history stays free of unrelated public-facing HTML. To update the policy text, edit `index.html` on the `gh-pages` branch directly and push — it is not part of the Vite build or `dist/`.

## Architecture

### Feature module pattern

Each feature lives in its own directory under `src/modules/`. Every module follows:
- `main.ts` — entry point injected by a `content_scripts` entry in `src/manifest.ts`. Wraps everything in a top-level `await runPage('key', async () => { ... })`.
- `app.ts` / `app.tsx` — the actual feature logic or root Preact component.

`runPage` (`src/shared/page-settings.ts`) checks the feature's enabled/disabled toggle (via `getPageEnabled`, which round-trips through the background script) before running the callback, and swallows errors from `callback()` (e.g. a module failing because an expected DOM element isn't present on some page layout is expected, not fatal).

Adding a module requires wiring it in three places: a `content_scripts` entry in `src/manifest.ts`, a `PageKey` + label/hint entry in `src/shared/pages.ts`, and the module directory itself.

When a module needs to suppress RYM's own native event handling on an element (e.g. `src/modules/chart-prefix-commands/app.ts` overriding the chart-builder search input so its own overlay doesn't fight with RYM's built-in autocomplete), replace the `on*` property handler (`input.onkeyup = ...`) rather than `addEventListener` — RYM assigns its own handlers via the `on*` properties, so `addEventListener` only adds a second listener alongside the original instead of taking it over, and both fire. Save the original handler reference first and conditionally forward to it (see `suppressNativeKeyUp`/`suppressNativeBlur` in that module) so RYM's own behavior still runs once your module's own state no longer needs to intercept it.

Content scripts execute in an isolated JS world: they share the DOM with the page but have their own separate `window`, so a page-defined global (e.g. `window.RYMchart`, `window.streamingPreferences`) is always `undefined` from inside a content script's own code, no matter how long you wait for it — this is not a timing issue, and checking `typeof window.X` in the devtools console won't reproduce it, since the console runs in the page's own world. This bit `chart-prefix-commands` directly: an early version called `window.RYMchart.addBrowserItem(...)` straight from `app.ts` and silently no-opped, even though a companion Tampermonkey userscript doing the exact same call (unsandboxed, running in the page's real world via `@grant none`) worked fine. To reach a page global, use `runScript()` (`src/shared/utils/dom.ts`) to inject a `<script>` tag whose contents execute in the page's real world. For a fire-and-forget call with no return value, build the whole operation (including any transient monkey-patching, like temporarily no-op'ing a callback to suppress an unwanted side effect) as one self-contained injected script (see `applyItem`/`updateChart`/`patchRYMChartRemoval` in `chart-prefix-commands/app.ts`). To read a value back into the content script, dispatch a `CustomEvent` with the value as `.detail` from the injected script and listen for it via `document.addEventListener` (see `getStreamingPreferences` in `stream-links/use-page-data.ts`).

### Page key registry (`src/shared/pages.ts`)

Single source of truth mapping each `PageKey` to: its URL path prefix (`pages`), popup toggle label (`pageLabels`), popup description (`pageHints`), and which URL-prefix group it's shown under in the popup (`pageGroupLabels`). `globalPageKeys` marks keys (currently just `searchBar`) whose toggle state shouldn't affect the toolbar icon shown by the background script.

### Background script message routing (`src/modules/background/index.ts`)

Single `browser.runtime.onMessage` listener dispatches on a discriminated `message.type` (defined in `src/shared/utils/messaging.ts`): `storageSet`, `settingsGetAll`, `settingsSet` are tab-less messages (from the popup); everything else is tab-scoped and routed through `getResponse`/`getScriptResponse` to handlers in `download.ts`, `fetch.ts`, `script.ts`. The background script also maintains an in-memory `settingsCache` (hydrated from native settings) and updates the toolbar icon per-tab based on whether the current page's feature is enabled — it reads `settingsCache` directly here rather than calling `getPageEnabled`, to avoid a message round-trip back to itself.

`fetch.ts` exists because some cross-origin requests (auth token exchange, API calls without CORS headers) must run from the background script's context rather than a content script.

### Streaming service integrations (`src/shared/services/`)

Each service (`spotify/`, `bandcamp/`, `discogs/`, etc.) implements a subset of the `Service` interface (`types.ts`): always `{ id, name, icon, regex }`, plus optionally `Searchable` (artist/title → URL), `Resolvable` (URL → full `ResolveData` metadata), `Embeddable` (URL → embed HTML). `services/index.ts` aggregates all services into `SERVICES` and derives `SEARCHABLES`/`RESOLVABLES`/`EMBEDDABLES` via type-guard filters — features query these arrays rather than importing individual services, so adding a new service only requires implementing it and adding it to the `SERVICES` array. Service icons are co-located per-service (`services/spotify/icon.tsx`, `icon-found.tsx`, `icon-notfound.tsx`); only generic UI icons live in `shared/icons/`.

### Vote history data (`src/modules/vote-history/data/`)

`genres.ts` and `descriptors.ts` are generated files, refreshed via `npm run refresh-genres` / `refresh-descriptors` / `refresh-all`, which run `scripts/vote_history_refresh.py` against manually-downloaded `.htm` pages from RYM's admin queue (see README for the exact URLs) — not something to hand-edit.
