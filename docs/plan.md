# Plan / open work

- App Store Connect listing for "EvenBetterRYM for Safari" (iOS + macOS,
  v1.0): metadata (description, promo text, copyright, support URL, age
  ratings, content rights) filled in — see `CLAUDE.md`'s "App Store Connect
  metadata" section for the exact values chosen and why. Submitted for
  review on 2026-07-28, same day the popup scroll fix (commit `5d776223`)
  was cherry-picked to `main`.

(Safari iOS manifest `persistent` flag fix landed in commit `3d803f30` — see
`docs/codebase.md` for the reasoning if needed.)

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
