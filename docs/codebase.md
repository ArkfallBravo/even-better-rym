# Codebase notes: decisions and reasoning

This file tracks *why* things are the way they are, for decisions whose
reasoning isn't obvious from the code itself. For "what exists and how it's
wired," see `CLAUDE.md`. For active/open work, see `plan.md`.

## Safari background page must be `persistent: false` (iOS/iPadOS)

`src/manifest.ts`'s Manifest V2 (`ManifestV2.background`) uses
`persistent: false` with `scripts`. Apple's App Store validator rejects
uploads with `persistent: true` whenever a background is declared via
`scripts`/`page` (as opposed to a `service_worker`) on iOS/iPadOS — only
macOS Safari supports a truly persistent background page. Getting this
wrong doesn't fail at build time; it only surfaces as an upload-time
rejection in App Store Connect ("Invalid manifest file... background field
must have persistent flag set to false"), so it's easy to reintroduce
without noticing during local dev.

Practical trap: because both the iOS and macOS Xcode targets read
`dist/manifest.json` directly (see below), an *old* `.xcarchive` built
before this flag was corrected will still contain the bad value baked in.
Re-uploading a stale archive reproduces the exact same error even after the
source fix — always do **Product → Clean Build Folder → Product → Archive**
to get a fresh archive after touching `src/manifest.ts`, don't re-upload an
existing one from the Organizer.

## Feature settings live in native `UserDefaults`, not `storage.local`

Originally, per-feature toggle state (`pages.*` keys) went through
`browser.storage.local`. On Safari, that API is backed by the same
LocalStorage/WAL engine used for *website* storage — confirmed by direct
sqlite3 inspection that the backing table gets dropped on a full Safari
quit, even with a persistent background page. That meant a user's feature
toggles could silently reset.

Settings are now routed through `browser.runtime.sendNativeMessage` to
`SafariWebExtensionHandler.swift`, which persists them in `UserDefaults` —
a sandboxed store outside the browser-storage system entirely, so it
survives both a Safari quit and the "clear website data / clear history"
action that wipes `storage.local`. The background script
(`src/modules/background/index.ts`) is the sole broker to this bridge: it
caches settings in an in-memory `settingsCache` so per-navigation and popup
reads don't each need a native round-trip, and it hydrates that cache once
per background-script lifetime. A one-time migration seeds `UserDefaults`
from any legacy `storage.local` values still present, so existing installs
don't lose their prior choices on upgrade.

## All features are enabled by default

At one point "Descriptor Links" was the sole feature shipped disabled by
default — a leftover from an earlier dev-cycle preference, not a
deliberate product decision or a workaround for a bug. It's now enabled by
default like every other feature, for consistency. If a future feature
needs to ship opt-in, that should be a conscious, documented exception
rather than an accident of history.

## Safari display name is overridden at build time, not in `package.json`

Safari reads the extension's user-visible name from the generated
`manifest.json`'s `name` field (itself sourced from `package.json`'s
`displayName`/`name`), not from Xcode's `CFBundleDisplayName` build
setting. `package.json` is shared with, and actively synced from, upstream
(`jgchk/better-rym`, maintained by `kknq`) — renaming it directly there
would conflict with every future upstream sync.

Instead, `getManifest()` accepts an optional display-name override, and
`npm run build:safari` passes `EXTENSION_DISPLAY_NAME="EvenBetterRYM for
Safari"` inline as part of the command itself, rather than via `.env`.
Doing it inline (vs. an env file) means there's no ambient state to forget
to set — running the intended npm script always produces the correct name,
with no separate setup step a contributor could skip.

## The Xcode project isn't tracked in git

`EvenBetterRYM/` (the Xcode project) used to be tracked on `main` but not
on other branches, which made `git switch` between them unreliable —
switching direction determined whether files got stranded or the checkout
failed outright. Nothing in the repo depends on it being tracked: there's
no CI step or build script that reads it from git history, and Xcode reads
the project straight off local disk regardless of git state. It's now
gitignored consistently on every branch. This also means: whoever needs
the Xcode project has their own local copy, and it will *not* pick up
changes to itself via `git pull` — only the JS-side `dist/` output it
references is shared through the repo.

## `dist/` is the single build artifact shared by every platform

There is one `npm run build` / `npm run build:safari` output
(`dist/`), and every consumer — Chrome/Firefox via `web-ext`, and both the
iOS and macOS Safari extension targets in Xcode — reads directly from it.
The Xcode project has no separate build phase that invokes npm; the iOS
and macOS `.appex` targets reference `../../dist/manifest.json`,
`../../dist/assets`, etc. as folder references in `project.pbxproj`. There
is deliberately no per-platform JS build — one `npm run build:safari` run
updates what both Safari targets will pick up on their next archive.
