# chart-shortcuts and chart-searchbar (2026-07 to 2026-08)

The chart-shortcuts port from the userscript, the redesign that dropped its custom overlay, and bringing `chart-searchbar`'s work to `main`. All shipped. Moved out of `docs/plan.md` on 2026-10-16.

- `chart-searchbar` → `main`: brought the `chart-shortcuts` feature
  work over (done 2026-08-06, squashed as `f96852bd` — see `CLAUDE.md`'s
  "GitHub repo notes" section for the cherry-pick/squash mechanics and the
  lint-config fixes it surfaced). The user's ask was specifically
  "cherry-pick the 17 commits then merge them in as one commit" after asking
  why a plain `git merge` wasn't used — the reasoning: a full merge can't
  selectively exclude the 3 commits that only look unmerged (they diverged
  independently with equivalent code on `main` already), and resolving the
  `docs/*.md` conflicts is much more tractable one commit at a time than as
  one giant merge diff. Both `main` and `chart-searchbar` were pushed after.

- `feature/chart-shortcuts` branch: ports the Tampermonkey userscript
  at `Userscripts/RYM Chart Prefix Commands.user.js` (sibling directory to
  this repo, outside git) into `src/modules/chart-shortcuts/` as a
  toggleable feature (`chartPrefixCommands` page key, gated on `/charts/*`).
  Manually tested in the Safari-wrapped app and confirmed working (prefix
  commands, Ctrl+1/2/3/D shortcuts, exclude toggle, hint text placement) as
  of 2026-07-27, after fixing a content-script isolated-world bug where
  `window.RYMchart` calls were routed through `runScript()` — see `CLAUDE.md`
  for the general pattern. Built Safari-first per the user's workflow —
  feature branches here aren't merged straight into `main`; the user merges
  the relevant changes into their own fork's main branch by hand once a
  branch is where they want it.
- The chart-shortcuts hint text is inserted as bare content directly
  into RYM's own `.page_chart_query_free_section_label` div via
  `label.insertAdjacentHTML("beforeend", ...)` — no wrapping `<span>`/`<div>`
  — so it structurally matches the label's own bare text node (confirmed
  against a DevTools screenshot of the target DOM shape) and inherits the
  label's font/color for free. Idempotency guard is `label.dataset.ebrHint`
  (an ID-based `document.getElementById` guard doesn't work once there's no
  wrapping element with an ID).
- `docs/todo.md` has two open follow-ups from this branch's work: (1)
  whether a browser-automation MCP connector is worth setting up so future
  sessions can drive a live browser directly instead of relying on pasted
  console output, (2) making the macOS app target build straight into
  `/Applications` (done 2026-08-05 by the third attempt above). The third item (matching hint text font/color to RYM's
  label) resolved itself as a side effect of the DOM-structure change above.

- `chart-searchbar` branch: committed (`0e831ab3`) a set of reference files
  the user is using as source material for this branch's work —
  `charts_source.html` / `apple_music_source.html` (saved RYM page-source
  dumps) and a saved third-party GitHub issue page
  (`uBlock-LLC:uBlock` #1366, about Safari erasing extension settings on
  "clear web history" — background reading related to the native-settings
  persistence approach documented in `CLAUDE.md`), plus `screenshots/`
  (macOS app release-page/add-release screenshots at various sizes). Only
  `screenshots/.DS_Store` was deliberately excluded from that commit (Finder
  metadata, no value in git) — everything else was kept as-is per the user's
  choice. The branch's chart-shortcuts work later came to `main` as
  `f96852bd` (see "`chart-searchbar` → `main`").

- `chart-shortcuts` redesign (2026-08-05, **implemented, confirmed working
  in Safari and committed**; see "Resolved and implemented" below): the
  user reported the known "competing
  interfaces" bug recurring — RYM's own chart-builder search dropdown and
  this module's custom suggestion overlay fighting each other. Root cause
  confirmed by reading `app.ts`: `CONTAINER_ID`/`LIST_ID`/`INPUT_ID` are
  RYM's own native browse-widget DOM element ids (`ui_browser_list_contents_
  page_charts_settings` etc., confirmed against the `RYMbrowser`-owned
  markup in `charts_source.html`), and the module's `renderFreeMode()`
  overwrites `container.innerHTML` with its own rows while
  `observeContainerOverwrites()` watches that same container via
  `MutationObserver` and re-renders on top whenever RYM's own AJAX result
  handler (`RYMbrowser._onResults`) redraws it — a literal redraw war.
  `suppressNativeKeyUp`/`suppressNativeBlur`/`overrideNativeFocus` compound
  this by replacing the same `on*` handlers RYM assigned to the input.

  **Decision**: abandon the custom overlay entirely. Keep only the keyboard
  shortcuts (Ctrl+1/2/3 → top/secondary/either genre, Ctrl+D → descriptor,
  Shift/Ctrl+\` → exclude, Ctrl+Enter → create chart), which apply to
  whatever the *first parent-level* (never sub-genre/sub-descriptor) match
  is for the currently-typed query — i.e. add functionality on top of RYM's
  native dropdown without ever touching its rendering, so a user can freely
  use the shortcuts, click Include/Exclude buttons, or click "Browse
  sub-genres/descriptors" without the two interfaces stepping on each other.

  Investigated RYM's own `browser.js` bundle
  (`cdn.sonemic.net/dist/rym25/js/ui/browser.js`, downloaded to scratch and
  read directly since it isn't part of this repo) to find the real data
  source for "first option that appears," rather than approximating it with
  the module's own separate fetch (a divergence risk an advisor review
  flagged: the module's own debounce is 180ms vs. native's 50ms, so a fast
  Ctrl+1 press could act on stale/empty local suggestions while RYM's own
  list already shows something different). Findings, durable and worth
  reusing for the actual implementation:
  - `RYMbrowser.currentResultSet["page_charts_settings"]` holds the exact
    JSON (`{results: [...]}`) currently rendered in RYM's own list — reading
    this directly (via `runScript()` + a `CustomEvent` round-trip back to
    the content script, the existing pattern documented in `CLAUDE.md`'s
    Feature module pattern section) is the exact, non-approximating source
    of "the first option that appears," not a second independent fetch.
  - `RYMbrowser.path["page_charts_settings"]` is the sub-browse navigation
    stack; empty means the currently-displayed list is top-level (genre/
    descriptor) results, non-empty means the user has clicked into
    "Browse sub-genres/descriptors" and the list now holds sub-items — the
    shortcut handlers must check this and no-op (fall through, don't
    preventDefault) when non-empty, per "just use the parent."
  - `RYMbrowser.addBrowserItem(id, filterType, itemId, name)` just calls
    `RYMchart.addBrowserItem(filterType, itemId, name)` (same function this
    module already calls) then clears the input and nav path — confirms the
    module's existing `applyItem()` approach already matches native
    behavior exactly, no change needed there.
  - Endpoint/params match exactly: both native (`RYMbrowser._doSearch`) and
    this module's `fetchSuggestions` hit `/api/1/browse/music/` with
    `{q, component}` — so if the module keeps its own fetch instead of
    reading `currentResultSet` directly, results should be identical when
    not racing a very recent keystroke.

  Full removal list an advisor review specified (full deletions, not
  conditional forwarding, since e.g. `overrideNativeFocus` never saved the
  original `onfocus` to forward to): `renderFreeMode`, `suggestionRow`,
  `freeModeHeader`, `bindSuggestionClicks`, `render`, `showList`/`hideList`,
  `observeContainerOverwrites`, `suppressNativeKeyUp`, `suppressNativeBlur`,
  `overrideNativeFocus`, `handleTabCycle`, `handleEscape` (Tab/Escape must
  fall through to RYM once there's no overlay to navigate/close). The
  exclude-mode `[EXCL]` indicator moves into the static hint text already
  injected by `insertShortcutHint` (outside the list container, so it can't
  fight anything) rather than the overlay's dynamic header.

  **Resolved and implemented (2026-08-05):** plan recapped for the user and
  confirmed, including the open data-source question — the user chose
  reading `RYMbrowser.currentResultSet` live via the injected-script +
  `CustomEvent` round-trip (the exact, non-approximating option) over
  keeping the module's own parallel fetch. `app.ts` was rewritten:
  - Removed entirely: `renderFreeMode`, `suggestionRow`, `freeModeHeader`,
    `bindSuggestionClicks`, `render`, `showList`/`hideList`,
    `observeContainerOverwrites`, `suppressNativeKeyUp`, `suppressNativeBlur`,
    `overrideNativeFocus`, `handleTabCycle`, `handleEscape`, plus the now-dead
    `fetchSuggestions`/`suggestionCache`/`scheduleSearch`/`onInput` (the
    module's own parallel fetch, superseded by reading native state).
  - Added: `queryNativeBrowser(scope)` — injects a script reading
    `RYMbrowser.path["page_charts_settings"]` and dispatches a `CustomEvent`
    back with `{ subBrowseActive, item }` (first result whose `component`
    matches the requested scope, only computed when `path` is empty). A
    review caught that the first draft read `RYMbrowser.currentResultSet`
    ("last rendered"), which can be stale relative to the just-typed query
    if a shortcut is pressed before RYM's own ~50ms-debounced search
    round-trip lands — silently applying the *wrong* genre/descriptor with
    no error, worse than the old design's safe no-op on empty local
    `suggestions`. Fixed by reading `RYMbrowser.resultCache` instead, keyed
    by the exact `JSON.stringify({q, component})` that produced it (same
    key `_doSearch` computes) built from the input's live value — a missing
    cache entry for the current text means "no match yet," never a wrong
    one. `component` is read from the browse root's `data-component`
    attribute (confirmed `""` for the charts page via `charts_source.html`)
    rather than hardcoded, so it stays correct if RYM's markup changes.
    `applyNativeMatch()` awaits this and no-ops (doesn't call `applyItem`)
    when `subBrowseActive` is true or no item matched — this is what
    enforces "never sub-genres/sub-descriptors, just the parent." The
    Ctrl+1/2/3/D keys still always `preventDefault`/`stopPropagation`
    synchronously (needed to block the browser's own reserved shortcuts,
    e.g. Ctrl+D bookmark) regardless of the async result — only the *filter
    application* is gated on native state, not event consumption. This is
    an implementation-level interpretation of "no-op" (don't apply a
    filter) rather than "let the browser/RYM handle the key" (not possible
    synchronously since native state requires an async round-trip); flagged
    to the user as a judgment call rather than a literal follow of the
    original plan wording.
  - `applyItem()` (calls `RYMchart.addBrowserItem` directly) was unchanged,
    confirmed already matching native behavior exactly (see above).
  - The `[EXCL]` exclude-mode indicator now lives in a `<span
    class="ebr-exclude-badge">` inside the static hint text inserted by
    `insertShortcutHint`, toggled via `updateExcludeBadge()` — matches the
    plan's intent to move it out of the (now-removed) dynamic overlay header.
  - `chart-shortcuts.css`: removed the now-dead `.ebr-active` and
    `.ebr-type-badge` rules (overlay-only), kept `.ebr-exclude-badge`.

  Verified: `tsc --noEmit`, `eslint src/modules/chart-shortcuts/`,
  `biome check src/modules/chart-shortcuts/` all clean, and
  `npm run build:safari` succeeds end-to-end. **Manually tested and
  confirmed working by the user (2026-08-05)** in the Safari-wrapped app —
  shortcuts select the right parent-level genre/descriptor against RYM's
  live dropdown, and clicking "Browse sub-genre" / typing normally in the
  native widget is untouched. Committed.
