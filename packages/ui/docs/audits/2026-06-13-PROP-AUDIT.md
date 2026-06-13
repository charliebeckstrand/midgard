# Prop Audit — `packages/ui`

**Date:** 2026-06-13 · **Scope:** all 103 component directories, read for **API-surface gaps** — functionality a consumer would reasonably want to control but currently cannot. This is distinct from the [ARIA](2026-06-08-ARIA-AUDIT.md) and [bug](2026-06-10-BUG-AUDIT.md) audits: it targets the *prop contract*, not accessibility defects or logic errors. **Method:** manual source sweep against the library's own prop idioms (CONVENTIONS §7: the form-binding `name` cascade via `useFormValue`/`useInputValue`/`useFormToggle`; controlled/uncontrolled `value`/`defaultValue` with `undefined`=uncontrolled, `null`=controlled-no-value). Every finding was confirmed against source; candidates whose prop already existed were dropped (see *Excluded*).

---

## Executive summary

The prop surface is largely complete and idiomatic — most controls already expose the controlled/uncontrolled pair, the `name` form-binding cascade, and recipe-driven sizing. The genuine gaps clustered into five cross-cutting patterns rather than scattered one-offs. **Patterns A, B, and C — the systemic, convention-level gaps — were resolved in this pass; the grounding slice of D was also resolved.** Patterns D (remaining hardcoded literals) and E (missing observation callbacks) remain open: they are real but lower-leverage, and several are advisory rather than blocking.

A meaningful share of the initial candidate findings turned out to be props that *already exist*; verifying each against source before recording it removed those false positives (see *Excluded*).

---

## Cross-cutting patterns

**A. Bindable controls missing the form `name` cascade (High). ✅ RESOLVED.** Four value-producing controls held their value in a bare `useControllable` with no `name`, so they could not participate in a `<Form>` (CONVENTIONS §7.2). Each was swapped to the generic `useFormValue<T>` cascade — the store-only model `Listbox`/`Combobox` already use, with no hidden submission input — behind a new `name` prop, with the field marked touched at the control's natural blur seam and the field error merged into the existing Control/invalid surface. `TagInput` (`string[]`, commit `0eca492`); `SignaturePad` (`string | null`, `a60b3dd`); `Calendar` (`Date`, `9bf251c`); `DatePicker` single **and** range (`Date` / `[Date, Date]`, `a486544`) — both variants committed through one `useControllable` call, so the same swap bound both. `Form.defaultValues` seeds the respective type.

**B. Controlled/uncontrolled asymmetry across overlays and stateful nav (High). ✅ RESOLVED.** The overlay surfaces split: `Dialog`, `Drawer`, `Sheet` required `open`/`onOpenChange` (controlled-only), while `Menu` offered only `defaultOpen` (uncontrolled-only). The three panels now take optional `open`/`onOpenChange` plus `defaultOpen`, resolving open state through `useControllable` so one setter drives the `Overlay` and the close affordances in both modes; `Menu` gained controlled `open`/`onOpenChange` threaded into its existing `useFloatingDisclosure` (commit `172e6f7`). All four now match `Popover`/`Combobox`/`Tabs`. Making `open`/`onOpenChange` optional is a widening change — existing controlled call sites are unaffected.

**C. `readOnly` / `required` missing on the select family (Medium). ✅ RESOLVED.** `Listbox`, `Select`, and `Combobox` exposed only `disabled`, so a read-only-but-not-disabled dropdown was inexpressible and a selection could not be marked required — unlike `Input`/`Textarea`/`Slider`, which resolve both. Both now resolve from the prop or enclosing `<Control>`: `required` adds `aria-required` (and native `required` on the Combobox input); `readOnly` keeps the trigger/input focusable and the value submitted but routes opening through a guarded setter that blocks every open path while still allowing close (the Combobox input also gets native `readonly` to stop typing). `Select` inherits both through its `ListboxProps` passthrough (commit `f3659a5`).

**D. Hardcoded literals that should be props (Low–Medium). ◑ PARTIALLY RESOLVED.** Values baked into a component that a real consumer would want to parameterize. **Resolved:** `file-upload` had only `accept`/`multiple` (neither constrains drag-and-drop); it gained `maxSize`, `maxCount`, and an `onReject` callback, enforced at the shared handler seam so both the picker and drops apply them (commit `0ec8914`). **Open** — see the table below: `tooltip` close-delay and floating offset; `popover` offset; `accordion`/`collapse` animation duration; `scroll-area` fade delay; `chat-message` hardcoded author labels.

**E. Missing callbacks for observable state transitions (Low–Medium). ◯ OPEN.** State changes a consumer cannot hook for analytics, undo/redo, or drill-down. None resolved this pass — see the table below.

---

## Open findings

### D — hardcoded literals

| Component | Location | Hardcoded | Suggested prop |
|---|---|---|---|
| tooltip | `tooltip/use-tooltip-state.ts` | close delay `close: 100` (open `delay` is a prop, close isn't) | `closeDelay?: number` |
| tooltip / popover | `tooltip/use-tooltip-state.ts`, `popover/popover.tsx:47` | floating `offset: 8` | `offset?: number` |
| accordion | `accordion/accordion-panel.tsx` | expand/collapse `duration: 0.2` | `animationDuration?: number` |
| collapse | `recipes/kiso/ugoki/collapse.ts` | `0.2s` fade/slide | `animationDuration?: number` |
| scroll-area | `scroll-area/scroll-area-constants.ts` | `SCROLL_FADE_DELAY_MS = 800` | `fadeDelayMs?: number` |
| chat-message | `chat-message/chat-message.tsx` | literal `"You said"` / `"Assistant said"` / `"System"` author labels — no override, no i18n | `authorLabel?: string` or a label map |

### E — missing callbacks

| Component | Location | Gap |
|---|---|---|
| data-table | `data-table/data-table.tsx` | no `onRowClick`; row interaction is checkbox-selection only |
| kanban | `kanban/kanban.tsx` | only `onValueChange(next: C[])` (the whole rebuilt array); no granular `onCardMove(card, from, to)` |
| editable-grid | `editable-grid/editable-grid.tsx` | only the `onValueChange` commit; no begin/cancel edit-lifecycle callbacks |
| tree | `tree/tree.tsx` | `defaultOpen` lives only on `TreeItem`; no root `defaultExpanded`, no `onItemClick` distinct from toggle |
| query-builder | `query-builder/query-builder.tsx` | structural mutations surface only as `onValueChange`; no per-rule add/remove hooks |
| alert / banner / toast | `alert/alert.tsx` | severity `icon` is overridable but the close-button glyph is a hardcoded lucide `X`; add `closeIcon?: ReactElement` (banner/toast inherit) |

---

## Excluded

Recording a gap only after confirming the prop was actually absent removed several false positives — props the sweep initially flagged but which already exist:

- `pivot-table` already has `format` and `totalLabel`; `odometer` already has `duration`; `search-input` accepts and forwards `onChange`; `breadcrumb` separators are overridable via `children`; `confirm` has configurable `confirm`/`cancel` labels; `hold-button`/`copy-button`/`tooltip` already expose their timing props; `tabs` already has `value`/`defaultValue`/`onValueChange`/`orientation`.
- `onFocus`/`onBlur` "not documented" on checkbox/radio/switch/number-input/etc. — these already pass through via `...props` to the native input; that is a docs nit, not a missing prop.
- `confirm`'s missing `onCancel` is real but weak: `onOpenChange(false)` already lets a consumer detect dismissal.
- The pure layout primitives (`box`, `flex`, `grid`, `stack`, `container`, `divider`, `spacer`, `aspect-ratio`, `frame`, `card`, `group`) are intentionally minimal and were not pressed for props.
