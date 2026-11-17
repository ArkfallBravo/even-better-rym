# Plan / open work

- Upstream PR #218 (kknq's repo) for the vote-based autofind, from branch
  `autofind-unvoted-links` (on `upstream/main` `bc24f43`, pushed to
  `origin`), opened 2026-11-14. Waiting on kknq's review. Commits: `7be8bdc`
  (the feature) and `af87697` (the off switch, added 2026-11-17; the PR
  description mentions it). The branch itself wasn't run in Safari; the same
  code was tested from the fork. If kknq asks for changes, make them on that
  branch (see `CLAUDE.md`, "Preparing an upstream PR"), and port them back
  to the fork. Full history:
  `docs/archive/app-store-v2.2-and-vote-autofind-2026-11.md`.

- Vote-based autofind follow-ups (2026-11-17).
  - **Off switch: done** (`main` `4e4c1d5`, tested in Safari by the user).
    `StreamLinkSettings.searchUnvotedLinks` (default on; anything but
    `false` reads as on), a "Link checks" checkbox in the popup's
    stream-links view. When off, `StreamLinks` hands `usePageData`
    `skipLinkVotes` instead of `loadLinkVotes`, so the vote page isn't
    fetched and RYM's links are always kept. Read once at mount.
  - **Hide voted-down links: done** (tested in Safari by the user,
    committed to `main` 2026-11-17). Setting `hideDownvotedLinks`
    (default off; only `true` turns it on), a "Link checks" checkbox independent of `searchUnvotedLinks`
    (the user's call). A service counts as voted down when every RYM link
    for it scores below zero in the user's country
    (`getServicesWithOnlyDownvotedLinks` →
    `PageData.servicesWithOnlyDownvotedLinks`). A service with one
    downvoted and one unvoted link keeps its link, since RYM may be
    showing the unvoted one. `getStreamLinkState` takes a `LinkChecks`
    slice of the settings (`StreamLinks` passes `settings`):
    - hide only: a voted-down link shows `not-found` without searching;
    - search and hide: search first; a found link wins, otherwise
      `not-found`;
    - a search that throws always falls back to RYM's link.
    The vote page loads when either checkbox is on.
    Open: the user believes RYM's own buttons don't drop links voted down
    in their country, and wonders whether the extension changes RYM's
    behaviour. The extension hides `#media_link_button_container_top` and
    picks each link with kknq's `getLinkData` (`for` match first, else the
    default unless its `not` list has the region); whether RYM's own
    buttons pick differently is unchecked. Next step: on the beansclub page,
    compare the extension's Apple Music icon with RYM's own buttons
    (extension off), and run
    `JSON.parse(document.querySelector('#media_link_button_container_top').dataset.links).applemusic`.
    Hiding links that score zero or below was tried first and rejected
    (see `docs/alternatives.md`, "Stream-links vote autofind").
    Not yet in PR #218; the user hasn't answered whether to add it there.
    If so, also update the PR description, which still says "If the search
    finds nothing or fails, it keeps RYM's link".
  - Open: the rule re-searches almost every service, since RYM's
    `service_regions` sets a region for all eight services (US for all, per
    a saved page) and "no votes from your country" counts as unvoted. On
    the saved "Interloper" page only Apple Music kept RYM's link. A stricter
    rule (ignore non-regional services like Bandcamp/SoundCloud) is
    undecided.
  - Checking a link's real availability per country was deferred in
    favour of the voted-down rule; see `docs/alternatives.md`.

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
  (2026-11-10 to 2026-11-14), shipped as App Store v2.1 (approved
  2026-11-15) and tagged
  `app-store-v2.1-submission` on `9f3f217`. Writeup:
  `docs/archive/safari-spotify-and-toolbar-v2.1-2026-11.md`.
- App Store v2.2 and the vote-based autofind (2026-11-14 to 2026-11-15):
  upstream v3.3.0 sync, simplify pass, autofind, shipped as v2.2 (the
  installed App Store copy read 2.2 on 2026-11-17) and tagged `app-store-v2.2-submission` on `36c6a2f`. Writeup:
  `docs/archive/app-store-v2.2-and-vote-autofind-2026-11.md`.
