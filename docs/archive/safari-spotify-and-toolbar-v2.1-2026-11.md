# Safari Spotify autofind and toolbar icon fixes, App Store v2.1 (2026-11)

- **Spotify autofind broken in Safari** (found 2026-11-10; API fallback
  committed after it passed the debug panel's search check the same day;
  verified on real RYM release pages with the v2.1 release build on
  2026-11-14; submitted to the App Store as v2.1 on 2026-11-14). The import-check
  search panel showed `Spotify: FAIL — Spotify background search did not
  respond` (the 30 s timeout in `spotify-search/hidden-search.ts`). Root
  cause, from the debug build's background console: `Refused to load
  https://open.spotify.com/search/… because it does not appear in the
  frame-ancestors directive`. Since upstream #128 (2026-10-04, shipped in
  v2.0) Spotify search scrapes `open.spotify.com` in a hidden iframe in the
  background page; Safari keeps Spotify's `frame-ancestors` CSP whatever the
  extension does (blocking `webRequest` and a `declarativeNetRequest`
  session rule both failed; see `docs/alternatives.md`, "Spotify autofind
  in Safari"). Upstream moved off the API because kknq's shared app
  credentials got rate-limited (upstream issue #55).
  - Fix as built: `background/spotify-search.ts` routes to
    `searchSpotifyApi` (`background/spotify-api-search.ts`) when
    `runtime.getURL("")` starts with `safari-web-extension://`; other
    browsers keep the hidden-page search. The API search uses the user's own
    Spotify app (`VITE_SPOTIFY_ID`/`SECRET`, shared by every App Store
    user), tries `searchCategories(releaseType)` in order (the rule now
    shared with `hidden-search.ts`, in `spotify-search/categories.ts`), and
    picks the first exact title match by the searched artist, else the
    first edition match. Title rules moved out of `read-results.ts` into
    `spotify-search/title-match.ts` so both searches share them. The artist
    must equal one of the item's artists (per artist, normalized); autofind
    passes only the first credited artist (`a.artist`).
  - Quota care: the access token is cached in memory until a minute before
    `expires_in`. On a 429 the retry time (Retry-After seconds, default 60)
    is saved as `spotifyApiRetryAt` in `storage.local`, and searches return
    "Spotify is rate-limiting searches; try again in N min" without calling
    Spotify until then. `backgroundFetch` now passes `retryAfter` through.
    Successful matches were already cached for an hour (`withCache`).
  - Tests: `spotify-api-search.test.ts`, `title-match.test.ts`,
    `categories.test.ts`, a `retryAfter` case in `fetch.test.ts`, and the
    regression test in `spotify-search.test.ts` ("searches the Web API
    instead of the hidden page on Safari"), confirmed failing on the old
    routing. They can't prove Safari behaviour; the debug panel's search
    check does.
  - Also in v2.1 (2026-11-14): the toolbar icon's per-tab state.
    `setTabIcon` and the `enable` call in `background/index.ts` used
    `browser.action`, which is undefined in the MV2 Safari build (the v2.0
    console showed `undefined is not an object (evaluating
    'c.action.setIcon')` on every RYM navigation). They now go through
    `toolbarAction()`, which picks `browser.browserAction` when
    `manifest_version === 2`. Regression test: `background/index.test.ts`,
    confirmed failing on the old code. With it working, Safari shows
    upstream's green (enabled) and red (disabled) icons on RYM pages instead
    of the purple default; the user chose to keep upstream's colours.
  - Release-page check passed on 2026-11-14 with `background-BHpZ_nRx.js`
    (confirmed running from `Debug-local` via the native helper's path in
    `ps`): Spotify found a link on a release known to be on Spotify, the
    icon went red with all release features off and green again with them
    on, and the extension's Errors list showed no `setIcon` or stream-links
    import errors. Before archiving: quit the local app and re-register the
    App Store copy (`pluginkit -a`/`lsregister -f -R`, see `CLAUDE.md`).
  - Shipped as App Store v2.1 (build 14), submitted 2026-11-14 and tagged
    `app-store-v2.1-submission` on `9f3f217`. The release notes were
    promoted to the tracked `app store submission stuff/whats-new.txt`.
