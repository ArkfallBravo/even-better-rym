# Import and autofind debugging (2026-07 to 2026-08)

The Beatport/Melon/LiveMixtapes and Qobuz import failures, the import-check debug page, and the Tidal autofind fix. Open follow-ups (Bandcamp/Qobuz "NOT FOUND", `setTabIcon`) are in `docs/todo.md`. Moved out of `docs/plan.md` on 2026-10-16.

- Autofind-link triage (started 2026-08-14; the debug tooling and the Tidal
  fix are committed, and the Bandcamp/Qobuz "NOT FOUND" results are still
  unchecked, tracked in `docs/todo.md`):
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
