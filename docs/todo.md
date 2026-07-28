# Todo

- Look into whether a browser-automation MCP connector (e.g. Playwright or
  Chrome DevTools MCP) is worth setting up so Claude Code can drive/inspect
  a live browser (run console commands, read DOM state) itself instead of
  relying on manually pasted console output during debugging sessions like
  the `chart-prefix-commands` one.

- Set up the macOS app target (`EvenBetterRYM.xcodeproj`) to build directly
  into `/Applications`. Attempted twice now (both reverted — see
  `docs/plan.md` for the full account of the second attempt and why it was
  undone):
  1. A "Copy to /Applications" Run Script build phase (`ditto` after
     "Embed Foundation Extensions"), blocked by Xcode's script sandboxing
     (`ENABLE_USER_SCRIPT_SANDBOXING = YES`, set at the project level) —
     `ditto` couldn't read the built `.app`'s `Contents` directory even with
     it declared in the phase's `inputPaths`/`outputPaths` (those only feed
     Xcode's dependency-analysis graph, not the actual sandbox profile). The
     fix for *that* specific problem is disabling
     `ENABLE_USER_SCRIPT_SANDBOXING` for just the macOS app target's Debug/
     Release configs (not project-wide).
  2. Re-attempted with the sandboxing fix applied, a Run Script phase
     (`ditto`, later changed to a literal `mv` per the user's actual manual
     workflow), and (briefly) an explicit shared `.xcscheme` redirecting
     Xcode's Run action to launch the `/Applications` copy instead of the
     DerivedData one. None of it fixed the underlying issue: Safari's
     Extensions list still only picked up the Debug build, not the
     `/Applications` copy, regardless of which one Xcode's Run action
     launched. Root cause not identified. User reverted all of it and is
     back to doing this manually in Xcode.

- Remove the `chart-prefix-commands` prefix commands (`+g`/`-g`, `+i`/`-i`,
  `+gi`/`-gi`, `+d`/`-d` typed into the search box) and just keep the
  keyboard shortcuts (Ctrl+1/2/3/D, Ctrl+`, Ctrl+Enter). Simplifies the
  module by dropping the prefix-parsing path (`parseInput`, `PREFIX_MAP`,
  etc.) while keeping the part of the feature that's actually used.

