# Todo

- Fix `src/modules/background/index.ts`'s `setTabIcon`: uses
  `browser.action.setIcon`/`.setTitle`, which is `undefined` under the
  Safari build's Manifest V2 (should be `browser.browserAction` for V2).
  Causes an unhandled `TypeError` in the background console on every
  rateyourmusic.com navigation. Confirmed unrelated to the CORS
  investigation above — separate real bug.

- Track-artist autofill should only auto-select an exact match; when
  multiple candidate matches are found for a track artist, it should not
  silently pick one — display a warning to the user instead so they can
  resolve it manually.

- Tracklisting import should strip "feat. <artist>" (and variants) out of
  track titles and instead add those artists to the track's credits with
  role "featured", rather than leaving them embedded in the track name.

- Tracklisting should show the search hint/query used for each artist match
  next to the result, so the user can proofread which search term produced
  which artist before accepting it.

- Tracklisting import should convert square brackets `[]` in track titles to
  parentheses `()`, to match RYM's expected formatting convention.

- Pull-credits import is currently unreliable and should be disabled/hidden
  for now until one of the below is implemented.

- Credits and track-artist matching need a real disambiguation strategy
  instead of the current guesswork. Two candidate approaches: (1) an
  extensive conditional/heuristic system that cross-references the imported
  release's genres against RYM's genre hierarchy to narrow which candidate
  artist is plausible, or (2) hand the artist hint + context to an AI model,
  preferably on-device to avoid per-call monetary cost — Apple's on-device
  AI (Apple Intelligence / Foundation Models framework) would be a strong
  candidate given this is a Safari extension already tied to a native macOS/
  iOS app wrapper.

- Separate, unrelated error surfaced in the extension background page's
  console while debugging the above (not yet investigated, not yet
  triaged/prioritized by the user): `[settings] failed to hydrate from
  native side – Error: Invalid call to browser.storage.local.set(). Disk
  I/O error.` — appeared on every background-page load. Confirm whether
  this is new or pre-existing, and whether it's actually causing any
  observable problem, before investigating further.
