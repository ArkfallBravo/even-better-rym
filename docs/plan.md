# Plan / open work

- Release v2.2: the vote-based autofind plus upstream v3.3.0 (started
  2026-11-14, branch `sync-upstream-3.3` off `main`, nothing pushed yet).
  The user agreed this order on 2026-11-14:
  1. Merge `upstream/main` into the fork. **Done**: checkpoint merge
     `63e9e6e` (Xcode repo `4f7836c`). Committed before any Safari test, at
     the user's request, so the simplify pass got its own commit.
  2. `/simplify` pass on the statusline's diff (baseline: the last simplify
     commit `e626c8b` with upstream merged on top, so kknq's commits don't
     count). **Done**: `2080d45`.
  3. One Safari test of the combined build by the user. **Done**
     (2026-11-14, local `Debug-local` build of `a1c8112`, App Store copy
     unregistered): the vote-based autofind, the stream-link icon colors,
     Discography Section Order and a Safari restart all checked, and the
     user said "everything works". `main` fast-forwarded to the branch.
     Safari is still on the local build; re-register the App Store copy
     when done (see `CLAUDE.md`). Step 4 is next.
  4. Upstream PR for the vote-based autofind only: a branch from
     `upstream/main` with the simplified feature ported onto it, pushed with
     `git push -u origin <branch>` (see `CLAUDE.md`, "Preparing an upstream
     PR").
  5. App Store v2.2: version 2.2, build 15, What's New covering the
     autofind plus kknq's user-visible 3.3.0 changes, archive, tag
     `app-store-v2.2-submission`. It can't be submitted while v2.1 is still
     in review; whether 2.1 has cleared is unknown (it was submitted
     2026-11-14).

  State after step 2: `tsc` is clean, vitest passes (150 files, 1950 tests),
  and `eslint src` shows only the two errors in upstream-identical files
  (`hide-ratings/app.test.ts`, `timeline/graph.ts`). `npm run build:safari`
  and the macOS `xcodebuild` succeed. A full test run once reported an
  unhandled error from upstream's `date-controls.test.tsx` (a timer firing
  after teardown); the file passed three times alone and the next full run
  was clean, so it's treated as load-dependent flakiness.

  How the sync conflicts were resolved:
  - `spotify-search/read-results.ts` takes upstream's structure (alias
    matching through `getSearchArtists`, `findMatchingLinks`) but keeps the
    fork's `matchTitle`. `title-match.ts` now uses upstream's shared
    `normalizeSearchText` and treats upstream's `isReissueTitle` as an
    edition. The Safari API search (`spotify-api-search.ts`) accepts the
    artist alias too.
  - `background/spotify-search.ts` keeps the Safari API path. Upstream's
    network diagnostics only observe the hidden-page path, and the catch
    branch still adds them as upstream does.
  - `page-settings.ts` keeps the fork's native toggles (`resolvePageEnabled`,
    which already had upstream's off-by-default keys). `discographyOrder` is
    on exactly when the saved section order isn't RYM's, read through
    `getSectionOrder`. Upstream's new `page-settings.test.ts` was rewritten
    against the fork's messaging. Its obsolete `brym.userPageSettings` test
    was dropped, since the fork never read that key.
  - Upstream's `fetchInPage` now rejects on errors and timeouts, so
    `loadLinkVotes` catches and returns no links (regression test in
    `link-votes.test.ts`).
  - Every upstream setting moved to the native store, per the user's choice
    (see `CLAUDE.md`, "Non-boolean settings"): the discography section
    order, discography progress types and zero-coverage flag, stream-link
    colors, reference-link color and release control layout. Their watchers
    use `subscribeToStoredSetting`, which now returns an unsubscribe
    function. A section-order reset saves the default order, because
    `stored-settings` has no remove.
  - Upstream added `dist/changelog.js`, loaded by `changelog.html`. The
    Xcode project now references it for both targets (`4f7836c`).

  Simplify pass findings left alone: sharing the Spotify "exact, else first
  edition" loop between `pickSpotifyMatch` and upstream's
  `findMatchingLinks`, and parsing Apple Music's lockup script once instead
  of twice, both need edits to kknq-authored lines. Moving the Spotify API
  token into a shared `withCache` cache would persist the access token in
  `storage.local`. The test-setup cleanup, the iOS background-fetch check
  and the toolbar icon's `discographyOrder` rule are in `docs/todo.md`.

- Autofind streaming links when RYM's links aren't upvoted (2026-11-14,
  `6b38bb2`, simplified in `2080d45`). The user tested the pre-merge build
  in Safari and said it "works amazingly"; it ships in v2.2 above. When
  every RYM link for a service has a net vote score of zero or below in the
  user's region for that service, the stream-links icon searches and links
  to the search result with the autofound icon. If the search finds nothing
  or fails, it keeps RYM's link. This is judged service by service, as the
  user chose.
  - The votes aren't in the release page's `data-links` JSON. They come
    from RYM's `/submit_media_link?object=release&assoc_id=N` page, found
    through the release page's own link to it and fetched with
    `fetchInPage` (page world, logged-in cookies; a plain curl got
    Cloudflare's 403). Each row in `#media_link_list` has the link's `<a>`,
    followed by a tally div like `CA: +1 / -0, US: +0 / -1`
    (`link-votes.ts`; the saved page is the untracked
    `Submit media link - Rate Your Music.html` at the repo root). That page
    lists only the "Entire album" links.
  - A country missing from a link's tally counts as zero. Services with no
    region set are never overridden. A failed fetch parses to no links,
    which leaves every service as it was.
  - The choice between RYM's link and a search lives in
    `stream-link-state.ts` (`getStreamLinkState`), out of the UI component.
  - The vote page is only fetched when some service has both a RYM link
    and a region set (`hasRegionalLink`), after `getLinks()`.
  - Open: this costs one extra RYM page request per qualifying release
    view, without caching. Most links only have votes from the submitter's
    country, so expect searches on many releases.

- `EvenBetterRYM/` checkpoint commit before "Update to recommended settings"
  (2026-08-14, open — not yet resolved): while wrapping up the autofind-link
  triage session (now in `docs/archive/import-debugging-2026-07-08.md`),
  Xcode prompted to "Update to recommended settings"
  on the `EvenBetterRYM.xcodeproj` project, which the user flagged as
  potentially irreversible. Rather than risk that change being unreviewable
  afterward, committed the private `EvenBetterRYM/` repo's pre-existing
  uncommitted state as-is (`a8b383c`) first, explicitly as a revertible
  checkpoint — the user's own reasoning: "if we commit, we can always revert
  the change later." That commit includes two things unrelated to that
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
  The deployment-target part is settled: an uncommitted change seen
  2026-10-01 had switched the four macOS configurations to
  `$(RECOMMENDED_MACOSX_DEPLOYMENT_TARGET)` (14.0), plausibly this
  "recommended settings" update. It was reverted on 2026-11-06, and the
  target is now 12.0, the lowest the installed Xcode builds (see `CLAUDE.md`,
  "Shipped versions"). The rest of the update and the plist cleanup remain
  open.

## Archived initiatives

- Apple Music release-title import fix (`Sorry : / /` / `Sorry :p` →
  `Sorry :/` / `Sorry :P`) + the 2026-09-06 `/simplify` pass on branch
  `fix-apple-music-title-slash-mangling` — fully shipped to `main`
  (`56ebb84`) and pushed. Writeup:
  `docs/archive/apple-music-title-fix-and-simplify-2026-09.md`.
- `chart-shortcuts` include-sub / must-contain-all toggle shortcuts
  (2026-08-05), shipped to `main`. Writeup:
  `docs/archive/chart-shortcuts-toggle-shortcuts-2026-08.md`.
- Guest credits on non-VA releases and bonus-track tags (2026-10-12, on
  `main` as `d143a1b`, also in PR #150): fully shipped and tested in Safari.
  Writeup: `docs/archive/guest-credits-and-bonus-track-2026-10.md`.
- Safari app build, Xcode repo and App Store v1.0 listing (2026-07 to
  2026-08), shipped. Writeup: `docs/archive/safari-app-setup-2026-07-08.md`.
- chart-shortcuts port and redesign, and `chart-searchbar` → `main` (2026-07
  to 2026-08), shipped. Writeup:
  `docs/archive/chart-shortcuts-and-chart-searchbar-2026-07-08.md`.
- Import and autofind debugging: Beatport/Qobuz imports, the import-check
  page, the Tidal fix (2026-07 to 2026-08). Writeup:
  `docs/archive/import-debugging-2026-07-08.md`.
- Upstream syncs through #124 and #149 (2026-10), in `main` and pushed.
  Writeup: `docs/archive/upstream-syncs-2026-10.md`.
- Upstream sync to v3.1.0 and the PR #144 Apple Music fix (2026-11), in
  `main` and pushed. Writeup: `docs/archive/upstream-sync-3.1-2026-11.md`.
- Tracklist and release-artist pickers and PR #150 (2026-10), merged
  upstream and now replaced by kknq's rewrite. Writeup:
  `docs/archive/tracklist-artist-pickers-2026-10.md`.
- App Store v1.1 submission prep (2026-08). Writeup:
  `docs/archive/app-store-v1.1-prep-2026-08.md`.
- Customizable chart shortcuts (2026-08-22), squashed onto `main` as
  `a45c823` and sent upstream as PR #73. Writeup:
  `docs/archive/chart-shortcuts-customization-2026-08.md`.
- App Store v2.0 submission (2026-11-06 to 2026-11-07), live and tagged
  `app-store-v2.0-submission` on `d4a91cf`. Writeup:
  `docs/archive/app-store-v2.0-submission-2026-11.md`.
- Safari Spotify autofind (Web API fallback) and toolbar icon fixes
  (2026-11-10 to 2026-11-14), submitted as App Store v2.1 and tagged
  `app-store-v2.1-submission` on `9f3f217`. Writeup:
  `docs/archive/safari-spotify-and-toolbar-v2.1-2026-11.md`.
