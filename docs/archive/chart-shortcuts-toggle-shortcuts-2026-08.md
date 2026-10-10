# `chart-shortcuts` include-sub / must-contain-all toggle shortcuts (2026-08-05)

Shipped: `onClickBrowserItemSub` is in `src/modules/chart-shortcuts/app.ts` on
`main` (checked 2026-10-10). The plan entry below still read "awaiting the
user's manual in-browser test before commit"; it was archived as is, kept for
the design reasoning.

- `chart-shortcuts` new toggle shortcuts (started 2026-08-05,
  **implemented, build-verified, awaiting the user's manual in-browser test
  before commit**): follow-on to the redesign above. Added keyboard
  shortcuts covering the chart-builder's per-category checkboxes (see the
  `page_chart_query_free_section_*` discovery documented in `CLAUDE.md`'s
  Feature module pattern section), confirmed against a second read of the
  cached `charts_source.html` (both the `_include` and `_exclude` sides
  each have their own `_sub_items`/`_all` checkbox ids and
  `onClickBrowserItemSub`/`onClickBrowserItemAll` handlers, keyed by the
  full 8-way `FilterType`, not just the `_include` type):

  - Ctrl+Z/X/C/S → toggle "Include sub-genres" for genres / influences /
    either / descriptors (`onClickBrowserItemSub` on the `_include`
    `FilterType`).
  - Ctrl+Shift+Z/X/C/S → same, but the `_exclude` side ("Exclude
    sub-genres").
  - Ctrl+Q/W/E/A → toggle "Must contain all" for genres / influences /
    either / descriptors (`onClickBrowserItemAll` on the `_include` type).
  - Ctrl+Shift+Q/W/E/A → same, `_exclude` side ("Only exclude items
    containing all").

  **Resolved open question**: the user chose, via `AskUserQuestion`, to
  **remove the sticky "exclude mode" toggle entirely** (was Ctrl+\`,
  module-level `excludeMode` variable) rather than have it either apply
  only to the original Ctrl+1/2/3/D shortcuts or extend to the new
  toggle shortcuts too — every shortcut (old and new) now determines
  exclude purely from literal `event.shiftKey`. This simplified `app.ts`:
  removed `excludeMode`, `updateExcludeBadge`, the `[EXCL]` badge span and
  its `.ebr-exclude-badge` CSS rule (the rule's only consumer), and
  `resetInput` no longer resets/updates any mode state.

  `app.ts` rewrite:
  - Added `Category = "genre" | "sec_genre" | "genre_either" | "descriptor"`
    and `filterTypeFor(category, exclude)`, replacing the ad hoc
    per-key-count `genreFilterTypeFor`.
  - Added `toggleCheckbox(filterType, kind: "sub" | "all")`: builds the
    `page_chart_query_free_section_<filterType>_<sub_items|all>` id, flips
    `checkbox.checked`, then calls the matching `RYMchart.onClickBrowserItem*`
    — one self-contained injected script per action, mirroring the existing
    `applyItem`/`updateChart` pattern. Does **not** suppress
    `onClickCreateChart` around the call (unlike `applyItem`/
    `removeBrowserItem`'s patch) — that suppression was established through
    actual investigation of `addBrowserItem`'s side effects, not verified
    for the checkbox handlers, so it wasn't speculatively added; worth
    checking during manual test whether toggling a checkbox unexpectedly
    triggers a live chart refresh.
  - Replaced `handleGenreShortcut`/`handleDescriptorShortcut` with a single
    `handleApplyShortcut` driven by an `APPLY_KEY_CATEGORY` lookup map
    (`1`/`2`/`3`/`d` → `Category`) plus `APPLY_SCOPE` (`Category` → the
    existing narrower `genre`/`descriptor` native-browse `Scope`). Added
    `handleSubToggleShortcut`/`handleAllToggleShortcut` driven by
    `SUB_TOGGLE_KEY_CATEGORY` (`z`/`x`/`c`/`s`) and
    `ALL_TOGGLE_KEY_CATEGORY` (`q`/`w`/`e`/`a`). All four handlers key off
    `event.key.toLowerCase()` (safe for letters and digits since Shift
    doesn't change `event.key`'s letter/digit, only case/symbol — matches
    the existing Ctrl+D handler's approach) plus `event.shiftKey`.
  - `insertShortcutHint` now renders the user's 24 supplied lines verbatim
    (`HINT_LINES` array, `<br>`-joined) in place of the old abbreviated
    `^1/2/3 top genre · ^D top descriptor · +Shift = exclude` block —
    normalized the pasted text's inconsistent straight/curly quotes to
    plain `"` throughout for consistency with the rest of the array.
  - `src/manifest.ts`'s `chart-shortcuts` content-script entry no
    longer references `chart-shortcuts.css` (deleted — its only rule
    was the now-removed `.ebr-exclude-badge`).

  Verified: `tsc --noEmit`, `eslint src/modules/chart-shortcuts/
  src/manifest.ts`, `biome check` on the same all clean, `npm run
  build:safari` succeeds end-to-end. **Not yet manually tested in the
  Safari-wrapped app or committed** — per this project's manual-testing
  rule, needs the user to rebuild in Xcode and confirm all 24 shortcuts
  (and the checkbox-toggle chart-refresh question above) behave correctly
  before this gets committed.
