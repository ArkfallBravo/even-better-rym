# Plan / open work

## Pending: Safari iOS manifest fix — awaiting manual test before commit

`src/manifest.ts` background `persistent` flag was changed from `true` to
`false` (Manifest V2 / Safari build) because App Store Connect rejected the
iOS archive upload with "Invalid manifest file... background field must have
persistent flag set to false in iOS and iPadOS apps" (no `service_worker`,
using `scripts`/`page` background instead).

- Fix applied in `src/manifest.ts`, `npm run build:safari` re-run, verified
  `dist/manifest.json` now has `"persistent": false`.
- **Not yet committed** — per project convention, changes needing manual
  verification (rebuild + real Xcode archive/upload, and confirming
  background-page behavior like storage/messaging still works when the page
  is no longer persistent) stay unstaged until the user confirms it works.
- Next step once confirmed: commit `src/manifest.ts` (and any resulting
  `dist/` changes if tracked).
