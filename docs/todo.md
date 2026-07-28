# Todo

- Fix `src/modules/background/index.ts`'s `setTabIcon`: uses
  `browser.action.setIcon`/`.setTitle`, which is `undefined` under the
  Safari build's Manifest V2 (should be `browser.browserAction` for V2).
  Causes an unhandled `TypeError` in the background console on every
  rateyourmusic.com navigation. Confirmed unrelated to the CORS
  investigation above — separate real bug.

- Qobuz `resolve()` throws `Could not get release data for URL …`
  (see `docs/plan.md` for detail) — pre-existing bug unrelated to the
  Safari/CORS investigation, not yet looked into. Likely related to the
  `usUrl` locale-rewrite in `src/shared/services/qobuz/resolve.ts:77`
  producing a page without the expected second `application/ld+json`
  script tag.

- Separate, unrelated error surfaced in the extension background page's
  console while debugging the above (not yet investigated, not yet
  triaged/prioritized by the user): `[settings] failed to hydrate from
  native side – Error: Invalid call to browser.storage.local.set(). Disk
  I/O error.` — appeared on every background-page load. Confirm whether
  this is new or pre-existing, and whether it's actually causing any
  observable problem, before investigating further.
