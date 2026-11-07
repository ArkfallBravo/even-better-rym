# App Store v2.0 submission (2026-11)

- App Store v2.0 submission (started 2026-11-06). The build is the v3.1.0
  sync (see the archive pointer below): `MARKETING_VERSION` 2.0, build 13,
  macOS deployment target 12.0, pushed in the Xcode repo as `eb1628d`. The
  user chose 2.0 over 1.4 because it's the biggest update yet and drops
  macOS 11. Drafts, for the user to confirm before submitting:
  `app store submission stuff/v2.0/whats-new-v2-0.txt` (from kknq's
  changelog and `git log app-store-v1.3-submission..main`) and
  `description-v2-0.txt` (3,714 of 4,000 characters, one section per popup
  feature; the quick-fill buttons, import sources, Hide Ratings options and
  collection filters were checked in the code, the rest rests on the popup
  hints and changelog). Both leave out the MAIN-world Spotify script and the
  music-video placement fix, which may not reach the Safari build.

  Status: the upload from Xcode failed with "PLA Update available" (Apple's
  new Program License Agreement isn't accepted yet) and no "Mac Installer
  Distribution" certificate for team `7C45KQPPCV`. Next steps given to the
  user: accept the agreement at developer.apple.com/account (and check App
  Store Connect's agreements), then let Organizer's automatic signing create
  the certificate, or add it in Xcode → Settings → Accounts → Manage
  Certificates. Since resolved: on 2026-11-07 the user installed v2.0
  (build 13) from the App Store, so it's approved and live. Tagged
  `app-store-v2.0-submission` on `d4a91cf` (user-confirmed) and pushed.
