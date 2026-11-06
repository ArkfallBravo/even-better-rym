# Upstream syncs (2026-10)

The two merges of `upstream/main` into the fork (through #124, then through #149), both in `main` and pushed. The collection-settings change made during the second sync stays in `docs/plan.md` until it's tested. Moved out of `docs/plan.md` on 2026-10-16.

- Upstream sync (started 2026-10-02, branch `sync-upstream`): merging all
  32 `upstream/main` commits not yet on the fork (last sync was `25ce505`,
  2026-07-25) up to `167255d` (#124). Status: committed, and in `main`
  since the second sync fast-forwarded it (2026-10-11).

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
  user said not to open one). It reached `main` through the second sync
  below.

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
