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
- `docs/todo.md` has three open follow-ups from this branch's work: (1)
  whether a browser-automation MCP connector is worth setting up so future
  sessions can drive a live browser directly instead of relying on pasted
  console output, (2) making the macOS app target build straight into
  `/Applications` (blocked on Xcode script sandboxing; user is doing this
  one manually), (3) matching the chart-prefix-commands hint text's font
  size/color to RYM's own label text now that it's nested in the same div.
