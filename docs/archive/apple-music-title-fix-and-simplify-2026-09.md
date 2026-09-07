# Apple Music title-import fix + `/simplify` pass (branch `fix-apple-music-title-slash-mangling`, 2026-09-06/07)

Fully shipped: every commit below is on `main` and pushed to `origin/main`
(branch tip `56ebb84`). All changes that touch live-page / injected-JS
behavior were manually confirmed by the user in the Safari-wrapped app
before their commit landed. Kept here for the design reasoning and the
"investigated and rejected" list, which the diffs alone don't capture.

## Apple Music release-title mangling

**Symptom 1** — importing `music.apple.com/us/album/sorry-ep/1819217558`
filled the release title as `Sorry : / /` instead of `Sorry :/`.

Root cause: `utils/tokenize.ts`'s `splitPhrases` (the phrase splitter behind
the release-submission title-case capitalizer) treats `:` `/` `(` `)` as
phrase separators. For `sorry :/` that produced `["sorry :", "", " / ", "/"]`
— the `:` split off `"sorry :"`, then the trailing `/` hit a
`regexIndexOf(text, /\S/, index+1)` that returned `-1` (nothing follows the
slash), `lastSplitIndex` became `-1`, and the final
`text.slice(lastSplitIndex)` guard ran `text.slice(-1)` and re-appended the
`/`.

**Symptom 2** — `music.apple.com/us/album/sorry-p-ep/1802757827` filled as
`Sorry :p` instead of `Sorry :P`. `capitalize()` lowercases the whole
string before tokenizing, and `:P` tokenized as an ordinary `word` token, so
`toTitleCase` uppercased only its first char (`:`) and lowercased the rest.
(`:/` and `:)` dodged this only because their mouth char is its own
punctuation token.)

**Fix, in three commits:**
- `0942e7c` — `splitPhrases` recognizes a text emoticon starting at a
  whitespace/start boundary (`matchEmoticonAt`) and skips it whole instead
  of splitting on its punctuation; the trailing-slash branch also guards the
  `-1` case (`hasTrailingContent`) so a slash with nothing after it no
  longer duplicates a character.
- `56ebb84` — `tokenizePhrase` gets an `emoticon` token type (first entry in
  `parsers`, `EMOTICON_REGEX`), and `capitalize` upper-cases emoticon tokens
  (same path as roman numerals) instead of running them through
  `toTitleCase`. So `:p` → `:P`, `;)` stays `;)`, `=(` stays `=(`.
- Both include matching test cases in `tokenize.test.ts` /
  `capitalization.test.ts` and a `docs/codebase.md` update (the section
  "Title-case tokenizer keeps text emoticons whole" — kept live, not
  archived, since it documents current behavior).

**Design scoping (also in `docs/codebase.md`):**
- Emoticon "eyes" are only `[:;=]`, **not** `8`/`x`/`X` — those risked false
  positives on real single-letter titles (`X/Y`) and figures (`8/8`).
- `EMOTICON_REGEX = /^[:;=][-'^o]?[)(/\\|dpo3*](?![a-z0-9])/i` — case
  insensitive because `capitalize` lowercases first; trailing
  `(?![a-z0-9])` negative lookahead so a real word can't match (`:Paris`,
  `:30`). Lookahead only — **no lookbehind**, which the iOS 15.0 Safari
  deployment target doesn't support (Safari 16.4+ only). Negative lookahead
  *is* supported on iOS 15.
- Emoticons are upper-cased as **canonicalization, not case preservation**:
  a lowercase `:p` in the source still comes out `:P`.
- `resolve.ts` still strips a trailing `" - EP"` / `" - Single"` from the
  Apple Music title and uses it to set the release type. Reconfirmed correct
  (the user first said keep it, then reversed): it's Apple's
  format-designation suffix used across the whole artist discography, not
  part of the title, and RYM keeps format out of the title field. **Not to
  be re-litigated.**
- Known unrelated limitation left out of scope: all-caps acronyms in a
  title (`EP`, `R.E.M.` handled specially but a bare `EP` word) still get
  title-cased to `Ep`.

## `/simplify` pass

Scoping: no recent commit's message started with "Simplify:" (only a 2022
`b9e8647`, predating the convention), so "diff since the last simplify
commit" would have meant the whole 427-file history. Re-scoped per the
user's clarification to "everything we've written that isn't kknq upstream":
`git diff <merge-base 25ce505e>..main`, minus reference-dump files
(`charts_source.html`, `apple_music_source.html`, the saved uBlock issue
HTML, `docs/*.md`, `package-lock.json`) — 79 source files / ~3,840 lines.

**Correction mid-session** (saved as memory `[[feedback-upstream-kknq-code]]`):
"don't touch kknq's code" means *authored-by-us*, not *after the fork
merge-base* — code we wrote can have been contributed back into kknq's repo
and is still ours to simplify. Every finding was re-verified with
`git blame -e -L <range> <file>` against author identity
(`Helena Simson`/`ArkfallBravo` share one email) before being touched.

Ran 4 parallel review agents (reuse / simplification / efficiency /
altitude) against the filtered diff.

**Fixed and committed as `afe3274`** (verified `tsc --noEmit` + `npm run
build` + `biome check` + `vitest` 146/146):
- `storage.ts`: removed leftover debug `console.log`/`getBytesInUse`
  instrumentation from `get`/`set` (flagged independently by 3 of the 4
  agents) — restored byte-identical to upstream's original.
- `native-settings.ts`: collapsed 4 duplicated `if (!response.ok) throw`
  blocks into one `assertNativeOk` TS assertion-function helper.
- `chart-shortcuts/settings.ts`: `overridesFrom` now calls `array.ts`'s
  existing `equals()` instead of reimplementing array comparison via
  `JSON.stringify`.
- `applemusic/{resolve,track-artists}.ts`: extracted a shared
  `findTrackLockupScriptText` helper so `getIsVariousArtists` /
  `getTrackArtists` share one DOM scan instead of each walking
  `document_.querySelectorAll("script")` independently.

**Fixed, split across two manually-tested commits:** `dom.ts`'s
`buildPollForGlobalScript` helper, so `chart-shortcuts/app.ts`'s
`patchRYMChartRemoval` and `release-submission/utils/page-functions.ts`'s
`patchCreateShortcut` (near-identical "poll for a page-world global every
200ms ×20, then monkey-patch it" scripts) both build off it. Split so each
half landed only after its own Safari test: `dom.ts` + `chart-shortcuts/app.ts`
as `93fff72` (chart-shortcut create/remove confirmed), then
`page-functions.ts` as `9328427` (artist/work link insertion confirmed).
Doc commit `3268348`; the completed `tokenize.ts` todo item was removed in
`d741c18`.

**Investigated and explicitly skipped** (each for a documented reason; the
ones worth revisiting are in `docs/todo.md`):
- URL-param-loop duplication between `shared/utils/fetch.ts` (ours) and
  `background/fetch.ts` (kknq's — fixing means editing kknq's loop).
- `fetch.ts`'s direct-fetch-before-background-fallback extra round-trip on
  CORS-blocked hosts — a deliberate, already-commented tradeoff.
- The `onClickCreateChart`-suppression snippet duplicated twice in
  `chart-shortcuts/app.ts` — not worth nested-template-string complexity
  for 4 lines.
- `use-release-info.ts` pushing the "commit complete state" decision out to
  its callers — itself a deliberate earlier change; undoing it means
  reworking the hook's public API and both call sites.
- `background/index.ts`'s hardcoded `type: "fetch"` fallback in the
  tab-scoped dispatcher's catch path — real gap, but `DownloadResponse` /
  `ScriptResponse` (kknq's types) have no field to carry an error.
- `import-controls.tsx`'s sequential `await fill(...)` before `await
  download(...)` — parallelizing changes when `setInfo` commits "complete"
  relative to the cover-art download; a real timing/UX change, not
  verifiable without the live import flow.
- `runScript`'s direct `<script>`-tag injection vs. `fetchInPage`'s
  background-routed injection — confirmed via `git log -S` this is a
  deliberate documented fix (`218d29b`, "fix: Streaming links visible") for
  `scripting.executeScript` being unavailable in iOS Safari MV2 background,
  not drift.

## Git topology resolved this session

- `afe3274` (the safe `/simplify` half) was moved onto `main` — it had been
  committed on the branch but was "meant to be there."
- `main` was fast-forwarded to the branch tip and pushed (`0942e7c..56ebb84`
  in the final push). The FF carried `93fff72` / `9328427` / `3268348` /
  `d741c18` / `56ebb84` plus the two docs commits `fa87f28` / `9c1b47b`.
- The `EvenBetterRYM/` Xcode repo got its first-ever remote this session:
  private `ArkfallBravo/even-better-rym-safari` (`origin`, branch `master`),
  all 7 local commits pushed including the v1.3 build-number bump `4473f69`.
  A new repo, **not** the abandoned `ArkfallBravo/Better-RYM-for-Safari`
  (unrelated history). See `CLAUDE.md` / `docs/codebase.md`.
- Branch `fix-apple-music-title-slash-mangling` is now fully merged into
  `main` — safe to delete.
