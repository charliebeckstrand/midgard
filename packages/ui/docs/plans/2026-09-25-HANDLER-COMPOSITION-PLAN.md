# Handler Composition — Design Plan — 2026-09-25

What moving the package's hand-composed event handlers onto `composeEventHandlers` costs, which option each site takes, and why §3.9's two exceptions do not cover the sites where the default would break a component. The swap is mechanical. The option at each site is the whole decision.

## Thesis

A component that sets an event handler the consumer can also pass must compose the two ([`CONVENTIONS.md`](../../../../CONVENTIONS.md) §3.9). `composeEventHandlers` (`core/compose-event-handlers.ts`) fixes two properties. The consumer's handler runs first. A consumer `preventDefault()` skips the component's handler, unless the component passes `{ checkForDefaultPrevented: false }`.

A hand-composed handler gets both properties wrong. It is an inline arrow that runs the component's logic and then calls the consumer's handler itself. The component runs first, and a consumer `preventDefault()` cancels nothing. So each site behaves like `false` in the wrong order, and nothing gates the rule. §3.9 says so: "The composed-key rule is not gated yet".

React's synthetic `preventDefault()` sets `defaultPrevented` on every event, cancellable or not. A consumer that calls it on `blur`, `scroll`, or `pointerleave` therefore skips a default-composed handler, even though the browser ignores the call. That is why the option matters on events that look harmless.

## Current state (verified in tree, 2026-09-25)

`composeEventHandlers` with `checkForDefaultPrevented: false` appears at six sites, which record the current reading of the two exceptions:

- **The activation a component exists to perform:** `menu-item-utilities.ts` (click, Enter or Space selects, Space on a link row), `panel-trigger.tsx` (opens Dialog, Sheet, Drawer), and `panel-close.tsx`.
- **A roving keyboard model:** `tab-list.tsx`.

The default is used for side behaviour: `overlay.tsx`, the Enter handler of `currency-input.tsx`, `date-input.tsx`, and two sites in `menu-item.tsx`. `toggle-icon-button.tsx` is the one outlier: it gates its own toggle, which is its activation.

**22 hand-composed JSX handlers in 16 files.** Each is a DOM event prop whose inline arrow passes its own event to the consumer handler of the same name. The pattern in increment 5 finds exactly these.

**14 lookalikes that are not §3.9.** They are value-callback adapters with no event to cancel, for example `onValueChange={(next) => onValueChange(next ?? '')}` and `onRemove={() => onRemove(tile)}`. They are in `calendar-range`, `color-channel-inputs`, `json-tree-node-row`, `pdf-viewer-magnifier-settings`, `toast-alert`, `dashboard-tiles` (2), `grid-row-manager`, `map-legend`, and `query-builder-rule-value` (5). The gate must not flag them.

**Handlers out of the pattern's reach.** A plugin cannot see these, so this plan reviews them once:

- **Hand-composed in a named handler:** `tab.tsx` (`handleClick`, `handlePointerEnter`, `handleFocus`), `number-input.tsx` (`handleBlur`), `search-input.tsx` (`handleChange`), `use-form-text.ts` (`onChange`, `onBlur`), and `use-form-toggle.ts`.
- **Hand-composed under another name:** the panel `onKeyDown` of `popover.tsx` calls the consumer's handler as `onKeyDownProp`.
- **Already correct:** `copy-button.tsx`, `command-palette-item.tsx`, and the paste handler of `use-combobox-input.ts`.
- **Not composition:** the `onBlur` of `listbox.tsx` fires only when focus leaves the whole widget, and `onPointer` in `grid-column-resize-handle.tsx` is an internal engine callback.

## The rule

On the date of this plan, §3.9 allows `false` for two cases. The sweep finds a third kind of site, and the default breaks it:

- **Form binding.** Nine blur handlers mark their field touched. A `Form` validates on `'touched'` by default (`form.tsx`), and the touched mark runs the first check. So a consumer `preventDefault()` in `onBlur` would silently turn off validation for that field. The bound path of plain `Input` (`use-form-text.ts`) always marks the field touched, so the two would also disagree.
- **The end of a gesture.** HoldButton starts a timer on press and cancels it on release. Only the timer completes a hold. If a consumer can skip the cancel, the timer fires `onHoldComplete` after the user let go. That is the irreversible action the component exists to gate.
- **State that tracks the DOM.** ScrollArea re-measures its thumb on `scroll`, which the browser cannot cancel. PasswordConfirm hands each keystroke to its mismatch coordinator. If a consumer skips either, the component shows stale state.

**Proposal:** name a third case in §3.9. Pass `checkForDefaultPrevented: false` for the activation a component exists to perform, for a roving keyboard model, and for the wiring that keeps the component's own state true. That wiring is a form field's touched mark and value, the end of a gesture the component started, and state that tracks an event the browser cannot cancel. Side behaviour keeps the default: a preload, a pause on hover, a verdict, a reformat.

Two alternatives were weighed. Reading all of this as "activation" stretches the word until the exception covers everything. Keeping the default everywhere breaks HoldButton and form validation. Each converted site still moves the consumer's handler first, so the order is uniform across the package.

## Decisions per site

| Site | The component's logic | Option | Case | Visible change |
|---|---|---|---|---|
| `hold-button` `onPointerDown`, `onKeyDown` | starts the hold | default | — | a consumer `preventDefault()` now stops a hold from starting |
| `hold-button` `onPointerUp`, `onPointerCancel`, `onPointerLeave`, `onKeyUp`, `onBlur` | cancels the hold | `false` | 3 | the consumer runs before `onHoldCancel` |
| `accordion-trigger`, `collapse-trigger` `onClick` | toggles | `false` | 1 | the consumer's `onClick` runs before `onValueChange` / `onOpenChange` |
| `tab.tsx` `handleClick` | selects | `false` | 1 | none: it already runs the consumer first and ignores a cancel |
| `tab.tsx` `handlePointerEnter`, `handleFocus` | preloads | default | — | a consumer `preventDefault()` now skips the preload |
| `sidebar` `onKeyDown`, `popover` panel `onKeyDown` | roving | `false` | 2 | the consumer sees an arrow key before roving moves focus, with `defaultPrevented` still `false` |
| `scroll-area` `onScroll` | thumb sync, auto-hide | `false` | 3 | none a user can see: the thumb update waits for a frame |
| `shiny-text` `onMouseEnter`, `onMouseLeave` | `pauseOnHover` | default | — | a consumer `preventDefault()` now skips the pause. Preventing only the leave keeps the sweep paused |
| `credit-card-input` (3), `mask-input`, `search-input`, `slider` `onBlur` | touched mark | `false` | 3 | the consumer runs first |
| `currency-input`, `date-input` `onBlur`; `number-input` `handleBlur` | commit, reformat, touched mark | `false` | 3 | the consumer's `onBlur` now fires before the `onValueChange` / `onValidityChange` that the commit makes |
| `search-input` `handleChange`, `use-form-text`, `use-form-toggle` | value sync, binding | `false` | 3 | the consumer runs first |
| `password-confirm-input` `onChange` | hands the value to the coordinator | `false` | 3 | the consumer runs first. The TSDoc contract "runs after the coordinator records the value" changes |

`credit-card-input-expiry` also sets a partial-entry verdict on blur. It can stay skippable: compose with `false`, and skip only the verdict when `event.defaultPrevented`. The table keeps the simpler reading, one option for the whole handler.

## Increments

Each increment is one pull request. Its proof is its own suites, plus new tests that pin the order and the option.

1. **The rule.** Land this plan and the §3.9 amendment. No code changes.

2. **HoldButton — done.** Seven sites. Hoist one options constant for the five end sites, with one comment that cites §3.9, and pass `cancel` as the component's handler where it fits. No helper: HoldButton has no second user (CLAUDE.md §1.1). Tests: the consumer's handler runs before `onHoldStart` and `onHoldCancel`. A `preventDefault()` on press stops the start. An `it.each` over the five end sites proves that the hold still cancels, and that `onHoldComplete` never fires after `duration`. A keyup or blur with `preventDefault()`, then an Enter hold, still cancels on the Enter release.

   The count of hand-composed JSX handlers fell from 22 to 15. The end sites share one options constant, `alwaysEnd`. Ten new tests pin the change. The order test and the two tests that prevent a start failed before it. The seven tests that prevent an end passed before it, and each fails when the end sites take the default.

3. **Form-bound inputs — done.** Fourteen sites: the `onBlur` of the three credit-card fields, `mask-input`, `search-input`, `slider`, `currency-input`, `date-input`, and `number-input`, then `search-input`'s `handleChange`, the two form hooks, and `password-confirm-input`. Drop the comment in `number-input.tsx` that states the old order. Update the PasswordConfirm TSDoc and its `docs/COMPONENTS.md` entry in the same change (CLAUDE.md §3.5). Tests: a spy proves the consumer runs first, and a consumer `preventDefault()` still leaves the field touched (`data-touched` on a field probe). Currency and date also prove that `onBlur` fires before `onValueChange`. `slider` and `mask-input` need a basic touched-on-blur test, because none exists.

   The count of hand-composed JSX handlers fell from 15 to 6. The guarantee moved into two new columns of the capability sweep, because it holds for every control of the kind (CONVENTIONS §10.5). `touchOnBlur` holds 13 subjects: a caller `onBlur` that calls `preventDefault()` still runs, and the field is still touched. `writeOnChange` holds 5: Input, Textarea, SearchInput, Checkbox, and Switch still write the field. Both columns passed before the change, and each subject fails when its site takes the default. Four teeth checks prove the two sweeps can fail. A PasswordConfirm test proves that the coordinator still records a prevented change.

   The order is visible in one place only. DateInput refuses a partial entry inside its blur, and a test pins the caller's `onBlur` before that refusal. The blur commit of CurrencyInput repeats the parse of the last keystroke, so it emits no `onValueChange`, and it has no order to pin. Elsewhere the component's writes are batched state, which the caller cannot see either way. `docs/COMPONENTS.md` lists names only, so the TSDoc of PasswordConfirmInput, `useFormText`, and `useFormToggle` carries the new contract.

4. **Triggers, roving, and the rest — done.** `accordion-trigger`, `collapse-trigger`, `tab.tsx`, `sidebar`, the `popover` panel, `scroll-area`, and `shiny-text`. The same increment fixes the object-key half of §3.9 in two of these files. `ScrollArea` and `Sidebar` write their own `ref` before `{...props}`, and neither destructures `ref`. So a consumer's `ref` replaces the viewport ref, or the roving ref. Destructure `ref`, and merge the two with `useComposedRef` (`hooks/use-composed-ref.ts`). Tests follow the `calls` array of `menu.test.tsx`: accordion and collapse record `['consumer', 'change']` and still open, and an arrow key in the sidebar still moves focus. Rename the collapse test "forwards the user onClick after toggling", because the order it names changes.

   The count of hand-composed JSX handlers fell from 6 to 0. Eleven new tests pin the change. Nine failed before it. The other two, tab selection and the auto scrollbar under a prevented `onScroll`, pinned behaviour the change had to keep. Each of the six sites that take `false` fails its test when it takes the default. Both ref tests failed before the change: a consumer `ref` on `Sidebar` stopped roving, and one on `ScrollArea` stopped the thumb. The ScrollArea browser suites and every browser suite that renders a changed component pass in Chromium.

   The sweep found one site this plan missed. `cellProps` in `modules/grid/use-grid-navigation-columns.tsx` runs the grid cursor, and then the column's own `onMouseDown`. It is a named prop getter, so the gate pattern cannot see it. The cursor is a roving model, so the site takes `false`, with the column's handler first. Increment 5 carries it.

5. **The gate — done.** Add `no-hand-composed-handler.grit` once the count is zero. The pattern matches a JSX attribute with a DOM event name whose inline arrow passes its own event to the consumer handler of the same name:

   ```grit
   JsxAttribute(name = $name, initializer = $init) where {
   	$name <: r"on(?:Click|DoubleClick|ContextMenu|KeyDown|KeyUp|Blur|Focus|Change|Input|Submit|Pointer[A-Z]\w*|Mouse[A-Z]\w*|Touch[A-Z]\w*|Drag\w*|Drop|Scroll|Wheel|Paste|Copy|Cut|Animation[A-Z]\w*|Transition[A-Z]\w*)",
   	$init <: contains JsArrowFunctionExpression(parameters = $params, body = $body),
   	$params <: contains JsIdentifierBinding() as $event,
   	$body <: contains or { `$name?.($event)`, `$name($event)` }
   }
   ```

   On the tree of this plan's date, it finds the 22 sites and none of the 14 adapters. Add its fixtures to `biome-plugin-boundary.test.ts`, and replace the "not gated yet" sentence in §3.9. The named handlers stay out of its reach. This plan is their review.

   The plugin shipped as `no-hand-composed-handler.grit`, with one change to the pattern above. It matches the arrow as the direct value of the attribute, where the pattern above searched each attribute for one. The search made `biome check .` take 9 s in place of 5 s. On the tree of this plan's date, the shipped pattern still finds the same 22 sites, and on the tree after increment 4 it finds none. Its reach is the `ui` and `shared` source. Its fixtures flag the two hand-composed forms, and pass a composed handler, a value-callback adapter, a call that passes something other than the event, and a comment.

   The grid site that increment 4 found is fixed in the same change. `seatingCellProps` now runs a column's own `onMouseDown` first, and its `preventDefault()` does not stop the seat. A grid test pins the order, and it failed before the change. The TSDoc of `GridColumn.cellProps` states the new order. §3.9 now names the plugin, and keeps the part of the composed-key rule it cannot see, an object key such as `ref` or `style`, as not gated yet.

## Out of scope

These came up in the sweep. A follow-up change fixed all four:

- `toggle-icon-button.tsx` gated its own toggle with the default, against the case-1 reading of the menu and panel precedents. The toggle now takes `false`. A test records `['consumer', 'pressed true']` under a consumer `preventDefault()`, and it fails when the site takes the default.
- `shiny-text.tsx` spread `(props as Omit<…>)`, so the spread-order gate never read the element. The props type now omits the four motion keys, so the element spreads `{...props}` with no cast. A `role` written before the spread now fails the gate. This fix replaced the `const rest = props as …` assignment that the sweep proposed, because the correct type removes the need for a cast.
- The props type of ShinyText accepted `onDrag`, `onDragStart`, `onDragEnd`, and `onAnimationStart`, but motion takes all four, and they never got to the DOM. The props type now omits them, and its TSDoc gives the reason.
- The `onChange` arrows of the three credit-card fields came before `{...props}`. Only the props type stopped an `onChange` passed through a cast from replacing the masking. The `onChange` and the `onBlur` of each field now come after the spread. An `it.each` gives each field a stray `onChange`, and each case failed before the change.

The follow-up found the same defect in one more file. `current-content.tsx` spreads `(props as HTMLMotionProps<'div'>)`, and its props type accepts the four motion keys. The spread-order scan still reads no spread behind a cast, and `button.tsx`, `button-headless.tsx`, and `polymorphic.tsx` also spread through one.
