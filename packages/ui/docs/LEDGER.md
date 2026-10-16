# Quality ledger

> **The state of each `ui` unit against the definition of done.** A unit is one directory of `components`, `modules`, `primitives`, `structure`, or `providers`, or one layout. Each unit has one row. `ledger-boundary.test.ts` fails when a unit has no row, when a row has no unit, or when a cell breaks the rules below. The quality scan ([`quality-scan.md`](../../../.claude/commands/quality-scan.md)) writes the Open cells and the Scan section. `pnpm --filter ui quality:report` reads this file and the git history, ranks the next passes, and writes the weekly metrics.

## Definition of done

A unit is **Clean at a commit** when all five checks pass at that commit. Each check has a yes or no answer, so a later pass can do it again and get the same answer.

1. **Contract written.** The TSDoc of the unit states its behavior in each lens that applies to it.
2. **Contract tested.** Each lens that applies has a test of the rule, not of one reported case. When units share a mechanism, one table-driven test runs every unit of the family.
3. **Clean sweep.** A `bug-sweeper` and `bug-verifier` pass over the full file list of the unit returns no confirmed finding at the severity floor or above. Each finding below the floor is fixed or in the "Known, not chasing" cell.
4. **Phone check.** For a unit with touch or a phone layout, the iPhone checks of the unit passed at the commit or after it. They are on the phone list of its pass.
5. **Concise.** The unit does not go around a shared piece, and it has no dead surface.

The lenses and their definitions are in [`bug-sweeper.md` §6](../../../.claude/agents/bug-sweeper.md). The severity levels and the floor are in [`bug-verifier.md` §6](../../../.claude/agents/bug-verifier.md). The floor is `medium`.

## Passes

The quality scan finds the open findings of each unit. The weekly report ranks the units in this order: `high`, `medium`, correctness, polish, fixes in the last 7 days, and name. A Clean pass ([`bug-audit.md`](../../../.claude/commands/bug-audit.md) §8) takes the units at the top of that rank. It fixes the bugs first, then the correctness findings, then the polish findings. The kinds are in [`bug-verifier.md` §6.4](../../../.claude/agents/bug-verifier.md).

Each pass has one phone list. The list names the iPhone checks of each unit of the pass that has touch or a phone layout. A maintainer runs the list after the deploy. A unit with no touch and no phone layout has `n/a` and does not wait for the list.

## Scan

The measures of the last quality scan. Each Open cell is true at the commit of the scan. A unit whose files changed after that commit is stale until the next scan. A value is `—` until the first scan.

- **Commit.** —
- **Date.** —
- **Recall.** —
- **Agreement.** —
- **Lens coverage.** —
- **Unproved.** —

## States

- **Not started.** No pass has started on the unit.
- **In pass.** A sweep, a fix, or a confirmation sweep of the unit is open, or its phone checks did not pass yet.
- **Clean.** The confirmation sweep returned no finding at the floor or above, and the other four checks pass.
- **Reopened.** A bug report, a failed iPhone check, or a later fix that repairs a defect in the unit moved it out of Clean.

A unit leaves Clean only on evidence. A refactor does not reopen a unit. A rule that a change applies to all of `ui` does not reopen a unit. A pull request that touches the files of a Clean unit gets a sweep of its diff against the lenses of the unit.

## Cells

- **Unit.** The directory name, or the file name of a layout without its extension.
- **State.** One of the four states.
- **Clean in.** The pull request that set the unit to Clean, as a link. A Not started unit has `—`. A Reopened unit keeps the last link.
- **Lenses.** The lenses that apply to the unit, as lens ids, from the "Applies when" rule of each lens. A unit that no lens applies to has `none`. A unit with `—` has no result yet, and only a Not started unit can have it. A scan reads only units with a result.
- **Open.** The proved findings of the last scan that no pull request closed yet, by severity and kind, such as `1 medium, 2 correctness`. A unit with no open finding has `none`. Before the first scan, each row has `—`. A Clean unit has `none` or `—`.
- **Phone check.** The date of the last passed run of the phone list for the unit, as `YYYY-MM-DD`. A unit with no touch and no phone layout has `n/a`. A Clean unit does not have `—`.
- **Known, not chasing.** The findings below the floor that the reader declined in a pass, with the pull request that recorded each one. A later sweep does not raise them again. A row cites pull requests only.

## Components

| Unit | State | Clean in | Lenses | Open | Phone check | Known, not chasing |
| --- | --- | --- | --- | --- | --- | --- |
| `accordion` | Not started | — | `keyboard`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `address-input` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `alert` | Not started | — | `keyboard`, `density`, `forced-colors`, `controlled` | — | — | — |
| `aspect-ratio` | Not started | — | none | — | — | — |
| `avatar` | Not started | — | `keyboard`, `density`, `motion`, `forced-colors` | — | — | — |
| `badge` | Not started | — | `keyboard`, `density`, `forced-colors` | — | — | — |
| `banner` | Not started | — | `keyboard`, `density`, `forced-colors`, `controlled` | — | — | — |
| `breadcrumb` | Not started | — | `keyboard`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `button` | Not started | — | `keyboard`, `density`, `motion`, `forced-colors` | — | — | — |
| `calendar` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `card` | Not started | — | `density` | — | — | — |
| `checkbox` | Not started | — | `keyboard`, `density`, `motion`, `forced-colors`, `controlled`, `form-reset` | — | — | — |
| `code` | Not started | — | `keyboard`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `collapse` | Not started | — | `keyboard`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `color` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `combobox` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `command-palette` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `confirm` | Not started | — | `keyboard`, `touch`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `context-menu` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `control` | Not started | — | `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `copy-button` | Not started | — | `keyboard`, `density`, `motion`, `forced-colors` | — | — | — |
| `credit-card-input` | Not started | — | `keyboard`, `rtl`, `density`, `forced-colors`, `controlled`, `form-reset` | — | — | — |
| `currency-input` | Not started | — | `keyboard`, `rtl`, `density`, `forced-colors`, `controlled`, `form-reset` | — | — | — |
| `date-input` | Not started | — | `keyboard`, `rtl`, `density`, `forced-colors`, `controlled`, `form-reset` | — | — | — |
| `date-picker` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `date-time` | Not started | — | `first-paint` | — | — | — |
| `description-list` | Not started | — | `touch`, `rtl`, `density` | — | — | — |
| `dialog` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | [#2326](https://github.com/charliebeckstrand/midgard/pull/2326) |
| `divider` | Not started | — | `rtl`, `density` | — | — | — |
| `drawer` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | [#2324](https://github.com/charliebeckstrand/midgard/pull/2324), [#2326](https://github.com/charliebeckstrand/midgard/pull/2326) |
| `fieldset` | Not started | — | `density`, `forced-colors`, `form-reset` | — | — | — |
| `file-upload` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `filters` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `form` | Not started | — | `forced-colors`, `controlled`, `form-reset` | — | — | — |
| `group` | Not started | — | `rtl`, `density`, `forced-colors` | — | — | — |
| `heading` | Not started | — | `density`, `motion` | — | — | — |
| `hold-button` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `icon` | Not started | — | `density` | — | — | — |
| `input` | Not started | — | `keyboard`, `rtl`, `density`, `forced-colors`, `controlled`, `form-reset` | — | — | — |
| `json-tree` | Not started | — | `keyboard`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `kanban` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `kbd` | Not started | — | `density` | — | — | — |
| `lightbox` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `link` | Not started | — | `keyboard` | — | — | — |
| `list` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `listbox` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `loading` | Not started | — | `density`, `motion` | — | — | — |
| `markdown` | Not started | — | `keyboard`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `mask-input` | Not started | — | `keyboard`, `density`, `motion`, `forced-colors`, `controlled`, `form-reset` | — | — | — |
| `menu` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | [#2324](https://github.com/charliebeckstrand/midgard/pull/2324), [#2326](https://github.com/charliebeckstrand/midgard/pull/2326) |
| `nav` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `controlled` | — | — | — |
| `number-input` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `forced-colors`, `controlled`, `form-reset` | — | — | — |
| `odometer` | Not started | — | `motion`, `first-paint` | — | — | — |
| `pagination` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors` | — | — | — |
| `password-confirm` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `password-input` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `password-strength` | Not started | — | `density` | — | — | — |
| `pdf-viewer` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `pivot-table` | Not started | — | `keyboard`, `rtl`, `density`, `forced-colors`, `first-paint` | — | — | — |
| `placeholder` | Not started | — | `density`, `motion` | — | — | — |
| `popover` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | [#2324](https://github.com/charliebeckstrand/midgard/pull/2324) |
| `progress` | Not started | — | `rtl`, `density`, `motion`, `first-paint` | — | — | — |
| `radio` | Not started | — | `keyboard`, `density`, `forced-colors`, `controlled`, `form-reset` | — | — | — |
| `rating` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `controlled`, `form-reset` | — | — | — |
| `resizable` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `scroll-area` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `search-input` | Not started | — | `keyboard`, `rtl`, `density`, `motion`, `forced-colors`, `controlled`, `form-reset` | — | — | — |
| `segment` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `controlled` | — | — | — |
| `select` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `sheet` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | [#2324](https://github.com/charliebeckstrand/midgard/pull/2324), [#2326](https://github.com/charliebeckstrand/midgard/pull/2326), [#2329](https://github.com/charliebeckstrand/midgard/pull/2329) |
| `shiny-text` | Not started | — | `rtl`, `density`, `motion` | — | — | — |
| `sidebar` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `signature-pad` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `slider` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `sparkline` | Not started | — | `rtl`, `density`, `motion`, `first-paint` | — | — | [#2330](https://github.com/charliebeckstrand/midgard/pull/2330) |
| `stat` | Not started | — | `density`, `motion` | — | — | — |
| `status` | Not started | — | `density`, `motion` | — | — | — |
| `stepper` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `swatch` | Not started | — | `density` | — | — | — |
| `switch` | Not started | — | `keyboard`, `rtl`, `density`, `motion`, `forced-colors`, `controlled`, `form-reset` | — | — | — |
| `table` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `tabs` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `tag-input` | Not started | — | `keyboard`, `rtl`, `density`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `text` | Not started | — | `keyboard`, `density`, `motion` | — | — | — |
| `textarea` | Not started | — | `keyboard`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `time-ago` | Not started | — | none | — | — | — |
| `timeline` | Not started | — | `keyboard`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `toast` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `toggle-icon-button` | Not started | — | `keyboard`, `density`, `motion`, `forced-colors`, `controlled` | — | — | — |
| `toolbar` | Not started | — | `keyboard`, `rtl`, `density`, `forced-colors`, `first-paint` | — | — | — |
| `tooltip` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | [#2324](https://github.com/charliebeckstrand/midgard/pull/2324), [#2326](https://github.com/charliebeckstrand/midgard/pull/2326) |
| `tree` | Not started | — | `keyboard`, `rtl`, `density`, `motion`, `forced-colors`, `controlled` | — | — | — |

## Modules

| Unit | State | Clean in | Lenses | Open | Phone check | Known, not chasing |
| --- | --- | --- | --- | --- | --- | --- |
| `chart` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `chat` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `dashboard` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `events` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `grid` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |
| `map` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `query` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled`, `form-reset` | — | — | — |

## Layouts

| Unit | State | Clean in | Lenses | Open | Phone check | Known, not chasing |
| --- | --- | --- | --- | --- | --- | --- |
| `auth` | Not started | — | `density` | — | — | — |
| `dashboard` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `sidebar` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | [#2324](https://github.com/charliebeckstrand/midgard/pull/2324) |
| `stacked` | Not started | — | `density` | — | — | — |

## Primitives

| Unit | State | Clean in | Lenses | Open | Phone check | Known, not chasing |
| --- | --- | --- | --- | --- | --- | --- |
| `active-indicator` | Not started | — | `touch`, `motion`, `forced-colors`, `first-paint` | — | — | — |
| `chrome` | Not started | — | none | — | — | — |
| `content-height` | Not started | — | none | — | — | — |
| `control` | Not started | — | `density`, `forced-colors` | — | — | — |
| `current` | Not started | — | `rtl`, `motion`, `first-paint`, `controlled` | — | — | — |
| `density` | Not started | — | `density` | — | — | — |
| `direction` | Not started | — | `rtl` | — | — | — |
| `floating-surface` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `header-actions` | Not started | — | none | — | — | — |
| `inline-script` | Not started | — | none | — | — | — |
| `link` | Not started | — | `keyboard` | — | — | — |
| `mount` | Not started | — | `motion` | — | — | — |
| `offcanvas` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `option` | Not started | — | `keyboard`, `density`, `forced-colors` | — | — | — |
| `overlay` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | [#2329](https://github.com/charliebeckstrand/midgard/pull/2329) |
| `panel` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `polymorphic` | Not started | — | `keyboard`, `density` | — | — | — |
| `popover` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | [#2324](https://github.com/charliebeckstrand/midgard/pull/2324) |
| `portal` | Not started | — | `touch`, `rtl`, `density`, `motion`, `first-paint` | — | — | — |
| `query` | Not started | — | none | — | — | — |
| `ready-reveal` | Not started | — | `keyboard`, `motion`, `first-paint` | — | — | — |
| `reduced-motion` | Not started | — | `motion`, `first-paint` | — | — | — |
| `select-trigger` | Not started | — | `keyboard`, `rtl`, `density`, `forced-colors` | — | — | — |
| `sortable-grip` | Not started | — | `keyboard`, `touch`, `density` | — | — | — |
| `toggle` | Not started | — | `rtl`, `density`, `forced-colors` | — | — | — |
| `touch-target` | Not started | — | `touch`, `rtl`, `density` | — | — | — |
| `trigger-child` | Not started | — | `keyboard` | — | — | — |
| `virtual-options` | Not started | — | `keyboard`, `density`, `first-paint` | — | — | — |

## Structure

| Unit | State | Clean in | Lenses | Open | Phone check | Known, not chasing |
| --- | --- | --- | --- | --- | --- | --- |
| `box` | Not started | — | `touch`, `density` | — | — | — |
| `columns` | Not started | — | `touch`, `density` | — | — | — |
| `container` | Not started | — | `density` | — | — | — |
| `flex` | Not started | — | `touch`, `rtl`, `density` | — | — | — |
| `spacer` | Not started | — | none | — | — | — |
| `split` | Not started | — | `touch`, `density` | — | — | — |
| `stack` | Not started | — | `touch`, `rtl`, `density` | — | — | — |

## Providers

| Unit | State | Clean in | Lenses | Open | Phone check | Known, not chasing |
| --- | --- | --- | --- | --- | --- | --- |
| `appearance` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — | — |
| `density` | Not started | — | `density` | — | — | — |
| `glass` | Not started | — | none | — | — | — |
| `headless` | Not started | — | none | — | — | — |
| `locale` | Not started | — | `rtl`, `first-paint` | — | — | — |
| `ui` | Not started | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint` | — | — | — |
