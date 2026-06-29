# Grid Module — Accessibility Remediation

> Companion to [`grid-accessibility-audit.md`](./grid-accessibility-audit.md) (the
> original WCAG 2.2 AA + ARIA APG audit). After that audit, `main` landed a large
> Grid refactor (per-row editing rewrite, content-aware auto-sizing, footer/pin
> changes). This record re-validates every finding against the merged code, then
> tracks the fixes delivered on `claude/grid-accessibility-audit-khes05` and the
> prioritized follow-ups that remain.

## Status at a glance

| Outcome | Count | Notes |
| --- | --- | --- |
| Fixed by this branch | 21 | 10 commits, each with jsdom and/or real-browser tests |
| Already resolved by the merge | 5 | sort/selection ARIA, editable nav scroll + page keys |
| Mooted by the refactor | 3 | the underlying surface was removed/reworked |
| Remaining follow-ups | 10 | 2 serious, 2 moderate, 6 minor/advisory |

## Resolved by the merge (re-validation)

Verified against the merged source, no longer present:

- **FILT-01** — filter result count is now announced via the debounced busy region.
- **SELE-01 / SELE-02** — rows carry `aria-selected`; the grid advertises `aria-multiselectable`.
- **EDIT-03 / EDIT-04** — the rewritten editable grid shares the read-only cursor, so it scrolls the active cell into view and honours PageUp/Down + Ctrl+Home/End.

Mooted (surface removed or reworked): **SELE-05** (imperative `aria-selected` write deleted), **KEYB-05** (type-to-edit / Delete bindings gone), **EDIT-06** (per-cell floating-editor close path reworked).

## Fixes delivered

| Finding(s) | WCAG | Commit |
| --- | --- | --- |
| SORT-01, SELE-03, PAGI-01 — announce sort, selection count, page change | 4.1.3 | `feat: announce grid sort, selection, and page changes` |
| STRU-03, SORT-02, FILT-02 (programmatic) — grid name, sort priority, active-filter state | 1.3.1 / 1.4.1 / 4.1.2 | `feat: name the grid and expose sort priority + active filter` |
| CORR-01 — paginated select-all overclaim (found by the elegance review) | 4.1.3 | `fix: scope the select-all announcement to the page when paginated` |
| SELE-04, KEYB-03 — Space toggles row selection / never scrolls | 2.1.1 | `feat: make the grid cursor's Space key select the active row` |
| KEYB-06 — re-clamp the cursor when data shrinks | 4.1.2 / 2.4.3 | `fix: re-clamp the grid cursor when the data shrinks` |
| COLU-04, KEYB-02 — active-cell scroll-margin clears sticky chrome | 2.4.11 | `fix: keep the cursor's active cell clear of sticky chrome` |
| COLU-01, CONT-01, CONT-02, CONT-03, COLU-06 — keyboard context menu | 2.1.1 / 2.4.3 | `feat: open the grid context menu from the keyboard` |
| KEYB-01, STRU-02 — scroll virtualized rows into view for the cursor | 2.1.1 / 4.1.2 | `fix: scroll virtualized rows into view for the grid cursor` |
| EDIT-01, EDIT-02 — editor error association + commit announce | 1.3.1 / 3.3.1 / 4.1.3 | `feat: associate grid editor errors with their field and announce commits` |
| STRU-01, STRU-04 — aria-rowcount sentinel + empty-state suppression | 1.3.1 | `fix: correct the grid's aria-rowcount in server and empty states` |

New test coverage: `grid-announcements.test.tsx`, plus additions to the grid sort/filter/nav/editing/pagination jsdom suites and three real-browser suites (`grid-cursor-obscured`, `grid-virtualized-cursor`, `floating-ui/grid-context-menu-keyboard`). A new `Menu.openAt` action backs the keyboard context-menu open.

## Remaining follow-ups (prioritized)

**Serious**

- **COLU-02** (4.1.3) — announce pin/unpin, show/hide, and resize. The pin handler (`grid-data.tsx`) is stable with `[]` deps, so it needs a label-resolver ref; resize must announce on commit (not per keyboard nudge) to avoid chatter.
- **COLU-03** (2.5.8) — the reorder grip and pinned-column unpin button render a 20×20 hit target (`Icon` `md` = `size-5`), under the 24×24 minimum. Growing the box shifts the glyph off the carefully-tuned optical `-ml` inset (`recipes/kata/grid.ts` `head.pinned.button` / `reorder.handle`), so it wants an expand-hit-area approach (e.g. a centered pseudo-element) verified in the browser target-size suite.

**Moderate**

- **PAGI-02** (2.4.3 / 2.4.7) — focus is lost when the activated pagination control disables at an extent or its number scrolls out of the window; move focus to the current-page marker (`aria-current`) on change. May need ref forwarding on `PaginationPage`.
- **EDIT-05** (1.3.1 / 3.3.2) — no way to mark an editable cell required; add an optional `required` to `GridColumn` (public API + docs) and thread `required`/`aria-required` to the editors.
- **EDIT-02#23** (1.4.10) — the validation message (`absolute top-full`) can be clipped by the scroll wrapper or sticky header; flip/scroll it into view. Mitigated for AT by the EDIT-01 `aria-describedby` link.

**Minor / advisory**

- **FILT-02** (1.4.1) — the programmatic half shipped; add a non-colour visual cue (icon swap / dot) for the active filter button, verified in the browser.
- **COLU-05** (4.1.2) — resize separator gained `aria-valuetext` in the merge; still needs Home/End (min/max), PageUp/Down (large step), and a reset key.
- **CONT-04** — Ctrl+click defers to the native menu on macOS, hiding menu-only actions; platform-gate the escape hatch.
- **KEYB-04** — PageUp/Down jump a fixed 10 rows rather than a viewport; thread the scroll container to compute a viewport-relative step.
- **KEYB-07** — a plain `navigable` (whole-set) grid omits `aria-rowcount`/`aria-colindex`; low impact since native DOM order conveys structure.
