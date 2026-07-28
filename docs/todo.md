# Todo

- Look into whether a browser-automation MCP connector (e.g. Playwright or
  Chrome DevTools MCP) is worth setting up so Claude Code can drive/inspect
  a live browser (run console commands, read DOM state) itself instead of
  relying on manually pasted console output during debugging sessions like
  the `chart-prefix-commands` one.

- Set up the macOS app target (`EvenBetterRYM.xcodeproj`) to build directly
  into `/Applications`. Attempted via a "Copy to /Applications" Run Script
  build phase (`ditto` after "Embed Foundation Extensions"), but Xcode's
  script sandboxing (`ENABLE_USER_SCRIPT_SANDBOXING = YES`, set at the
  project level) blocked `ditto` from reading the built `.app`'s `Contents`
  directory even after declaring it in the phase's `inputPaths`/
  `outputPaths` — those only feed Xcode's dependency-analysis graph, not the
  actual sandbox profile. The real fix is disabling
  `ENABLE_USER_SCRIPT_SANDBOXING` for just the macOS app target's Debug/
  Release build configurations (not project-wide, to keep the other
  targets' hardening). Reverted the attempt; user wants to do this one
  manually in Xcode.

- Remove the `chart-prefix-commands` prefix commands (`+g`/`-g`, `+i`/`-i`,
  `+gi`/`-gi`, `+d`/`-d` typed into the search box) and just keep the
  keyboard shortcuts (Ctrl+1/2/3/D, Ctrl+`, Ctrl+Enter). Simplifies the
  module by dropping the prefix-parsing path (`parseInput`, `PREFIX_MAP`,
  etc.) while keeping the part of the feature that's actually used.

