# Guest credits and bonus-track tags (2026-10)

Shipped to `main` as `d143a1b` (fork) and to PR #150 as `7735445` and
`05261c2` (upstream branch `tracklist-artist-links-upstream`). The user's
Safari test passed on the fork and on the upstream build. The one open
question, whether RYM accepts a plain-name credit line on submit, is in
`docs/todo.md`. The design reasoning below is kept as reference.

- Guest credits instead of track links on non-VA releases (started
  2026-10-12 on branch `guest-credits`, merged into `main` and pushed as
  `d143a1b` on 2026-10-12, then archived as `refs/archive/guest-credits`; **confirmed working in Safari; committed, ported to PR #150 as `7735445`, and pushed on 2026-10-12**). It goes into upstream PR #150 too
  (`tracklist-artist-links-upstream`), since the user called it a fix for
  that PR. User decisions (2026-10-12):
  - The tracklist picker only runs on Various Artists and split releases.
    A split is a VA release. On any other release no track gets a prefix,
    including the release artist. This reverses the 2026-10-06 rule that a
    track by A alone on an A & B release gets the picker.
  - Every track artist who isn't a release artist is credited instead:
    role `guest`, tracks field written `2, 12`. Example: Northwind
    (music.apple.com/us/album/northwind/1027973195), Sharm on tracks 2
    and 12.
  - VA picker behavior is unchanged.

  How it works:
  - Both panels key off `isVariousArtistsRelease`
    (`utils/track-artist-links.ts`): the first release artist is "Various
    Artists". Splits need no check of their own, since per the user a
    split is a kind of VA release. A first draft guessed splits from the
    track artists; the user rejected it.
  - The new `use-cases/guest-credit-picker.tsx` sits after `#creditsx`.
    It has one Link/Skip row per guest (`getGuestArtists`,
    `utils/guest-credits.ts`). Link reuses the tracklist picker's "Insert
    link" popup and click reading (`startArtistSearch` /
    `continueArtistSearch` moved into `utils/shortcut-popup.ts`). The
    picked id goes to RYM's page-world `addCredit('a', id, name)`, and the
    same injected script fills `credits_roles_<credits_num>` and
    `credits_tracks_<credits_num>` (`addArtistCredit`,
    `utils/page-functions.ts`). RYM's own Credits search wasn't used, so
    whether its result clicks work in Safari didn't need testing.
  - Re-linking or skipping a guest deletes the line it added before
    (`deleteCredit(N)`). The line number is read from the last
    `#creditsx li.sortable_credit` right after the synchronous fork
    `runScript`. On the upstream branch, `runScript` is async, so the port
    must await `addArtistCredit` before reading it.
  - `useImportSession` (`use-cases/use-import-session.ts`) replaces the
    tracklist picker's `usePickerImport`, so both panels share it.

  - Three buttons in both the tracklist and guest pickers (user,
    2026-10-12). **Link** picks the RYM artist. **Text** writes the name
    as plain text: a plain-name prefix in the tracklist, or an unlinked
    credit line. **Skip** leaves the artist out, so no prefix and no
    credit, but the row stays in the picker. Skip used to mean Text.
    - In the tracklist, a skipped artist's label is `OMITTED_LABEL` (`""`).
      `buildRelinkPlan` drops it, and a track whose labels all drop keeps
      its bare base title.
    - Text credits call RYM's manual-line path, `addCredit('a', 'XXX',
      name)`, then type the name into `credits_artist_N`. RYM's help text
      says manual lines are for "an unlinked credit". Whether RYM accepts a
      plain name there on submit is unchecked.
    - The release-artist picker's Skip is unchanged and still means "plain
      name". It wasn't part of the request.

  The user's Safari test passed all of the checks: Northwind, Link, Text,
  Skip, and a VA release. Upstream port: both commits went on as new
  commits on top of PR #150 rather than folded in (user's choice, so no
  force push). In the port, `addArtistCredit`/`deleteCreditLine` return
  upstream's async `runScript` promise, and the guest panel awaits the
  removal before adding and reading the new line. The tracklist picker kept
  upstream's own `usePickerImport`, which waits for the async tracklist
  fill, so on the upstream branch `useImportSession` serves only the guest
  panel.

- Bonus-track tags on import (2026-10-12, on `main` via `guest-credits`,
  **confirmed working in Safari; committed, ported to PR #150 as `05261c2`, and pushed on 2026-10-12**). `markBonusTrack`
  (`utils/bonus-track.ts`) rewrites a trailing "Bonus Track" (bare, after
  " - ", or in () or [], any case) as " [bonus track]" after the title.
  The user chose after over before, despite first writing "prepend". Only
  those forms count; tags with a qualifier like "(Japan Bonus Track)" are
  left alone. `formatTracks` in kknq's `utils/tracklist.ts` calls it after
  capitalization, so the tag stays lowercase. The user approved that
  one-line change to kknq's file. Known false positive: a song whose real
  title ends in "Bonus Track" also gets rewritten. This goes to PR #150
  with the guest-credits port.
