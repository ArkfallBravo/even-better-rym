# Plan / open work

(Safari iOS manifest `persistent` flag fix landed in commit `3d803f30` — see
`docs/codebase.md` for the reasoning if needed.)

- `feature/chart-prefix-commands` branch: ports the Tampermonkey userscript
  at `Userscripts/RYM Chart Prefix Commands.user.js` (sibling directory to
  this repo, outside git) into `src/modules/chart-prefix-commands/` as a
  toggleable feature (`chartPrefixCommands` page key, gated on `/charts/*`).
  Manually tested in the Safari-wrapped app and confirmed working (prefix
  commands, Ctrl+1/2/3/D shortcuts, exclude toggle, hint text placement) as
  of 2026-07-27, after fixing a content-script isolated-world bug where
  `window.RYMchart` calls were routed through `runScript()` — see `CLAUDE.md`
  for the general pattern. Built Safari-first per the user's workflow —
  feature branches here aren't merged straight into `main`; the user merges
  the relevant changes into their own fork's main branch by hand once a
  branch is where they want it.
- The chart-prefix-commands hint text is inserted as bare content directly
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
  `/Applications` (blocked on Xcode script sandboxing; user is doing this
  one manually). The third item (matching hint text font/color to RYM's
  label) resolved itself as a side effect of the DOM-structure change above.

- macOS app target build-into-`/Applications` attempt (2026-07-28, fully
  reverted): tried making `EvenBetterRYM (macOS)` build straight into
  `/Applications` instead of the user manually dragging the built app there.
  Landed a Run Script build phase ("Move to /Applications", after "Embed
  Foundation Extensions") that `rm -rf`s any existing
  `/Applications/EvenBetterRYM.app` and then either `ditto`s or (per the
  user's actual manual habit) literally `mv`s the built `.app` out of
  DerivedData into `/Applications`. This required
  `ENABLE_USER_SCRIPT_SANDBOXING = NO` on just that target's Debug/Release
  configs (see `docs/todo.md` for why). This part worked mechanically — the
  script did move/copy the app correctly.
  The actual blocker: Safari's Extensions list kept showing only the Debug
  build (the one Xcode's Run action launches from DerivedData), never the
  `/Applications` copy the script produced, which is the opposite of what
  the user needs (only ever one instance of the app registering the
  extension with Safari — a second copy risks conflicting/duplicate
  extension entries and broke the settings-popup scroll). Tried fixing this
  by adding an explicit shared `.xcscheme`
  (`EvenBetterRYM.xcodeproj/xcshareddata/xcschemes/EvenBetterRYM
  (macOS).xcscheme`, previously an implicit Xcode-autocreated scheme with no
  file on disk) that redirected the Run action to launch
  `/Applications/EvenBetterRYM.app` directly via `PathRunnable` instead of
  the DerivedData build product. Confirmed the scheme parsed and resolved
  correctly (`xcodebuild -list` / `-showBuildSettings` both worked), but it
  still didn't change which copy Safari picked up — root cause was never
  identified (candidates not yet ruled out: code-signing/entitlement
  differences between the DerivedData and moved/copied bundle, Safari/
  Launch Services caching extension registration from an earlier launch
  location, or Safari resolving the extension via the running process
  rather than the app's on-disk path). User decided to fully revert rather
  than keep debugging blind — all of the above (Run Script phase, the
  sandboxing override, the shared `.xcscheme`) has been removed, back to
  the pre-2026-07-28 state where the user copies the build into
  `/Applications` by hand. If revisited, worth debugging with actual
  Console.app/`pluginkit -m` output on why Safari registers the DerivedData
  copy specifically, rather than guessing further.

- Popup settings window scroll fix (2026-07-28, commit `747289e5`): the
  feature-toggle list stopped scrolling on an external monitor (worked fine
  on the built-in display). Root cause took a few rounds of live Web
  Inspector diagnostics to pin down — see `CLAUDE.md`'s "Popup sizing"
  section for the durable technical explanation (Safari's popup
  measure-then-clamp model, why `height: 100%` doesn't work, why
  `flexShrink: 0` on the cards was needed). The `maxHeight: 600` value is a
  hardcoded guess based on what this specific external monitor clamped to —
  not verified against the built-in display or other monitors post-fix, so
  it's plausible (not confirmed) that the built-in display's popup now
  scrolls unnecessarily where before it fit everything without scrolling.
  Not treated as a blocking issue since scrolling working is strictly better
  than content being unreachable, but worth a quick manual check next time
  the built-in display is used.

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
  choice. No feature code for `chart-searchbar` itself has been written yet
  as of this commit.
