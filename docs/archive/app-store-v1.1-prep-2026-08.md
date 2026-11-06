# App Store v1.1 submission prep (2026-08)

How the v1.1 description and release notes were drafted, and the screenshot pipeline detour. v1.1 through v1.3 have since shipped; the v2.0 drafts replaced these. Moved out of `docs/plan.md` on 2026-11-06.

- App Store v1.1 submission prep (started 2026-08-14): tagged the exact
  commit that was on `main` when the v1.0 build was submitted for review
  (`app-store-v1.0-submission` on `5d776223`, pushed to origin — see
  `CLAUDE.md`'s "App Store Connect metadata" section), then diffed forward
  from there to find what actually needs to go in the next version's
  description/release-notes updates rather than guessing. Found one real new
  feature (`chart-shortcuts`), two import bug fixes (Melon host permission,
  Qobuz locale rewrite), one reliability fix (Tidal autofind matching), and
  one regression worth calling out rather than glossing over: `5ed78c70`
  disabled the Release Submission Helper's auto-import "Credits" checkbox
  (it accepted the first search result with no disambiguation) — the old App
  Store description's claim that Import auto-fills credits is no longer
  true and was corrected.

  Drafted `app-store-description.txt` (also fixed several copy/paste
  corruption artifacts in the user's originally-pasted description text by
  cross-referencing `src/shared/pages.ts`'s canonical popup hint strings,
  rather than guessing at the missing words) and `whats-new.txt`, both saved
  to `app store submission stuff/` (see `CLAUDE.md`). Neither has been
  explicitly confirmed as final/approved by the user yet.

  Regenerating `mac_release_page_2560x1600.png` to match the other App Store
  screenshots took several wrong turns (centered crop, then a
  reverse-engineered horizontal-shift transform, then a tight content-bbox
  crop) before the user supplied their own actual `sips` two-command
  pipeline, which turned out to reproduce the reference file byte-for-byte —
  see `CLAUDE.md`'s "Producing a `*_2560x1600.png` macOS screenshot" section
  for the exact commands. The uneven black margin around the window in the
  output (61/49/20/162 px) is expected, not a defect, once produced that way.

  The `screenshots/` → `app store submission stuff/` migration was
  committed as `6e6ab63`. Confirming the two drafts as final is tracked in
  `docs/todo.md`.
