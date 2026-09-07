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
gitignored consistently on every branch — only the JS-side `dist/` output
it references is shared through *this* repo.

`EvenBetterRYM/` is its own separate git repository. As of 2026-09-06 it
has a remote: the private GitHub repo `ArkfallBravo/even-better-rym-safari`
(`origin`, default branch `master`), so the Xcode project's own history is
now backed up and pushable independently of the main repo. Its history is
self-contained (root commit "Initial commit of Xcode project for local
backup/history") and shares nothing with the older, abandoned private repo
`ArkfallBravo/Better-RYM-for-Safari` (last pushed 2025-06-17) — that one is
unrelated and not a remote of this working copy.

## `dist/` is the single build artifact shared by every platform

There is one `npm run build` / `npm run build:safari` output
(`dist/`), and every consumer — Chrome/Firefox via `web-ext`, and both the
iOS and macOS Safari extension targets in Xcode — reads directly from it.
The Xcode project has no separate build phase that invokes npm; the iOS
and macOS `.appex` targets reference `../../dist/manifest.json`,
`../../dist/assets`, etc. as folder references in `project.pbxproj`. There
is deliberately no per-platform JS build — one `npm run build:safari` run
updates what both Safari targets will pick up on their next archive.

## Track-listing "Insert link to artist or work" popup is not `RYMbrowser`

`src/modules/release-submission/use-cases/artist-link-formatting.tsx`
(2026-08-23) auto-formats the artist link inserted when you click a search
result in the track-listing page's "Insert link to artist or work" popup,
joining it onto the field's existing linked-artist list per RYM's
comma/ampersand standard instead of leaving RYM's raw cursor-position
insertion as-is.

The popup looks similar to the chart-builder's `RYMbrowser` widget (same
"Insert link" affordance, same general search-and-click UX), and
`RYMbrowser` was the first thing checked (it's what `chart-shortcuts`
already knows how to intercept — see `CLAUDE.md`'s "RYM's own
chart-builder search widget" note). It turned out to be a red herring:
`RYMbrowser` (`cdn.sonemic.net/dist/rym25/js/ui/browser.js`) only handles
`genre`/`descriptor`/`location`/`language` — no `artist`/`label`/`work`
case exists in its `onClickItem` switch. The track-listing popup is a
separate, older mechanism, loaded via `cdn.sonemic.net/2.5/js/shortcut.js`
plus inline page script (found by grepping a saved Web-Inspector Elements
dump for the button's label text, since `rateyourmusic.com` itself
Cloudflare-blocks both `curl` and `WebFetch` — the same bot-detection
issue documented in `CLAUDE.md`'s `import-check` section, but this time
blocking investigation rather than just e2e automation):

- A page-global `currentElement` tracks whichever field last had focus.
- Clicking a result in the popup's results iframe calls
  `window.parent.createShortcut(type, assocId, text)` (confirmed directly
  from the iframe's row markup: `onclick="window.parent.createShortcut('a', '1566274');return false;"`).
- `createShortcut` calls `insertAtCursor(currentElement, getShortcut(type, assocId, text))`
  then `currentElement.focus()`. `getShortcut("a", assocId)` returns
  `"[Artist" + assocId + "]"` — the token format already used elsewhere in
  this codebase (e.g. `credits-controls.tsx`'s `/\[Artist(\d+)]/` parse).

Because `currentElement` is a `window`-scoped page global, it's invisible
to this content script's isolated JS world (the same isolated-world
constraint documented in `CLAUDE.md`'s "content scripts execute in an
isolated JS world" note) — so interception has to happen by monkey-patching
`window.createShortcut` itself from injected page-world code
(`patchCreateShortcut` in `utils/page-functions.ts`), the same
polling-`setInterval` shape as `patchRYMChartRemoval` in
`chart-shortcuts/app.ts` (needed because this content script runs at
`document_start`, before the page's own inline script that defines
`createShortcut` has executed). The patch captures the target field's
value *before* calling the original function, then dispatches a
`CustomEvent` (`EbrArtistShortcutInsertedEvent`) with the raw insert
parameters back to the content script, which does the actual reformatting
in real (tested) TypeScript rather than inside the injected script string
— DOM element properties like `.value` are shared with the page's real
world even though `window` globals aren't, so the content script can just
overwrite `target.value` directly once it has the event data.

**Reformat algorithm** (`utils/artist-shortcuts.ts`'s
`insertArtistShortcut`): split the field's *previous* value on the first
`" - "`; if that prefix contains no `[ArtistNNNN]`-shaped token, don't
parse anything — just prepend the new token to the whole existing value
unchanged. Only when the prefix already contains at least one
`[ArtistNNNN]` token does it get split into components (on `" & "`/`", "`)
and rejoined with the new artist appended, via the existing
`arrayToArtists` join helper (`~/shared/utils/string.ts`). This
bracket-presence check (rather than, say, treating any `" - "` as a
boundary, or checking for `" & "`) is deliberate: it's the only way to
never mistake a plain-text unlinked artist name, or a track title that
happens to contain its own `" - "`, for a parseable artist list — verified
against 7 worked examples the user specified by hand (e.g. `Artist1 &
Artist2 - Track` → `[ArtistX] - Artist1 & Artist2 - Track`, not an attempt
to join into the unlinked `Artist1 & Artist2` text).

## Title-case tokenizer keeps text emoticons whole

`utils/tokenize.ts`'s `splitPhrases` (the phrase splitter behind the
release-submission title-case capitalizer) treats `:` `/` `(` `)` as phrase
separators. That mangled emoticon titles: importing Apple Music's `Sorry :/
- EP` produced `Sorry : / /` — the `:` split off `"sorry :"`, then the
trailing `/` hit a `regexIndexOf(..., /\S/)` that returned `-1`, and the
final `text.slice(lastSplitIndex)` guard ran `text.slice(-1)` and
re-appended the `/`.

Fix (`0942e7c`, 2026-09-06): `splitPhrases` recognizes a text emoticon
starting at a whitespace/start boundary (`EMOTICON_REGEX`) and skips it
whole instead of splitting on its punctuation; the trailing-slash branch
also guards the `-1` case so a slash with nothing after it no longer
duplicates a character.

Deliberate scoping:
- Emoticon "eyes" are only `[:;=]`, **not** `8`/`x`/`X`. Allowing those
  risked false positives on real single-letter titles (`X/Y`) and figures
  like `8/8`.
- `:/ :) ;) =(` round-trip perfectly because their mouth char (`/ ) (`) is
  its own token. `:P` / `:D` / `:3` tokenize as a single *word* token, so
  title-case still lowercases the letter (`:P` → `:p`). Accepted as a minor
  known limitation — not worth special-casing.
- Apple Music's `resolve.ts` still strips a trailing `" - EP"` / `" - Single"`
  from the title and uses it to set the release type. This was reconfirmed
  as correct: it's Apple's format-designation suffix (the whole artist
  discography uses it), not part of the title, and RYM keeps the format out
  of the title field. Not to be re-litigated.
