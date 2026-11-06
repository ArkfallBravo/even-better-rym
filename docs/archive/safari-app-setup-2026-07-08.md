# Safari app build, Xcode repo and App Store v1.0 (2026-07 to 2026-08)

Shipped work on the macOS app wrapper: building into `/Applications` (the reverted first attempt and the working third one), the DSTROOT symlink Clean fix, the private `EvenBetterRYM/` repo, the popup scroll fix and the v1.0 App Store listing. Moved out of `docs/plan.md` on 2026-10-16.

- macOS app target build-into-`/Applications`, third attempt — succeeded
  (2026-08-05): unlike the two reverted attempts above (which tried to copy
  the built product out of DerivedData with a Run Script `ditto`/`mv`), this
  attempt used Xcode's own install-relocation settings instead —
  `DEPLOYMENT_LOCATION = YES` plus `DSTROOT` pointed at a symlink
  (`~/.xcode-dstroot-root` → `/`, kept outside `/tmp` and outside the
  iCloud-synced repo path) and `INSTALL_PATH = /Applications`, scoped to
  just the `EvenBetterRYM (macOS)` target. Hit the same
  `ENABLE_USER_SCRIPT_SANDBOXING` sandboxing wall as attempt 1 (this time
  blocking the pre-build symlink self-heal script, `ln(...) deny(1)
  file-write-unlink`), fixed the same way: `ENABLE_USER_SCRIPT_SANDBOXING =
  NO` on just this target. User rebuilt in Xcode and confirmed it worked.
  Full settings/reasoning documented in `CLAUDE.md`'s "Building the macOS
  app straight into `/Applications`" section. Not yet re-diagnosed *why*
  this approach succeeds where the Run-Script-copy approach's Safari-extension-registration problem (root
  cause never identified) didn't — plausibly because this way there's only
  ever one on-disk `.app` produced per build location, rather than a
  DerivedData copy and a separately-produced `/Applications` copy existing
  side by side, but that's a guess, not confirmed. Known tradeoff:
  `DEPLOYMENT_LOCATION = YES` still produces both a DerivedData copy and a
  `/Applications` copy with the same bundle ID after every build (Xcode's
  behavior, not something this setup avoids) — worth revisiting if Safari
  extension registration confusion resurfaces.

- DSTROOT symlink Clean error, fixed (2026-08-14): running "Clean Build
  Folder" in Xcode started failing with `Could not delete
  ~/.xcode-dstroot-root because it was not created by the build system`.
  Root cause: the symlink was created manually (`ln -s`) before any build
  ever ran, so it was never stamped with the
  `com.apple.xcode.CreatedByBuildSystem` xattr that authorizes Xcode to
  clean it — Xcode's build system has no separate "leave this alone but
  don't error" state, only "owned/cleanable" vs. "unowned/protected". Fixed
  in two parts: (1) `xattr -s -w com.apple.xcode.CreatedByBuildSystem true
  ~/.xcode-dstroot-root` — note the `-s` flag is required for a symlink;
  the plain `xattr -w` from Xcode's own error message follows the link and
  tries to write to `/` itself, which fails with `Operation not permitted`.
  (2) The existing pre-build "Verify DSTROOT symlink" phase
  (`project.pbxproj`, previously check-only — see the `feature/chart-
  shortcuts` era note above for its original sandboxing history) was
  rewritten to actually self-heal: recreates the symlink with `ln -sfn /
  ...` if missing/wrong, then **re-applies the xattr every run**, since a
  freshly recreated symlink is a new filesystem object that loses any
  previously-set xattr — without the re-stamp, the very next Clean would
  hit the same error again. Still exits 1 with a clear message if
  recreation itself fails (e.g. a permissions problem), rather than
  silently building against a broken DSTROOT. Renamed the phase to
  "Verify/recreate DSTROOT symlink" to match. Validated with `plutil -lint`
  after editing, then **rebuilt in Xcode and confirmed by the user
  (2026-08-14) that Clean now works.**

- App Store Connect listing for "EvenBetterRYM for Safari" (iOS + macOS,
  v1.0): metadata (description, promo text, copyright, support URL, age
  ratings, content rights) filled in — see `CLAUDE.md`'s "App Store Connect
  metadata" section for the exact values chosen and why. Submitted for
  review on 2026-07-28, same day the popup scroll fix (commit `5d776223`)
  was cherry-picked to `main`.

(Safari iOS manifest `persistent` flag fix landed in commit `3d803f30` — see
`docs/codebase.md` for the reasoning if needed.)

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

- Popup scroll fix cherry-picked to `main` and shipped (2026-07-28): commit
  `747289e5` was cherry-picked onto `main` as `5d776223` (docs commit
  `9523a9aa` was intentionally left off `main` — it documents
  `chart-searchbar`-branch-specific session tradeoffs, not something `main`
  needs). Pushing hit the now-removed "Reckon comprehension" ruleset (see
  `CLAUDE.md`'s "GitHub repo notes"); once that was deleted, `main` was
  pushed directly and the user submitted the resulting build to the App
  Store the same day.

- `EvenBetterRYM/` private git repo (2026-08-05): prompted directly by the
  DSTROOT symlink incident above — two risky `project.pbxproj` build-system
  edits in one session, with only a manual `.bak` copy as a safety net
  (no real diff/revert/blame available for the mistake that broke the
  build). Discussed making this a **second, private** repo rather than
  tracking `EvenBetterRYM/` in the public `even-better-rym` repo, since the
  `DEVELOPMENT_TEAM` exposure concern documented in `CLAUDE.md` (real Apple
  Developer Team ID, would become permanently public) only applies to the
  public repo — a private one sidesteps it entirely. Set up: `git init`
  inside `EvenBetterRYM/`, its own `.gitignore` (`xcuserdata/`, `.claude/`,
  `.DS_Store`, `*.bak.*`), initial commit `1fd1c23`. Local-only until
  2026-09-06, when it got a remote: pushed to the new private GitHub repo
  `ArkfallBravo/even-better-rym-safari` (`origin`, branch `master`). A new
  repo was created rather than reusing the older private
  `ArkfallBravo/Better-RYM-for-Safari` (abandoned, unrelated history).

  Considered automating "keep the two repos in sync": since main-repo
  commits don't actually touch any file the Xcode repo tracks (they're
  disjoint file sets, coupled only by `dist/`-path references at build
  time, and `dist/` itself is gitignored/untracked in both), the only real
  automation candidate was "auto-commit whatever's sitting in
  `EvenBetterRYM/` whenever the main repo is committed to, so Xcode-side
  changes never get forgotten." Rejected auto-commit (and auto-push) as too
  risky — generic/no-review commit messages, possible half-finished or
  broken state getting committed silently — in favor of a **reminder-only**
  git hook: `.husky/post-commit` in the main repo (untracked, personal-only)
  prints a warning after each main-repo commit if `EvenBetterRYM/` has
  uncommitted changes, but never commits or pushes anything itself. Full
  reasoning and setup details are in `CLAUDE.md`'s "Building the macOS app
  straight into `/Applications`" section.

  Also surfaced as an explicit standing instruction (saved to memory,
  `feedback-commit-means-both-repos`): a bare "commit" from the user means
  commit in **both** repos when both have relevant uncommitted work, not
  just whichever one the conversation was most recently focused on.
