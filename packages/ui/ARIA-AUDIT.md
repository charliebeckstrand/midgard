# ARIA Audit — `packages/ui`

**Date:** 2026-06-07 · **Scope:** interactive, overlay, and custom-widget components (pure layout primitives excluded by request). **Method:** manual sweep against the WAI-ARIA Authoring Practices Guide (APG), focused on defects the existing axe-core baseline gate *cannot* catch — focus management, keyboard semantics, live-region announcement, dynamic state-attribute wiring, and accessible naming. **No files were modified.**

ARIA in this library is hand-rolled (no Radix/Ark/Base UI; only `@floating-ui/react` for positioning), so these patterns are the library's own responsibility and worth auditing in depth.

---

## Executive summary

The foundations are strong. Native elements are used wherever possible, the `Control`/`Field` system composes `aria-describedby` from only-rendered ids (never dangles), `aria-invalid` is bound to live form/Control state rather than hardcoded, error `Message`s use `role="alert"`, modal focus management (trap / return / inert background / Escape) is genuinely implemented via floating-ui's `FloatingFocusManager modal`, and several components are textbook: `CommandPalette` (virtual `aria-activedescendant` combobox-in-dialog), `ProgressBar`, `Resizable`, `DataTable`, `TagInput`, `FileUpload`, `CopyButton`, `Alert`/`Toast` severity→live-region mapping.

The findings cluster into a handful of **systemic patterns** rather than scattered one-offs. Fixing the five cross-cutting themes below resolves the majority of individual findings.

### Headline issues

1. **floating-ui `useRole` double-stamps the popup role** on `listbox`, `select`, `combobox`, and `menu` — the outer positioned wrapper gets `role="listbox"`/`"menu"` while an inner element renders the same role, producing nested duplicate widgets, and `getReferenceProps()` makes the trigger wrapper a *second* `combobox`. (Critical) **✅ RESOLVED** — `listbox`/`select`/`combobox` (`1774b4a`, `b53d74e`) and `menu` (`aea4bba`) now suppress floating-ui's role (`role: null`) and keep their hand-rolled roles as the single source of truth.
2. ~~**`Combobox`'s editable input moves DOM focus onto options** with no `aria-activedescendant`, breaking the APG editable-combobox contract. (Critical)~~ **✅ RESOLVED** (PR #532, `a8c07ff`).
3. **Roles ship without a required accessible name** across many group/composite components (tablist, toolbar, radiogroup, checkbox-group, slider, drawer, sheet, kanban). (High)
4. **Placeholder used as the only label** on `QueryBuilder` selects/inputs, credit-card expiry/CVV, and address-input. (High) **✅ Mostly resolved** — `QueryBuilder` (`e9347ff`) and `address-input` (`c096138`, via a new `Combobox` `aria-label`) now carry explicit names; credit-card expiry/CVV still pending.
5. **State conveyed by color/CSS only** — `Stepper` completed/upcoming steps and `EditableGrid` range selection are invisible to AT. (High, WCAG 1.4.1)

---

## Cross-cutting patterns

**A. floating-ui role duplication (Critical, one fix clears many).** `getFloatingProps()` / `getReferenceProps()` from floating-ui's `useRole` emit `role`, `id`, `aria-controls`, `aria-haspopup`, and `aria-expanded` onto the positioning wrapper/reference, but the components *also* hand-roll those roles on inner elements. Result: nested `listbox`-in-`listbox`, `menu`-in-`menu`, and `combobox`-in-`combobox`, plus `aria-controls` pointing at the wrapper instead of the element holding the options/menuitems. Affected: ~~`primitives/select-trigger/select-trigger.tsx:58`~~, ~~`listbox/listbox-panel.tsx:57`~~, ~~`combobox/combobox-panel.tsx:69`~~, ~~`menu/menu-content.tsx:50`~~ (via `primitives/floating-surface/floating-surface.tsx:51`). **Fix once:** decide on a single source of truth — either disable floating-ui's role emission (`useRole` off / `role: null`) and keep the hand-rolled roles, or route the floating/reference props onto the inner role-bearing elements and drop the manual duplicates. **Update (`1774b4a`, `b53d74e`, `aea4bba`) — pattern cleared:** the first option is wired throughout. `useFloatingUI` and `useFloatingDisclosure` both accept `role: null`; `listbox`/`select`/`combobox` and `menu` pass it, so no positioning or `SelectTrigger` wrapper is double-stamped. Menu additionally hand-rolls its trigger `aria-controls` against a newly minted panel id (it previously had none), correcting the wrong-target reference.

**B. Roles without enforced accessible names (High/Medium).** A role is emitted but neither a name is defaulted nor required, so an unnamed widget ships easily and axe-on-a-wired-render won't flag it. Affected: `tabs/tab-list.tsx:63` (tablist), `toolbar/toolbar.tsx:42`, `radio/radio-group.tsx:7`, `checkbox/checkbox-group.tsx:7`, `slider/slider.tsx` + hardcoded `range-slider.tsx:129,146`, `drawer/drawer.tsx:43`, `sheet/sheet.tsx:48`, `kanban/kanban.tsx:35` + `kanban-column.tsx:24`, `pivot-table/pivot-table.tsx:74`. **Fix:** require or thread an `aria-label`/`aria-labelledby` (and provide an `aria-label` escape hatch on the title-driven overlays). **Update — partially cleared:** `drawer` and `sheet` now accept an `aria-label` escape hatch applied only when no title registers (`e462ab3`), and `range-slider` accepts a per-thumb `labels` tuple (`d260a86`). Still open: tablist, toolbar, radiogroup, checkbox-group (all already thread `aria-label` via prop spread but enforce nothing), kanban, pivot-table.

**C. Placeholder-as-label (High).** Placeholder is not a programmatic name and disappears on input. Affected: `query-builder-rule.tsx:79,93`, `query-builder-rule-value.tsx:24,42,67`, `credit-card-input-expiry.tsx:37`, `credit-card-input-cvv.tsx:71`, `address-input.tsx:32,57`. **Fix:** add explicit `aria-label`s (or require `Field`/`Label` wrapping). **Update — resolved for `query-builder` (`e9347ff`) and `address-input` (`c096138`);** credit-card sub-inputs remain, since a hardcoded default there would clobber a wrapping `Field`/`Label` accessible name — they need an opt-in name instead.

**D. State conveyed by color/CSS only (High, WCAG 1.4.1).** Affected: `stepper-step.tsx:93` + `stepper-indicator.tsx:22` (completed vs. upcoming), `editable-grid-cell.tsx:48` (`data-active`/`data-in-range` with no `aria-selected`). **Fix:** add a text/`aria-label` state suffix or `aria-selected`.

**E. Missing live-region announcements for dynamic events (Medium).** Affected: `kanban/use-kanban-keyboard.ts:114-178` (keyboard reorder is silent), `command-palette.tsx:122` (result count never announced), `calendar.tsx:201` (month change on navigation), `hold-button.tsx:84` (no progress/completion), `password-strength.tsx:82` (silent when `showLabel={false}`), `password-confirm-input.tsx:26` (mismatch reason not associated to the input). **Fix:** feed the relevant string to the existing `announce()`/`useA11yAnnouncements` infrastructure.

**F. Inconsistent roving-tabindex on navigation surfaces (Medium).** `Breadcrumb` (`breadcrumb.tsx:12`), `Pagination` (`pagination.tsx:15`), and `Sidebar` (`sidebar.tsx:21`) impose a single-tab-stop roving model that contradicts the project's own documented rationale (`nav-list.tsx:18`) for keeping site-nav links individually Tab-focusable. **Fix:** pick one model and apply it consistently.

---

## Critical

| Component | Location | Problem | Fix |
|---|---|---|---|
| listbox / select | `primitives/select-trigger/select-trigger.tsx:58` | ~~`getReferenceProps()` (role `listbox`→`combobox`) lands on the wrapper `<div>` around the real `role="combobox"` button → **two nested comboboxes**.~~ **✅ RESOLVED (`1774b4a`)** — Listbox passes `useFloatingUI({ role: null })`, so its reference props carry no role; the button is the only `combobox`. | ~~Route reference props to the inner control or disable floating-ui's role wiring.~~ Done — role wiring disabled. |
| listbox / select | `listbox/listbox-panel.tsx:57` | ~~`getFloatingProps()` puts `role="listbox"`+id on the outer positioned div while `PopoverPanel` renders another `role="listbox"` → nested listboxes, `aria-required-children` violation.~~ **✅ RESOLVED (`1774b4a`)** — popup role suppressed via `role: null`; the panel is the only `listbox`, and the trigger's `aria-controls` resolves to it. | ~~Suppress floating-ui's popup role; keep one `role="listbox"`.~~ Done. |
| combobox | `combobox/combobox.tsx:158` + `use-combobox-input.ts:92` | ~~Editable `role="combobox"` input, but arrow keys move DOM focus **onto** options (roving `mode:'focus'`) and `aria-activedescendant` is never set — breaks the APG editable-combobox contract.~~ **✅ RESOLVED (PR #532, `a8c07ff`)** — switched to virtual roving with `activeDescendantRef: inputRef`; highlight tracked via `data-active` + `aria-activedescendant` while `aria-selected` stays the stored value. | ~~Switch to virtual roving with `activeDescendantRef: inputRef` (the pattern `CommandPalette` already uses).~~ Done. |
| combobox | `primitives/select-trigger/select-trigger.tsx:58` + `combobox-panel.tsx:69` | ~~Same nested-`combobox` and nested-`listbox` role double-up as listbox.~~ **✅ RESOLVED (`b53d74e`)** — Combobox passes `useFloatingUI({ role: null })`; the input is the only `combobox` and the panel's inner list the only `listbox`. | ~~See pattern A.~~ Done. |

## High

| Component | Location | Problem | Fix |
|---|---|---|---|
| tabs | `tabs/tab-list.tsx:63` | `tablist` has no accessible name (none defaulted/required). | Default or require `aria-label`/`aria-labelledby`. |
| tabs | `tabs/tab.tsx:68` + `tab-panel.tsx:14` | Idiomatic `TabContents`/`TabContent` fade API produces panels with **no** `role="tabpanel"`/`aria-labelledby`; `TabPanel` never sets `tabIndex={0}` so a panel with no focusable child is keyboard-unreachable. | Wire tabpanel role+labelledby into `TabContent`; add `tabIndex={0}`. |
| menu | `menu/menu-content.tsx:50` | ~~floating-ui stamps `role="menu"`+id on the wrapper while `PopoverPanel` also sets `role="menu"` → nested menus; trigger `aria-controls` points at the wrapper, not the menuitem container.~~ **✅ RESOLVED (`aea4bba`)** — `useFloatingDisclosure({ role: null })` drops the wrapper role; a new `menuId` ids the panel and the trigger's hand-rolled `aria-controls` resolves to it. | ~~See pattern A.~~ Done. |
| combobox | `combobox/combobox-panel.tsx:69` | ~~Outer positioned div gets a second `role="listbox"` whose only child is the real listbox.~~ **✅ RESOLVED (`b53d74e`)** — popup role suppressed via `role: null`. | ~~Suppress floating-ui popup role.~~ Done. |
| accordion / collapse | `accordion/accordion-panel.tsx:21`, `collapse/collapse-panel.tsx:18` | Panel **unmounts** when collapsed, so the trigger's `aria-controls` references a nonexistent id while closed. | Keep the panel mounted with `hidden`, or accept/document the dangling reference. |
| radio | `radio/radio.tsx:15` | Unlike Checkbox/Switch, `Radio` never calls `useFormToggle`, so inside `<Form>` checked state and `aria-invalid` aren't driven by the form model. | Wire a form binding (radio-group value comparison) or document uncontrolled-only. |
| range-slider | `slider/range/range-slider.tsx:129,146` | ~~Thumb names hardcoded `"Range start"`/`"Range end"` with no override — every range slider announces the same generic names.~~ **✅ RESOLVED (`d260a86`)** — accepts an optional `labels` tuple, defaulting to the prior strings. | ~~Accept a labels prop per thumb.~~ Done. |
| segment | `segment/segment.tsx:11` → `tabs/tab.tsx:68` | A value-picker is mapped onto `tablist`/`tab` semantics with no tabpanel (`aria-controls` only set when an `id` is passed); a single-select choice is mis-announced as tabs. | Offer a `radiogroup`/`radio` variant, or require each segment to control a panel. |
| hold-button | `hold-button/hold-button.tsx:47` | No ARIA at all for the sustained-press interaction — no hint, no progress, no completion announcement. | Add an instruction (`aria-description`) and an `announce()` on complete; expose progress. |
| drawer | `drawer/drawer.tsx:43` | ~~Requires a `DrawerTitle` for its name but exposes no `aria-label` escape hatch → title-less drawer is unnamed.~~ **✅ RESOLVED (`e462ab3`)** — accepts `aria-label`, applied only when no `DrawerTitle` registers, mirroring `Dialog`. | ~~Accept and forward `aria-label` like `Dialog` does.~~ Done. |
| credit-card-input | `credit-card-input-expiry.tsx:37`, `credit-card-input-cvv.tsx:71`, `credit-card-input.tsx:52` | Expiry/CVV sub-inputs are placeholder-only (no name); the three fields have no grouping element. | Add default `aria-label`s; wrap in `<fieldset>`/`role="group"` with a group label. |
| password-confirm | `password-confirm/password-confirm-input.tsx:26` | Mismatch forces `aria-invalid`, but the reason lives in a detached live region and isn't linked via `aria-describedby`/`aria-errormessage` → focusing the field announces "invalid" with no reason. | Wire the warning id into the input's `aria-describedby`/`aria-errormessage`. |
| query-builder | `query-builder-rule.tsx:79,93`, `query-builder-rule-value.tsx:24` | ~~Field/operator/value `Select`s pass only `placeholder`; Listbox never names itself from placeholder → unnamed comboboxes.~~ **✅ RESOLVED (`e9347ff`)** — field/operator selects carry `aria-label`s and each value control is named after its field (`"<field> value"`). | ~~Pass `aria-label` ("Field"/"Operator"/"Value").~~ Done. |
| editable-grid | `editable-grid/editable-grid.tsx:200` | `role="grid"` with no `aria-rowcount`/`colcount` and no `aria-rowindex`/`colindex` on rows/cells → under virtualization AT can't report extents or active-cell position. | Set grid `aria-rowcount`/`colcount` and per-row/cell index attrs (mirror DataTable's virtualized bridge). |
| kanban | `kanban/use-kanban-keyboard.ts:114` | Keyboard sensor disabled and the hand-rolled keyboard reorder emits **no** live-region announcements → keyboard drag/drop is silent to SR. | Add an `aria-live` region (lift/move/drop + column/position), or re-enable dnd-kit's keyboard sensor + announcer. |
| stepper | `stepper/stepper-step.tsx:93` + `stepper-indicator.tsx:22` | Completed vs. upcoming conveyed by color/CSS only; only the current step has `aria-current` (WCAG 1.4.1). | Add a text/`aria-label` state suffix or a visually-hidden status. |
| fieldset/message | `fieldset/message.tsx:58` | A `<Message>` used outside a Control context can't resolve `messageId`, so the alert is announced but not linked to any input via `aria-describedby`. | Require Message inside a Field, or fall back to a generated id. |

## Medium

- **toast** `toast/toast-alert.tsx:76` — polite (`role="status"`) toasts mount text in the same commit and, unlike `Alert`, skip the `announce()` fallback → default/success toasts may be silent on NVDA/JAWS. Mirror non-assertive toast text through `announce()`.
- **popover** `popover/popover-trigger.tsx:84` vs `popover-content.tsx:82` — trigger always advertises `aria-haspopup="dialog"` (+`aria-controls`) but content only takes `role="dialog"` when labeled → promises a dialog that isn't there. Gate `aria-haspopup` on a label, or always name the content.
- **confirm** `confirm/confirm.tsx:56` — `alertdialog` lacks `aria-describedby` when invoked with only `children`. Register children as the description or require `description`.
- **sheet** `sheet/sheet.tsx:48` — ~~title-less sheet is unnamed (no `aria-label` passthrough).~~ **✅ RESOLVED (`e462ab3`)** — accepts an `aria-label` passthrough like `Dialog`.
- **tree** `tree/tree-item-content.tsx:90` — no `aria-setsize`/`aria-posinset` (no "item N of M"); selection uses `aria-current` instead of `aria-selected`. Add set-size/pos-in-set; use `aria-selected`.
- **command-palette** `command-palette/command-palette.tsx:122` — result count never announced (only empty state). Announce "N results" on filter change.
- **calendar** `calendar/calendar-grid.tsx:54` — month is a `listbox`/`option` rather than the APG `grid` (weekday headers `aria-hidden`, no PageUp/Down); `calendar.tsx:201` — no `aria-live` announcement of the displayed month on navigation. Migrate to grid or document; add a month live region.
- **password-input** `password-input/password-input.tsx:33` — visibility toggle exposes state via name but omits `aria-pressed`/`aria-controls`; surrounding tooltip double-announces the label. Add `aria-pressed`/`aria-controls`; drop the duplicate tooltip text.
- **password-strength** `password-strength/password-strength.tsx:82` — when `showLabel={false}` the live region is dropped, so progressbar changes aren't announced. Keep an `sr-only` live region.
- **tag-input** `tag-input/tag-input.tsx:104` — ~~current tags sit in a bare div with no list/group role, so they aren't enumerable on demand.~~ **✅ RESOLVED (`8b82a21`)** — the tag container is a labeled `role="list"` and each badge a `role="listitem"`.
- **number-input** `number-input/number-input.tsx:117` — verify stepper-button value changes are announced; if not, add a polite status or move focus to the input.
- **slider** `slider/slider.tsx:74` — no `aria-valuetext` support (bare numbers for currency/levels/dates) and name not enforced. Add `formatValue`/`aria-valuetext`; require a name.
- **range-slider** `slider/range/use-range-keyboard.ts:24` — missing PageUp/PageDown large-step keys. Add them.
- **nav landmarks** `nav/nav.tsx:20`, `bottom-nav/bottom-nav.tsx` — unlabeled `<nav>` landmarks; `Navbar`/`Sidebar` use static defaults ("Main"/"Sidebar") that collide when reused. Require/derive unique labels.
- **toolbar** `toolbar/toolbar.tsx:42` — no required name; no initial single-tab-stop guarantee (unlike TabList's MutationObserver). Default a name; verify roving init.
- **breadcrumb/pagination/sidebar** — roving-tabindex inconsistency (pattern F).
- **address-input** `address-input/address-input.tsx:33` — `autoComplete='off'` suppresses native autofill and 1.3.5 hinting; placeholder is the only hint. Consider `street-address` opt-in; ensure a real label.
- **table** `table/table-loading.tsx:16` — standalone loading skeleton has no `aria-busy`/status cue. Expose one.

## Low / Info (selected)

- **button** `button/button.tsx:125` — loading anchor sets `aria-disabled` but still fires `onClick` (link activation not gated).
- **copy-button** `copy-button/copy-button.tsx:52` — `disabled` on success drops focus mid-interaction; prefer `aria-disabled` during the copied window. `use-copy-button-state.ts:42` — failed copy is silent.
- **confirm** `confirm/confirm.tsx:47` — no explicit `initialFocus` (relies on Cancel being first tabbable).
- **tooltip** `tooltip/tooltip-content.tsx:47` — `interactive` mode invites focusable content inside `role="tooltip"` (APG forbids). Document the limitation.
- **toast** `toast/toast.tsx:38` — stack isn't a labeled `role="region"`, so keyboard users can't navigate to the queue.
- **resizable** `resizable/resizable-handle.tsx:55` — `aria-orientation` is set to the group's flex direction; a separator's orientation should be its own visual axis (perpendicular). Static `aria-label="Resize"` is non-unique across handles.
- **link** `link/link.tsx:10` — ~~no `rel="noopener"` when `target="_blank"`.~~ **✅ RESOLVED (`23f617f`)** — defaults `rel="noopener noreferrer"` for `target="_blank"` unless the caller sets `rel`. (A visible new-tab affordance is still a nice-to-have.)
- **pivot-table** `pivot-table/pivot-table.tsx:74` — no table accessible name (`caption`/`aria-label`).
- **data-table** `data-table/data-table-row.tsx:71` — row checkbox name uses the raw row key; allow a human-readable label accessor.
- **calendar** `calendar/calendar-day-cell.tsx:60` — disabled dates use native `disabled` (unreachable) rather than `aria-disabled`.
- **progress** `progress/progress-gauge.tsx:54` — always emits `aria-valuenow` (no indeterminate path) and no `aria-valuetext` for the visible percentage.
- **filters** `filters/filters.tsx:94` — filter bar is an unlabeled div; active-filter count not announced.
- **signature-pad** `signature-pad/signature-pad.tsx:95` — no keyboard drawing alternative (intrinsic); ensure required-signature flows offer a fallback.
- **checkbox-group / radio-group / fieldset** — group-level required indication isn't surfaced on the legend/label (required only reaches the input via the native attribute).
- **input family** — `Input`/`Textarea`/`Mask`/`Phone`/`Zip`/`Search` provide no intrinsic `aria-label`; correct only when wrapped in `<Field><Label>`. Consider a lint/dev guard since bare usage is unnameable.

---

## What's already in good shape (no findings or info-only)

`Button`/`SubmitButton`/`ToggleIconButton` (name & state correct), `Checkbox`/`Switch` (native + dynamic state), `Control`/`Field` describedby/invalid pipeline, error `Message` (`role="alert"` + scoped id registration), `Dialog`/`Confirm` modal focus management, `Tooltip` (WCAG 1.4.13: focusable, dismissible, described-by), `Alert`/`Banner`/`Toast` severity→live-region mapping, `CommandPalette` (reference-correct virtual-activedescendant combobox), `ProgressBar`, `Resizable`, `DataTable` (`aria-sort`, virtualized row indices, labeled selection), `Table`/`PivotTable` (semantic table + scopes), `TagInput` & `FileUpload` (named controls + live announcements), `DatePicker` popup (labeled dialog + trigger wiring), `Stepper` panel/step id pairing.
