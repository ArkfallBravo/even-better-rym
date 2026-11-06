# Customizable chart shortcuts (2026-08)

The shortcut recorder, rebindable combos and platform-native modifier labels. The `chart-shortcuts-customization` branch's nine commits were squashed onto `main` the same day as `a45c823` (its message lists every fix below), and the feature went upstream as PR #73 (head `a046dc0`, merged 2026-08-23 as `72a5160`; PR #72 at `a7f1b98` was the earlier version, closed). All three branches are under `refs/archive/` since 2026-11-06. Later changes, from kknq's tidy-ups (#83, #88, #119) and the first upstream sync, moved the code on: live rebinding now uses `subscribeToStoredSetting`, since `browser.storage.onChanged` never fires in a Safari content script, and the bindings go through the native JSON mirror (`json.get`/`json.set`) rather than `keybindings.get`/`setAll`. The user's Safari test of the v3.1.0 sync (2026-11-06) covered using the shortcuts and a changed binding surviving "Clear History". Moved out of `docs/plan.md` on 2026-11-06.

- `chart-shortcuts-customization` branch (started 2026-08-22, in progress —
  automated checks clean and 3 checkpoint commits made, but the plan's full
  manual Safari testing checklist has not been run to completion): adds a
  standard "press keys to record a shortcut" customization UI for the
  chart-builder's ~31 keyboard shortcuts, which were previously hardcoded
  with no way to rebind or resolve collisions with browser/OS shortcuts.
  Full design plan (superseded by what actually shipped, described below,
  but useful for the original reasoning) is at
  `/Users/lillyanasimson/.claude/plans/quizzical-tumbling-key.md`.

  **Decisions made via `AskUserQuestion`, with reasoning not visible in the
  code itself:**
  - Persistence: `storage.local` always + native `UserDefaults` mirror
    (native wins on read, self-heals `storage.local` on mismatch) — chosen
    over storage-only (wiped by Safari's "Clear History", the exact problem
    native settings were introduced to fix in the first place — see
    `CLAUDE.md`'s native-settings section) and over native-only (no native
    host on Chrome/Firefox builds).
  - UI location: a second view inside the existing popup (a "Customize
    shortcuts" button on the Chart Shortcuts row), per the user's own
    mockup screenshot — not a separate options page or an in-page editor on
    the RYM chart page itself.
  - Binding shape: all ~31 actions fully independent, each holding an
    *array* of combos (not a single string) — needed because "Update
    Chart" shipped with two default bindings (`Ctrl+Enter` and
    `Ctrl+Space`), which a single-combo-per-action model couldn't represent.
  - Conflict handling: reject the recording and show inline
    `Already used by "<Action>"` rather than silently overwriting.
  - Live rebinding: an already-open chart page must reflect a rebind made
    in the popup **without a page refresh** — this was **not** in the
    original plan and was added mid-review at the user's explicit
    insistence ("Add this, otherwise users will think it is broken"),
    implemented via a `browser.storage.onChanged` subscription in
    `chart-shortcuts/app.ts`'s `mount()` that rebuilds the combo→action map
    and re-renders the on-page hint panel in place.

  **A real pre-existing bug found and fixed as a side effect, not the
  original goal:** the old dispatch matched `event.key.toLowerCase()`
  *before* consulting `event.shiftKey`, so `Ctrl+Shift+1/2/3` (exclude
  genre/influence/either) never actually worked on `main` — `event.key`
  for the `1` key becomes `"!"` when shift is held, which never matched the
  lookup table. The rewrite keys everything off `event.code` (layout- and
  shift-independent: `"Digit1"` regardless of modifiers) instead, which
  fixes this as a side effect. Documented in the commit message so it
  isn't mistaken for new functionality. Tradeoff, flagged rather than
  hidden: `event.code` is physical-position-based, so on a non-QWERTY
  layout the recorded/displayed key won't match the keycap label (same
  tradeoff VS Code and browsers make).

  **Two bugs an advisor review caught before commit, both fixed:**
  1. `event.code` also distinguishes the main Enter from the numpad Enter
     (`"Enter"` vs `"NumpadEnter"`), where the old `event.key === "Enter"`
     matched both — without a fix this would have silently dropped
     numpad-Enter support for "Update Chart". Fixed by adding
     `ctrl+NumpadEnter` as a third default binding.
  2. The Swift `keybindings.get` handler did `value as Any` on a
     `String?`, which works by accident (every code path degrades to the
     `storage.local` fallback either way) but isn't explicit about the
     first-run/no-value-yet case. Cleaned up to an explicit `if let`/
     `NSNull()` branch.

  **Also fixed while touching this area:** the three existing tab-less
  background message handlers (`settingsGetAll`, `settingsSet`,
  `storageSet`) had no `.catch` on their response chain — a rejected
  native call (guaranteed on any non-Safari build, which has no native
  host) meant `sendResponse` was never invoked and the caller's `await`
  hung forever rather than failing. This was a real, silent bug on
  Chrome/Firefox builds, not something introduced by this feature. All
  five handlers (the three existing plus the two new `keybindings*` ones)
  now have a `.catch` fallback.

  **Two UI regressions found from the user's own screenshots after the
  initial implementation, both fixed as follow-up commits:**
  - Wrapping each popup row's label+toggle in an extra flex container (to
    make room for the new "Customize shortcuts" button) broke the
    `justify-content: space-between` that pins every feature's toggle to
    the popup's right edge — not just Chart Shortcuts, every row. Root
    cause: a single-child flex container has nothing to distribute
    "space-between" against. Fixed by reverting to one flat flex row per
    item (the label's existing `flex: 1` already does the right-alignment
    work), with the Customize button inserted as a sibling between the
    label and the toggle rather than wrapping them separately.
  - The recorder's conflict/error message ("Already used by ...") was
    rendered as the `value` of a fixed-170px `readOnly` `<input>`, which
    can't wrap text and silently clipped long messages. Fixed by moving it
    to a sibling `<div>` with `flexBasis: "100%"`, which forces it onto its
    own line within the row's `flex-wrap` layout so it wraps normally.
    "Customize mappings" was also renamed to "Customize shortcuts" per the
    user's request in the same round.

  **Branch/commit state as of 2026-08-22:** `even-better-rym` repo, branch
  `chart-shortcuts-customization` (off `main`), 4 commits: `3593e934`
  (main feature — registry, binding logic, popup UI, messaging/background
  wiring, README section since this feature had never been documented),
  `220a707` (popup alignment fix), `58260e6` (recorder error-clipping
  fix). `EvenBetterRYM/` repo (separate git repo, branch `master`), 1
  commit: `cc2a289` (the Swift `keybindings.get`/`keybindings.setAll`
  handler, storing the JSON override map under `keybindings.chartShortcuts`
  in `UserDefaults` — deliberately outside the `pages.` prefix, since
  `handleGetAll`'s boolean-only scan would otherwise silently drop a
  string value stored there). All three main-repo commits and the one
  Xcode-repo commit are explicit checkpoint commits made at the user's
  request (see `[[feedback-commit-as-safety-checkpoint]]` memory) — none
  claims the feature is fully manually verified end-to-end.

  `EvenBetterRYM/project.pbxproj` has an unrelated 5-line uncommitted diff
  that predates this session and was deliberately left unstaged both times
  a commit was made in that repo during this work — not investigated, not
  this feature's concern; see `docs/todo.md`.

  **Confirmed working via the user's own screenshots in the real Safari
  app** (so an Xcode rebuild did happen at least once during this work):
  the popup's Customize view renders and groups all actions, recording a
  new combo and live conflict detection both work, and the post-fix
  right-aligned toggle layout looks correct. **Not yet confirmed** (no
  explicit statement either way in this session): the native-mirror
  persistence across a full quit/reopen, survival through Safari's "Clear
  History", `Ctrl+Shift+1/2/3` actually firing on the real chart page, and
  live rebinding while a chart page is already open. See `docs/todo.md`.

  **Platform-native modifier key labels (2026-08-22, follow-up round):**
  `formatCombo` (`src/shared/chart-shortcuts/binding.ts`) now renders
  modifier keys to match the host OS instead of always showing generic
  words. Off Mac: `Ctrl` / `Alt` / `Shift` / `Command`, joined with
  `" + "` (e.g. `Ctrl + Shift + 1`). On Mac: the native `⌃` / `⌥` / `⇧` /
  `⌘` glyphs, joined with a plain space (e.g. `⌘ ⇧ O`) — in Apple's own
  canonical modifier order (Control, Option, Shift, Command), which
  already matched this codebase's existing `ctrl, alt, shift, meta`
  ordering from `comboFromEvent`.

  Two things worth knowing if this area is touched again:
  - `formatCombo` takes `mac` as an explicit parameter (`mac: boolean =
    isMacPlatform`) rather than reading a module-level platform constant
    directly. This was a real bug fix, not a style choice: Node's
    `navigator.platform` reports the actual host OS running the test
    process (confirmed: `"MacIntel"` under Node 22 on this dev machine),
    so a module-level constant made the existing "formats as Ctrl/Alt"
    vitest cases fail purely because the test suite happened to run on a
    Mac. See `CLAUDE.md`'s note in the same area for the general rule to
    reuse.
  - Getting the Mac glyphs to actually *look* native took two rounds: the
    right Unicode code points alone weren't enough — the shortcut chip's
    monospace font lacked San Francisco's custom glyph shapes and
    rendered them as a flat "^"-style caret (confirmed against the user's
    own screenshot of Safari's native menu bar). Switching the chip
    (`src/modules/popup/styles.ts`) to the popup's existing system-UI
    font stack fixed the shapes. The user was skeptical of this
    diagnosis throughout ("I think you're wrong") and asked to try
    removing the space between glyphs too, to match native macOS's tight
    packing (`⇧⌘N`, no space) — that came back looking "more squished"
    than genuine macOS rendering, meaning the font-family fix didn't
    fully close the gap to native and some further rendering-metrics
    difference (kerning/spacing, not glyph shape) remains undiagnosed.
    Reverted to space-separated glyphs as the accepted compromise rather
    than continuing to chase exact native fidelity — see `docs/todo.md`.

  **Commits added this round:** `bcd264e` (Option/Control/Command word
  labels + `" + "` spacing), `35b556d` (docs-only, the pending
  `/preserve` notes from the previous round), `d69f073` (native
  `⌃⌥⇧⌘` glyphs on Mac + the chip font-family fix) — all in
  `even-better-rym`, all explicit checkpoint commits per
  `[[feedback-commit-as-safety-checkpoint]]`, none manually verified in a
  real Safari rebuild yet. `EvenBetterRYM/` also got one unrelated
  checkpoint commit (`ba4f145`, an Xcode-generated build-number bump that
  predated this round and wasn't touched by any feature work).
