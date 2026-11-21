# Form roadmap

> **Goal: a form that owns each failure of a submit, at the level of the form, of the field, and of an item in a field.** Today the form owns the issues of a field only, so each app keeps its own state for the other failures.

## Status

`ui/form` holds `Form` and its parts: `FormSubmit`, `FormReset`, and `FormErrorSummary`. It also holds the filter bar `FormFilters` and its parts, the schema adapter `zodResolver`, and the public hooks of the binding contract. The parts of the bar take the `FormFilters` prefix, and their anchors take the `form-filters` prefix.

The binding contract is in [`primitives/form`](../../primitives/form). It holds the store and the actions of a form, the slice hooks of a field and of the status, and the binding cascade. A component sits below a module, so the contract is a primitive with no entry point. The barrel of this module re-exports its public hooks. [`component-boundary.test.ts`](../../__tests__/boundary/component-boundary.test.ts) lets a module barrel re-export the internal primitive of its own name, and no other primitive.

`Form` and `FormFilters` are two providers of the one contract. `Form` holds a reducer with validation, touch, and a baseline. `FormFilters` holds a value record that drops empty slots, and has no validation. A control binds a field of either one by its `name` ([`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §7.2).

The submit flow is a set of small hooks over the engine. [`useFormReducer`](use-form-reducer.ts) holds the state and the field actions. [`useFormSubmission`](use-form-submission.ts) runs a submit, and [`useFormSync`](use-form-sync.ts) syncs the controlled `values` prop. [`useFormStore`](use-form-store.ts) publishes each committed state to the external store, so a keystroke renders only the field that changed. A monotonic token discards the result of a submit that a reset, an unmount, or a newer submit superseded.

A refused submit and a handler that returns a field issue each count as a failure. A thrown error is the terminal outcome `{ ok: false }`, and goes to `onSettled`. The provider gives the failure count and the reset count to the parts.

While a submit runs, the form locks its parts and disables nothing. `Form` renders `ControlLockContext`, a lock scope of Control that knows nothing about forms. The Control cascade reads the lock as `readOnly`, and each `Button` reads it as `aria-disabled` and stays in the tab order. A button that must stay live, such as Cancel, takes `lockable={false}`. The standard close buttons of `Dialog`, `Drawer`, `Sheet`, `Popover`, `CommandPalette`, and the Cancel of `Confirm` take it too. A link `Button` with an `href` is not locked.

The lock is React context, so it follows the component tree into a portal. A field in an overlay that opens from a `Form` locks with the form, because the field belongs to the form.

A native field reads no context, so [`useFormNativeLock`](use-form-native-lock.ts) locks it from the DOM. It records the state of each `<input>`, `<select>`, and `<textarea>` that the `<form>` owns. While the submit runs, it cancels each edit, or puts back the recorded state, and stops the event. A native field in a portal is outside the `<form>`, so it stays live.

The contract has its own `locked` flag. The setter of `useFormField` refuses a write while the form is locked, so a control with no read-only state cannot change its field. A write through the form actions still lands, because a write from the app must land. While the submit runs, the form also gives "Submitting" to the shared polite announcer.

A filter bar inside a form opens a lock scope with no lock, and it gives the contract with no lock. So its fields and its Clear stay live. It opens no target registry, so its fields stay out of the error summary of the form.

These checks hold the lock:

- The lock sweep in [`sweeps/capabilities.test.tsx`](../../__tests__/sweeps/capabilities.test.tsx) submits a form around each control of the corpus that writes its field, and expects no write.
- [`form-write-boundary.test.ts`](../../__tests__/boundary/form-write-boundary.test.ts) holds each part outside the module to the setter of `useFormField`, and lists each part that reads the form actions.
- [`form-submit-focus.test.tsx`](../../__tests__/browser/form-submit-focus.test.tsx) holds the focus of the submit button and of a field in Chromium.
- [`form-native-lock.test.tsx`](../../__tests__/browser/form-native-lock.test.tsx) holds the lock of each kind of native field in Chromium.

`Form` renders `ControlTargetsContext`, a registry of control ids by field name. Each bindable control registers its id there, and so does a form-bound `Message`. A field `Label` registers its text by the id of its control. The registry counts each registration, so the end of one does not remove the other. `FormErrorSummary` reads the registry. Each row links to the control of its field and names the field with the text of its label.

A row of a field with no registered control shows its issue as text.

## Engine

[`engine/`](engine) is the pure functional core of the module. It has no `'use client'`, no runtime `react` import, no `index` barrel, and no runtime import from the module root. [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds these rules, and [`module-filename-boundary.test.ts`](../../__tests__/boundary/module-filename-boundary.test.ts) holds the `form-*` file names.

The engine holds the vocabulary ([`types.ts`](engine/types.ts)), the validators ([`form-validate.ts`](engine/form-validate.ts)), the dirty flags ([`form-dirty.ts`](engine/form-dirty.ts)), and the reducer ([`form-reducer.ts`](engine/form-reducer.ts)). It also holds the steps of a submit ([`form-submission.ts`](engine/form-submission.ts)), the store ([`form-store.ts`](engine/form-store.ts)), and the schema adapter ([`form-zod-resolver.ts`](engine/form-zod-resolver.ts)). The filter bar reads [`form-filters.ts`](engine/form-filters.ts) and [`form-filters-axis.ts`](engine/form-filters-axis.ts), and the error summary reads [`form-error-summary.ts`](engine/form-error-summary.ts).

The engine reads `hasIssues` from the binding contract, because a control and the engine use the same definition of an invalid field. A new domain concept of the form goes into the engine first, with a unit test, and the hooks of the shell call it.

## Features

1. **Form-level issue (*P1*).** The form has no slot for an issue that is not about one field, so each app keeps its own. `useServerError` in `packages/shared/src/auth/use-server-error.tsx` holds the issue of each auth page. The `failure` state of `apps/places/src/components/place-form-drawer/form-drawer.tsx` and of `apps/picks/src/components/prediction-sheet/prediction-sheet.tsx` holds a refused write. `zodResolver` drops each issue with `path: []`. Peers have the slot: react-hook-form has `errors.root`, and TanStack Form has form-level validators.

   Add a `formIssue` slot to `FormStateValue`. Then add `helpers.setFormIssue` and a `formIssue` key on `SubmitResult`, which counts as a failure as a field issue does. `zodResolver` writes the `path: []` issues there. A reset and the next submit clear it.

   `FormErrorSummary` shows it as the first row, with no link, and a public hook gives it to an app that places its own `Alert`. Prove it in `form-submission.test.ts`, `form-zod-resolver.test.ts`, and `form-error-summary.test.tsx`, and add a docs example on the server-errors page.

2. **Focus the first invalid field on a refused submit (*P1*).** With no `FormErrorSummary` in the form, a refused submit leaves the focus on the submit button. The sign-in, register, and reset-password pages in `packages/shared/src/auth` have no summary, and no app uses `onInvalidSubmit`. react-hook-form (`shouldFocusError`) and React Aria `Form` move the focus to the first invalid field by default.

   In the refused branch of `useFormSubmission`, focus the control that the target registry gives for the first invalid field. Skip the move when a summary is mounted, because the summary takes the focus. An `onInvalidSubmit` that moves the focus still wins. Move `focusControl` out of `form-error-summary.tsx`, so the summary and the form use one copy. Prove it in `form.test.tsx`, and in `form-submit-focus.test.tsx` for Chromium.

3. **Issues of an item in an array field (*P3*).** A field that holds a list of rows has one issue for the whole list. `stopIssue` in `apps/places/src/components/place-form-drawer/trip-form.ts` folds the issue of each row into one message, with a "Place N" prefix. The control of the row gets no `aria-invalid`, and the summary links to the list. react-hook-form (`useFieldArray`) and TanStack Form give an issue to each item by path. `zodResolver` keeps only `path[0]`.

   Open questions: whether `Errors` takes a path key such as `stops.0.day`, and whether `useFormField` binds a value by path or reads the issue only. Answer them in a plan before code.

## Pattern cleanup

1. **Native base for the parts of the filter bar (*P2*).** `FormFiltersBarProps`, `FormFiltersRowProps`, `FormFiltersFieldProps`, and `FormFiltersClearProps` take only `children` and `className`. Each part renders an element through `Flex`, `Field`, or `Button`, so a consumer cannot pass an `id`, an `aria-*`, a `data-*`, or a `ref`. That is drift from [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §4.3.

   Give the bar, the row, and the field the `ComponentProps<'div'>` base, and compose the scroll ref of the row with the consumer ref (§3.9). Clear renders a `Button` or clones its child, so it takes the base of a button only on the fallback arm. [`props-base-boundary.test.ts`](../../__tests__/boundary/props-base-boundary.test.ts) misses these parts, because its checker counts only a lowercase JSX tag. A change to the checker that follows a component tag is a separate item.

2. **TSDoc in STE (*P2*).** Some TSDoc of the module is in the older voice, which [`CLAUDE.md`](../../../../../CLAUDE.md) §2.5 does not allow. Examples are the arrow in `FormProps.values` and the noun clusters in `FormProps.defaultValues` (`form.tsx`). Also see `useFormStore` (`use-form-store.ts`), `zodResolver` (`engine/form-zod-resolver.ts`), and the root TSDoc of `FormFilters` (`form-filters/form-filters.tsx`). Rewrite each block in STE and keep its facts. `pnpm --filter ui ste:report` lists the long sentences, and review holds the rest, because no gate reads articles or noun clusters.

## Performance

1. **Keystroke bench (*P2*).** No bench measures the form. Under `validateOn: 'touched'`, each keystroke runs the validator of each touched field and gives a new error map, even when no issue changes. Each keystroke also derives the dirty flag of each field again by a deep compare. So `FormErrorSummary` and each reader of `useFormErrors` render again on each keystroke.

   Add a form bench to `src/__benchmarks__`. It must time a keystroke in a large form, under each `validateOn`, with and without `zodResolver` and a summary. Then keep the identity of an issue list and of the error map when no entry changes. Also derive only the dirty flag of the changed field. Land these two changes only when the bench shows a gain.

## Accessibility and testing

1. **Target sweep over the corpus (*P2*).** The tests of `FormErrorSummary` cover a small set of controls by hand. A new bindable control that registers no id, or an id that takes no focus, gives a row that does not move the focus. Add a sweep to `sweeps/capabilities.test.tsx`, beside the lock sweep, that uses the same corpus of controls that write their field. For each control, it refuses a submit, clicks the row, and expects the focus inside the control.

2. **Live regions on a refused submit (*P3*).** A form-bound error `Message` renders `role="alert"`. A refused submit shows each message at once, and the summary is an error `Alert` too. So a screen reader gets many assertive regions in one frame.

   The GOV.UK error summary pattern keeps the inline messages out of live regions when the focus moves to the summary. Open question: whether a `Message` in a `Form` drops `role="alert"` after a submit that moves the focus. That change is in `components/fieldset/message.tsx`, so it needs assent first. Test it in Chromium with the accessibility tree before you change the role.

## Not planned

- A disabled `<fieldset>` while a submit runs. Chromium moves the focus of a control that becomes disabled to the body, so the focused field or submit button loses the focus. The lock keeps each field and button enabled.

- Async field validators, as in TanStack Form `onChangeAsync`. No app needs one. A server check returns through a `{ fieldErrors }` return of `onSubmit`, and an async validator needs its own cancel and lock rules.

- React form actions and `useActionState`, as in Conform. No app uses a server action. The apps call bifrost from the client.

- A navigation guard for unsaved changes. The apps use Next.js, and the docs app uses React Router, so the guard belongs to each router. `useFormStatus().dirty` gives the flag that a guard reads.

- A `register` API with refs, as in react-hook-form. The `name` cascade of §7.2 is the one binding API ([`CONVENTIONS.md`](../../../../../CONVENTIONS.md) §3.12).

- Validation in a filter bar. A filter has no invalid value, so the bar is always valid and clean.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`docs/MODULES.md`](../../../docs/MODULES.md) · [`docs/PRIMITIVES.md`](../../../docs/PRIMITIVES.md) (the binding contract).
