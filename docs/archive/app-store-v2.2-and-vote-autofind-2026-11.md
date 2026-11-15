# App Store v2.2 and the vote-based autofind (2026-11-14 to 2026-11-15)

Archived from `docs/plan.md` once v2.2 was submitted. The upstream PR for
the autofind (kknq's #218) was still awaiting review; it's tracked in the
plan doc.

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
  4. Upstream PR for the vote-based autofind only. **Done**: kknq's
     PR #218, from branch `autofind-unvoted-links` (`7be8bdc`, one commit on
     `upstream/main` `bc24f43`, pushed to `origin`). It ports the eight
     stream-links files as they are on `main`, minus the fork's file
     headers; the fork-only `app.tsx` mount logic and `fetch.ts` direct
     fetch stay out. Upstream's `fetchInPage` already takes `credentials`.
     The branch itself wasn't run in Safari; the same feature code was
     tested in the fork build. Waiting on kknq's review.
  5. App Store v2.2. **Done**: v2.1 was approved on 2026-11-15, and the
     user submitted v2.2 (build 15) the same day, archived at 09:21 from
     `dist/` with `background-B-y0Wexk.js` (checked in the `.xcarchive`).
     Tagged `app-store-v2.2-submission` on `36c6a2f` (pushed); the notes were
     promoted to the tracked `whats-new.txt`. After the archive, `pluginkit`
     again listed the archive's temporary copy (already deleted by Xcode)
     and the `Debug-local` copy; both were unregistered and the App Store
     copy re-registered. Earlier notes on this step: v2.1 was still in review on
     2026-11-14. The user considered pulling it and going straight from 2.0
     to 2.2, then decided to keep it: 2.2 is submitted after 2.1 is
     approved. So What's New covers only what's new since 2.1, which was
     built on upstream 3.1.0: the vote-based autofind plus kknq's
     user-visible 3.2.0 and 3.3.0 changes (from `public/changelog.html`).
     Spotify diagnostics and the Firefox-only follow-status fix are left
     out. Draft: `app store submission stuff/v2.2/whats-new.txt` (staging
     folder, gitignored). The Xcode project is bumped to 2.2 (build 15),
     not yet committed. Still to do: the user reviews the draft, then
     commit, push both repos, archive (afterwards check `pluginkit` for the
     archive's temporary copy, see `CLAUDE.md`), submit once 2.1 is
     approved, tag `app-store-v2.2-submission`, and move the notes to the
     top-level `whats-new.txt`.

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
