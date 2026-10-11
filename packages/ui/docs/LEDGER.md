# Quality ledger

> **The state of each `ui` unit against the definition of done.** A unit is one directory of `components`, `modules`, `primitives`, `structure`, or `providers`, or one layout. Each unit has one row. `ledger-boundary.test.ts` fails when a unit has no row, when a row has no unit, or when a cell breaks the rules below. `pnpm --filter ui quality:report` reads this file and the git history, and writes the weekly metrics.

## Definition of done

A unit is **Clean at a commit** when all five checks pass at that commit. Each check has a yes or no answer, so a later pass can do it again and get the same answer.

1. **Contract written.** The TSDoc of the unit states its behavior in each lens that applies to it.
2. **Contract tested.** Each lens that applies has a test of the rule, not of one reported case. When units share a mechanism, one table-driven test runs every unit of the family.
3. **Clean sweep.** A `bug-sweeper` and `bug-verifier` pass over the full file list of the unit returns no confirmed finding at the severity floor or above.
4. **Phone check.** For a unit with touch or a phone layout, a maintainer did one named iPhone check at the commit or after it.
5. **Concise.** The unit does not go around a shared piece, and it has no dead surface.

The lenses and their definitions are in [`bug-sweeper.md` §6](../../../.claude/agents/bug-sweeper.md). The severity levels and the floor are in [`bug-verifier.md` §6](../../../.claude/agents/bug-verifier.md). The floor is `medium`.

## States

- **Not started.** No pass has started on the unit.
- **In pass.** A sweep, a fix, or a confirmation sweep of the unit is open.
- **Clean.** The confirmation sweep returned no finding at the floor or above, and the other four checks pass.
- **Reopened.** A bug report, a failed iPhone check, or a later fix that touches the files of the unit moved it out of Clean.

A unit leaves Clean only on evidence. A pull request that touches the files of a Clean unit gets a sweep of its diff against the lenses of the unit.

## Cells

- **Unit.** The directory name, or the file name of a layout without its extension.
- **State.** One of the four states.
- **Clean in.** The pull request that set the unit to Clean, as a link. A Not started unit has `—`. A Reopened unit keeps the last link.
- **Lenses.** The lenses that apply to the unit, as lens ids. A Not started unit can have `—`. A unit in any other state names one lens or more.
- **Phone check.** The date of the last iPhone check, as `YYYY-MM-DD`, or `n/a` for a unit with no touch and no phone layout. A Clean unit does not have `—`.
- **Known, not chasing.** The findings below the floor that a pass recorded, with the pull request that recorded each one. A later sweep does not raise them again. A row cites pull requests only.

## Components

| Unit | State | Clean in | Lenses | Phone check | Known, not chasing |
| --- | --- | --- | --- | --- | --- |
| `accordion` | Not started | — | — | — | — |
| `address-input` | Not started | — | — | — | — |
| `alert` | Not started | — | — | — | — |
| `aspect-ratio` | Not started | — | — | — | — |
| `avatar` | Not started | — | — | — | — |
| `badge` | Not started | — | — | — | — |
| `banner` | Not started | — | — | — | — |
| `breadcrumb` | Not started | — | — | — | — |
| `button` | Not started | — | — | — | — |
| `calendar` | Not started | — | — | — | — |
| `card` | Not started | — | — | — | — |
| `checkbox` | Not started | — | — | — | — |
| `code` | Not started | — | — | — | — |
| `collapse` | Not started | — | — | — | — |
| `color` | Not started | — | — | — | — |
| `combobox` | Not started | — | — | — | — |
| `command-palette` | Not started | — | — | — | — |
| `confirm` | Not started | — | — | — | — |
| `context-menu` | Not started | — | — | — | — |
| `control` | Not started | — | — | — | — |
| `copy-button` | Not started | — | — | — | — |
| `credit-card-input` | Not started | — | — | — | — |
| `currency-input` | Not started | — | — | — | — |
| `date-input` | Not started | — | — | — | — |
| `date-picker` | Not started | — | — | — | — |
| `date-time` | Not started | — | — | — | — |
| `description-list` | Not started | — | — | — | — |
| `dialog` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — |
| `divider` | Not started | — | — | — | — |
| `drawer` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — |
| `fieldset` | Not started | — | — | — | — |
| `file-upload` | Not started | — | — | — | — |
| `filters` | Not started | — | — | — | — |
| `form` | Not started | — | — | — | — |
| `group` | Not started | — | — | — | — |
| `heading` | Not started | — | — | — | — |
| `hold-button` | Not started | — | — | — | — |
| `icon` | Not started | — | — | — | — |
| `input` | Not started | — | — | — | — |
| `json-tree` | Not started | — | — | — | — |
| `kanban` | Not started | — | — | — | — |
| `kbd` | Not started | — | — | — | — |
| `lightbox` | Not started | — | — | — | — |
| `link` | Not started | — | — | — | — |
| `list` | Not started | — | — | — | — |
| `listbox` | Not started | — | — | — | — |
| `loading` | Not started | — | — | — | — |
| `markdown` | Not started | — | — | — | — |
| `mask-input` | Not started | — | — | — | — |
| `menu` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — |
| `nav` | Not started | — | — | — | — |
| `number-input` | Not started | — | — | — | — |
| `odometer` | Not started | — | — | — | — |
| `pagination` | Not started | — | — | — | — |
| `password-confirm` | Not started | — | — | — | — |
| `password-input` | Not started | — | — | — | — |
| `password-strength` | Not started | — | — | — | — |
| `pdf-viewer` | Not started | — | — | — | — |
| `pivot-table` | Not started | — | — | — | — |
| `placeholder` | Not started | — | — | — | — |
| `popover` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — |
| `progress` | Not started | — | — | — | — |
| `radio` | Not started | — | — | — | — |
| `rating` | Not started | — | — | — | — |
| `resizable` | Not started | — | — | — | — |
| `scroll-area` | Not started | — | — | — | — |
| `search-input` | Not started | — | — | — | — |
| `segment` | Not started | — | — | — | — |
| `select` | Not started | — | — | — | — |
| `sheet` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — |
| `shiny-text` | Not started | — | — | — | — |
| `sidebar` | Not started | — | — | — | — |
| `signature-pad` | Not started | — | — | — | — |
| `slider` | Not started | — | — | — | — |
| `sparkline` | Not started | — | — | — | — |
| `stat` | Not started | — | — | — | — |
| `status` | Not started | — | — | — | — |
| `stepper` | Not started | — | — | — | — |
| `swatch` | Not started | — | — | — | — |
| `switch` | Not started | — | — | — | — |
| `table` | Not started | — | — | — | — |
| `tabs` | Not started | — | — | — | — |
| `tag-input` | Not started | — | — | — | — |
| `text` | Not started | — | — | — | — |
| `textarea` | Not started | — | — | — | — |
| `time-ago` | Not started | — | — | — | — |
| `timeline` | Not started | — | — | — | — |
| `toast` | Not started | — | — | — | — |
| `toggle-icon-button` | Not started | — | — | — | — |
| `toolbar` | Not started | — | — | — | — |
| `tooltip` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — |
| `tree` | Not started | — | — | — | — |

## Modules

| Unit | State | Clean in | Lenses | Phone check | Known, not chasing |
| --- | --- | --- | --- | --- | --- |
| `chart` | Not started | — | — | — | — |
| `chat` | Not started | — | — | — | — |
| `dashboard` | Not started | — | — | — | — |
| `grid` | Not started | — | — | — | — |
| `map` | Not started | — | — | — | — |
| `query` | Not started | — | — | — | — |

## Layouts

| Unit | State | Clean in | Lenses | Phone check | Known, not chasing |
| --- | --- | --- | --- | --- | --- |
| `auth` | Not started | — | — | — | — |
| `dashboard` | Not started | — | — | — | — |
| `sidebar` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — |
| `stacked` | Not started | — | — | — | — |

## Primitives

| Unit | State | Clean in | Lenses | Phone check | Known, not chasing |
| --- | --- | --- | --- | --- | --- |
| `active-indicator` | Not started | — | — | — | — |
| `chrome` | Not started | — | — | — | — |
| `content-height` | Not started | — | — | — | — |
| `control` | Not started | — | — | — | — |
| `current` | Not started | — | — | — | — |
| `density` | Not started | — | — | — | — |
| `direction` | Not started | — | — | — | — |
| `floating-surface` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — |
| `header-actions` | Not started | — | — | — | — |
| `link` | Not started | — | — | — | — |
| `mount` | Not started | — | — | — | — |
| `offcanvas` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — |
| `option` | Not started | — | — | — | — |
| `overlay` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — |
| `panel` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — |
| `polymorphic` | Not started | — | — | — | — |
| `popover` | In pass | — | `keyboard`, `touch`, `rtl`, `density`, `motion`, `forced-colors`, `first-paint`, `controlled` | — | — |
| `portal` | Not started | — | — | — | — |
| `query` | Not started | — | — | — | — |
| `ready-reveal` | Not started | — | — | — | — |
| `reduced-motion` | Not started | — | — | — | — |
| `select-trigger` | Not started | — | — | — | — |
| `sortable-grip` | Not started | — | — | — | — |
| `toggle` | Not started | — | — | — | — |
| `touch-target` | Not started | — | — | — | — |
| `trigger-child` | Not started | — | — | — | — |
| `virtual-options` | Not started | — | — | — | — |

## Structure

| Unit | State | Clean in | Lenses | Phone check | Known, not chasing |
| --- | --- | --- | --- | --- | --- |
| `box` | Not started | — | — | — | — |
| `columns` | Not started | — | — | — | — |
| `container` | Not started | — | — | — | — |
| `flex` | Not started | — | — | — | — |
| `spacer` | Not started | — | — | — | — |
| `split` | Not started | — | — | — | — |
| `stack` | Not started | — | — | — | — |

## Providers

| Unit | State | Clean in | Lenses | Phone check | Known, not chasing |
| --- | --- | --- | --- | --- | --- |
| `appearance` | Not started | — | — | — | — |
| `density` | Not started | — | — | — | — |
| `glass` | Not started | — | — | — | — |
| `headless` | Not started | — | — | — | — |
| `locale` | Not started | — | — | — | — |
| `ui` | Not started | — | — | — | — |
