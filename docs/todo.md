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

- Separate, unrelated error surfaced in the extension background page's
  console while debugging the above (not yet investigated, not yet
  triaged/prioritized by the user): `[settings] failed to hydrate from
  native side – Error: Invalid call to browser.storage.local.set(). Disk
  I/O error.` — appeared on every background-page load. Confirm whether
  this is new or pre-existing, and whether it's actually causing any
  observable problem, before investigating further.
