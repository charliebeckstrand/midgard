# `packages/ui` Accessibility Audit

**Standard:** WCAG 2.1 AA · **Date:** 2026-06-04 · **Scope:** all 103 components plus the shared foundation (hooks, primitives, providers, recipe/token layer).

## Method & caveats

Source-level audit: components were read for ARIA roles/states, keyboard handling, focus management, label wiring, and live-region usage, measured against WCAG 2.1 AA and the WAI-ARIA Authoring Practices. This is a static review — it does **not** substitute for testing with VoiceOver/NVDA/JAWS, a keyboard-only pass, or a contrast checker against resolved theme tokens.

Two dimensions are flagged but not conclusively verifiable from source and need runtime confirmation:
- **Contrast (1.4.3, 1.4.11):** ratios were estimated from Tailwind palette steps in `recipes/kiso`. Estimates below are directional; confirm against the deployed light/dark palettes.
- **Touch-target geometry (2.5.5):** computed sizes were read from recipes; confirm with rendered `getBoundingClientRect`.

No code was changed. Findings cite `file:line` for triage.

## Headline

The package has genuine a11y infrastructure — `useRoving`, `useDismissable`/`useScrollLock`, `FloatingFocusManager`-based focus trap + restore, a `panel` a11y scope, `reduced-motion`/`touch-target` primitives, and `getByRole`-driven tests in 31 files. Focus trapping, focus restoration, scroll-lock reference-counting, and modal inertness are **correct**. But coverage is uneven, and several **shared-foundation defects propagate to dozens of components**, which is where remediation pays off most.

The single most consequential finding: the **`TouchTarget` primitive does not work**. Its expansion span is `pointer-events-none` (`primitives/touch-target/touch-target.tsx:12`), so it adds visual area but cannot receive pointer events — the real hit target stays at the element's natural size. Every component that "uses TouchTarget" (Button, nav items, bottom-nav, toggle-icon-button, signature Clear, etc.) is therefore **not** 2.5.5-compliant on coarse pointers, contrary to what the primitive advertises.

There is also **no automated a11y gate**: no `jest-axe`/`axe-core`, and CONVENTIONS.md/REFERENCE.md state no accessibility authoring requirement. A11y is implicit, which is why the gaps below are inconsistent rather than uniform.

---

## Cross-cutting systemic issues (fix these first — highest leverage)

| # | Theme | WCAG | Where it propagates | Fix locus |
|---|-------|------|---------------------|-----------|
| S1 | **`TouchTarget` is inert** — `pointer-events-none` expansion never enlarges the hit area | 2.5.5 | Button, nav-item, bottom-nav-item, toggle-icon-button, copy/hold buttons, every icon-only control | `primitives/touch-target/touch-target.tsx:12` — apply `min-h/min-w` to the host, or make the expansion `pointer-events-auto` and route activation to it |
| S2 | **`Icon` hardcodes `aria-hidden="true"`** with no label escape hatch; overrides any name on the SVG | 1.1.1, 4.1.2 | Every meaningful standalone icon library-wide | `components/icon/icon.tsx:34` — add `label`/`aria-label` prop → `role="img"` + label |
| S3 | **No live-region contract** for state changes: copy success, hold completion, form submit, toast urgency, month nav, file selection, tag add/remove, signature capture, streaming chat, filter counts, command-palette result counts | 4.1.2, 4.1.3, 1.3.1 | copy-button, hold-button, form, toast, date-picker, calendar, file-upload, tag-input, signature-pad, chat-message, filters, command-palette | Introduce a shared `useAnnounce()` / polite+assertive live-region utility; wire per component |
| S4 | **`disabled` used for transient states** (loading, copied) removes the control from tab order and can suppress `aria-busy` | 4.1.2 | button (loading), submit-button, copy-button, pagination prev/next, calendar disabled days | Use `aria-disabled` + `onClick` guard for recoverable states; reserve native `disabled` for permanently inert controls |
| S5 | **Toggle controls below 44px with no working expansion** — checkbox 16–20px, radio 16–20px, switch 20–28px tall, range thumbs 12–20px | 2.5.5 | checkbox, radio, switch, slider/range | Compounds with S1; add a real touch target |
| S6 | **`useRoving` virtual mode sets no `aria-activedescendant`** (and no typeahead) | 4.1.2, 2.1.1 | command-palette, listbox/combobox where virtual mode is used | `hooks/use-roving.ts:107–195` — write `aria-activedescendant` on the owner; require stable item `id`s |
| S7 | **`role="listbox"` surfaces lack an accessible name**, and `multiple` never sets `aria-multiselectable` | 4.1.2 | listbox, combobox, select, calendar picker grid, pdf page list | Thread the trigger/field label via `aria-labelledby`; set `aria-multiselectable={multiple}` |
| S8 | **Virtualization drops size semantics** — no `aria-rowcount`/`aria-rowindex` (tables) or `aria-setsize`/`aria-posinset` (trees); AT sees only the window | 1.3.1, 4.1.2 | data-table, editable-grid, pivot-table, json-tree, tree | Set count/index attrs from the full dataset on the windowed rows |
| S9 | **Reduced motion bypassed** by imperative/raw-CSS animation outside the `ReducedMotion`/`MotionConfig` tree | 2.3.3 | odometer (`use-odometer-animated-value.ts:37`), hold-button (`use-hold-button-gesture.ts:31`), unconditional `transition-*` in `recipes/kiso/ugoki/css.ts` | `matchMedia('(prefers-reduced-motion: reduce)')` short-circuit; `motion-safe:` prefix on CSS transitions |
| S10 | **Drag-and-drop is silent to AT** — no dnd-kit `accessibility.announcements`, no `KeyboardSensor` announcer, no live region | 4.1.2 | kanban, list | Provide `announcements` on `DndContext`; add live-region narration |
| S11 | **Color-only meaning** with no text/shape/icon fallback | 1.4.1 | status(-dot), badge, stat-delta, timeline marker, avatar status, alert without `severity` | Add visually-hidden text or icon/shape per state |
| S12 | **`aria-label` / `id` optional → ARIA silently absent.** Optional `id` breaks `aria-controls`/`aria-labelledby` (tabs); hardcoded `aria-label` *overrides* a `<Field>` label (tag-input); unnamed dialogs allowed | 4.1.2, 1.3.1 | tabs, tag-input, toolbar, segment, kanban column, dialog/drawer/sheet, resizable | Auto-generate id pairs via `useId`; require name at the type level; never override Control-context labels |
| S13 | **`PanelTrigger` omits disclosure ARIA** — no `aria-haspopup`/`aria-expanded` (PopoverTrigger does it right) | 4.1.2 | dialog, drawer, sheet | `primitives/panel/panel-trigger.tsx` — mirror `popover-trigger.tsx:84` |
| S14 | **Token contrast shortfalls** (estimated; verify at runtime) — `muted` text `zinc-500`≈3.9:1, placeholder `zinc-500`≈3.9:1, default control ring `zinc-950/10`≈1.7:1, dark zinc button text `zinc-400`≈3.8:1 | 1.4.3, 1.4.11 | accordion/tab/table-header/description/stat text everywhere; every `ControlFrame` border | `recipes/kiso/iro/intent.ts`, `…/control/reset.ts`, `…/sen/tone.ts`, `…/iro/text.ts` |
| S15 | **Incorrect widget roles** — `role="menubar"`/`menuitem` on plain nav (nav, nav-list, bottom-nav); `role="toolbar"` on stepper; `role="application"` wrapping context menu | 4.1.2 | nav family, stepper, menu | Use list/`navigation` semantics; remove `application`; use list/tablist for stepper |

---

## Critical findings (block assistive-tech users)

| Component | WCAG | file:line | Issue |
|-----------|------|-----------|-------|
| icon | 1.1.1 | `icon/icon.tsx:34` | `aria-hidden="true"` hardcoded; no way to expose a meaningful icon's name |
| scroll-area | 2.1.1 | `scroll-area/scroll-area.tsx:52` | Native scrollbar hidden, viewport has no `tabIndex`/`role` → keyboard users cannot scroll the region |
| signature-pad | 2.1.1, 1.1.1 | `signature-pad/signature-pad.tsx:69` | Canvas has no `tabIndex`, no keyboard handlers, no typed-name fallback → total keyboard lockout and no text alternative |
| map | 1.1.1, 2.1.1 | `map/map.tsx:53`, `map/use-map-instance.ts:70`, `map-marker.tsx:55` | Map container not focusable, no text alternative; markers are imperative `div`s (no role/keyboard); routes respond to pointer only |
| calendar | 1.3.1 | `calendar/calendar-grid.tsx:52`, `calendar-picker-grid.tsx:74` | Day grid + month/year picker use `role="listbox"` instead of `role="grid"`; picker has `<Button>` children inside a listbox with no `role="option"`/`aria-selected` and no accessible name |
| calendar | 2.1.1 | `calendar/use-calendar-focus.ts:51` | Roving moves DOM focus but never sets `tabIndex=-1` on inactive cells → every day is a separate Tab stop |
| date-picker | 4.1.2 | `date-picker/date-picker-content.tsx:54` | Range picker dialog uses a static "Choose date" label; no `aria-live` month announcement; no PageUp/PageDown month nav |
| command-palette | 4.1.2 | `command-palette/use-command-palette-state.ts:27`, `command-palette-item.tsx:55` | Virtual roving sets no `aria-activedescendant`; options have no `id` → active result invisible to AT |
| data-table | 1.3.1, 4.1.2 | `data-table-virtualized-body.tsx:48`, `data-table-head.tsx:84` | Virtualized rows lack `aria-rowcount`/`aria-rowindex`; sortable headers lack `aria-sort` |
| editable-grid | 1.3.1 | `editable-grid/editable-grid.tsx:171` | `role="grid"` but non-editable `<td>`s lack `role="gridcell"`; no `aria-rowcount`/index when virtualized; grid unnamed |
| pivot-table | 1.3.1 | `pivot-table/pivot-table.tsx:97` | Row-dimension and totals labels are `<td>` not `<th scope="row">` |
| json-tree | 1.3.1, 4.1.2 | `json-tree-virtualized.tsx:74`, `json-tree-branch-header.tsx:39` | Virtualized tree has no `aria-setsize`/`aria-posinset`; hardcoded `tabIndex` fights `useRoving` |
| kanban | 4.1.2 | `kanban/kanban.tsx:85` | No dnd-kit `accessibility.announcements`/`KeyboardSensor` and no live region → drag is silent |
| list | 4.1.2 | `list/list-handle.tsx:16` | Drag handle `aria-hidden`; no keyboard-drag instructions exposed |
| listbox | 4.1.2 | `listbox/listbox-panel.tsx:55`, `listbox-button.tsx:54` | Panel unnamed; `multiple` never sets `aria-multiselectable`; combobox-role trigger lacks `aria-activedescendant` |
| combobox | 4.1.2, 3.3.1 | `combobox/combobox.tsx:116,124` | Reads `useControl()` but forwards only `disabled` — `invalid`/`describedBy` dropped, so error state and description never reach AT (also affects address-input) |
| tooltip | 1.3.1 | `tooltip/tooltip-trigger.tsx:13` | Trigger is a non-focusable `<div>`; `aria-describedby` lands on the wrapper, not the focused child → keyboard/AT users get no tooltip |
| toast | 1.3.1 | `toast/toast-alert.tsx:77` | `severity` not forwarded to `Alert` → no per-toast `role="alert"`; all toasts (including errors) announced politely |
| odometer | 4.1.3 | `odometer/odometer.tsx:30` | `aria-live="polite"` on the element fires every animation frame → screen-reader flood; final value never cleanly announced |
| status | 1.1.1, 1.4.1 | `status/status-dot.tsx:18` | Bare `<span>`, no role/label/`aria-hidden`; state conveyed by color alone |
| submit-button / button | 4.1.2 | `button/button.tsx:160`, `submit-button.tsx:22` | Loading sets native `disabled` → drops from tab order, can suppress `aria-busy`; spinner label concatenates onto button name |
| copy-button | 4.1.2 | `copy-button/copy-button.tsx:51` | `disabled={copied}` removes from tab order during timeout; label flip to "Copied" not announced (no live region) |
| password-confirm | 3.3.1 | `password-confirm/password-confirm-input.tsx:23` | Mismatch shows only a CSS `data-warning` ring; no `aria-invalid`/`aria-describedby` to the warning region |
| tag-input | 4.1.2 | `tag-input/tag-input.tsx:117` | Hardcoded `aria-label` overrides the `<Field>` label; no live region for add/remove (Backspace removal silent) |
| file-upload | 4.1.2, 3.3.2 | `file-upload/file-upload.tsx:56,126` | No `aria-live` for selection; area `<button>` has no default `aria-label` fallback |
| chat-message | 1.3.1 | `chat-message/chat-message.tsx:25` | No message/`log` semantics; streaming text has no live region |
| chat-prompt | 3.3.2 | `chat-prompt/chat-prompt.tsx:61` | Textarea rendered with placeholder only — no label/`aria-label` |
| accordion | 1.3.1 | `accordion/accordion-trigger.tsx:18` | Trigger `<button>` not wrapped in a heading → items absent from the heading outline |
| tabs (recipe) | 2.4.7 | `recipes/kata/tabs.ts:38` | Active-indicator and focus-indicator share the `::after` slot → the **current** tab shows no visible focus ring when focused |
| accordion (recipe) | 2.4.7 | `recipes/kata/accordion.ts:51` | Trigger `outline-none`; focus ring delegated to parent `has-[:focus-visible]` only — disappears if the item wrapper is overridden |

## Major findings (significant barriers)

Selected; full per-component detail in the appendix tables below.

- **panel-trigger** (`primitives/panel/panel-trigger.tsx:14`) — Dialog/Drawer/Sheet triggers get no `aria-haspopup="dialog"`/`aria-expanded` (S13).
- **dialog / drawer / sheet** — no enforcement of a title or `aria-label`; a titleless modal has `role="dialog" aria-modal` but no name. Drawer also lacks `initialFocus` (Dialog/Sheet have it).
- **confirm** (`confirm/confirm.tsx:47`) — should be `role="alertdialog"`, not `dialog`.
- **popover** (`popover-content.tsx:77`) — trigger promises `aria-haspopup="dialog"` but content only gets `role="dialog"` when a label is present; `autoFocus` defaults off so focus never enters; no `FloatingFocusManager` → Tab can leak out.
- **banner** (`banner/banner.tsx:10`) — renders as plain `<div>`; no landmark (`role="region"`+name) for a page-level announcement bar.
- **toast** — no `onFocus`/`onBlur` pause (keyboard users' toasts auto-dismiss mid-interaction); 5s default may be too short; no Esc-to-dismiss.
- **nav / nav-list / bottom-nav** (`nav/nav-list.tsx:33`, `nav.tsx:19`, `bottom-nav.tsx:8`) — `role="menubar"`/`menuitem` misuse on plain navigation; `<Nav>` emits no `aria-label`; roving `:disabled` selector misses `aria-disabled` link items (S15).
- **stepper** (`stepper/stepper.tsx:83`) — `role="toolbar"` misrepresents the widget; completed vs upcoming state not exposed; panels carry no `role`/name.
- **breadcrumb** (`breadcrumb-item.tsx:11`, `breadcrumb-link.tsx:29`) — `aria-current` on the `<li>` (and a linked current page never gets it); roving selector excludes the current-page span.
- **menu** (`menu-content.tsx:27`, `menu.tsx:35`) — open menu can leave focus on the panel container, not the first item; context-menu `role="application"` suppresses reading mode; disabled link items are focusable spans with no native activation.
- **tabs** (`tab.tsx:55,62`, `tab-panel.tsx:19`) — wrapping `<span>` breaks tablist→tab ownership; `aria-controls`/`aria-labelledby` only set when consumer passes `id`.
- **toolbar** (`toolbar/toolbar.tsx:19`) — `role="toolbar"` accepts optional name → unnamed toolbar.
- **query-builder** — Field/Operator/Value selects unlabelled (placeholder-only); nested groups lack `fieldset`/`legend`; generic combinator labels.
- **tree** (`tree-item-content.tsx:91`) — `aria-level` without `aria-setsize`/`aria-posinset`; ArrowRight/Left don't move focus per APG.
- **checkbox / radio / switch** — below 44px (S5); checkbox no `aria-checked="mixed"` for indeterminate; CheckboxGroup no `role="group"`/name.
- **slider/range** (`range-slider.tsx:88`, `use-range-keyboard.ts:24`) — no PageUp/PageDown; container unnamed; thumbs below 44px; no `aria-valuetext`.
- **avatar** (`avatar.tsx:54,71`, `avatar-group.tsx:22`) — `alt=""` default silently drops meaningful avatars; overflow "+N" unlabelled; status dot color-only.
- **credit-card-input** (`credit-card-input.tsx:59`) — detected brand status text not associated via `aria-describedby`.
- **resizable** (`resizable-handle.tsx:60`) — identical `aria-label="Resize"` on every handle; panels not linked via `aria-controls`.
- **pdf-viewer** — viewport not focusable (no keyboard scroll); page changes not announced; thumbnails `aria-expanded` without `aria-controls`.
- **glass / card** — translucent surfaces give no static contrast guarantee for content (1.4.11); treat as a token/design audit item.

## Focus-indicator findings (recipe layer)

`recipes/kata` defines `outline-none` with delegated focus styling in several places where the replacement is fragile or color-only — confirm each renders a perceptible ≥3:1 indicator: `tabs.ts:38` (current tab loses ring — Critical), `accordion.ts:51`, `json-tree.ts:35,41` (background-tint only), `stepper.ts:21`, `resizable.ts:10` (grip color only), `pdf-viewer.ts:59`. `button.tsx`/`sen/focus.ts` apply `ring-inset` without a `focus-visible:` guard on the modifier — verify it doesn't leak into unfocused states.

## Process gap

No `jest-axe`/`axe-core` in the dependency set and no a11y assertions beyond `getByRole`; CONVENTIONS.md and REFERENCE.md state no accessibility authoring bar. Recommend: (1) add `jest-axe` smoke tests to the existing `renderUI()` harness, (2) add an a11y clause to CONVENTIONS (required accessible name on widget roles, no color-only meaning, touch-target rule, live-region rule), and (3) a boundary-style test forbidding `disabled` on transient-state controls and `role="menubar"` outside a real menu bar.

---

## Suggested remediation order

1. **Foundation (one change → many components):** S1 TouchTarget, S2 Icon label, S6 `useRoving` activedescendant, S9 reduced-motion, S14 token contrast, S13 PanelTrigger. Fixing these clears the bulk of 2.5.5, 1.1.1, 2.3.3, and a swath of 4.1.2.
2. **Critical per-component blockers:** scroll-area, signature-pad, calendar grid roles, command-palette, combobox Control wiring, tooltip trigger, toast severity, odometer live region.
3. **Systemic patterns:** S3 live regions, S4 `disabled`→`aria-disabled`, S7 listbox naming, S8 virtualization counts, S10 DnD announcements, S11 color-only meaning, S15 incorrect roles.
4. **Majors and focus-indicator recipe fixes.**
5. **Process:** add `jest-axe` gate + CONVENTIONS clause so regressions are caught automatically.

*Generated from a 10-way parallel source sweep; per-group detail (every Minor finding with file:line) is available on request.*
