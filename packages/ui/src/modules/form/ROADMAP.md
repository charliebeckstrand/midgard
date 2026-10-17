# Form roadmap

> **Goal: a form module with a pure engine for the form domain, a `Form` and a filter bar as two views over it, and small parts that act on the state of the form.** The bindable controls read the form through an internal contract below the components, so no component imports the module. This file tracks the module one measured piece at a time.

## Status

`Form` and `Filters` were components. `Form` is now the root of this module, and `Filters` is its filter bar, `FormFilters`. The parts of the bar take the `FormFilters` prefix: `FormFiltersBar`, `FormFiltersRow`, `FormFiltersField`, `FormFiltersClear`, `FormFiltersPrefix`, `FormFiltersSuffix`, and `FormFiltersSkeleton`. Their anchors take the `form-filters` prefix, so the bar no longer shares the `filters` anchor of the aside of `DashboardLayout`. The `ui/filters` entry is gone, and `ui/form` holds each export of the module.

The binding contract moved to [`primitives/form`](../../primitives/form). It holds the store and the actions of a form, the slice hooks of a field and of the status, and the binding cascade (`useFormValue`, `useFormToggle`). About twenty-five controls read it, and a component sits below a module. So the contract is a primitive with no entry point, and the barrel of this module re-exports its public hooks. `component-boundary.test.ts` lets a module barrel re-export the internal primitive of its own name, and no other primitive.

`Form` and `FormFilters` are two providers of the one contract. `Form` holds a reducer with validation, touch, and a baseline. `FormFilters` holds a value record that drops empty slots, and has no validation. A control binds a field of either one by its `name`.

The submit flow is a set of small hooks over the engine. [`useFormReducer`](use-form-reducer.ts) holds the state and the field actions. [`useFormSubmission`](use-form-submission.ts) runs a submit, and [`useFormSync`](use-form-sync.ts) syncs the controlled `values` prop. A refused submit and a handler that returns a field issue each count as a failure. The provider gives the count to the parts.

While a submit runs, the form locks its fields, and disables nothing. The provider gives a `locked` flag. The Control cascade reads it as `readOnly`: `useControlFieldContext` for a field in a `Field` or a `Control`, and `useControlProps` for a bare control. The setter of `useFormField` refuses a write while the form is locked, so a control with no read-only state, such as `Calendar`, cannot change its field either. A write through the form actions still lands, because a write from the app must land.

A disabled `<fieldset>` locked the fields once, and it disabled the buttons with them. Chromium moves the focus of a control that becomes disabled to the body, so the focused submit button or field lost the focus. Now each field and button keeps the focus. `FormSubmit` stays enabled, its loading state cancels a second click, and the form ignores a submit that starts during another one. The `<fieldset>` follows only the `disabled` prop. A filter bar inside a form provides its own flag, so its fields stay editable.

Three checks hold the lock. The capability sweep submits a form around each control of the corpus that writes its field, and expects no write. [`form-write-boundary.test.ts`](../../__tests__/boundary/form-write-boundary.test.ts) holds each part outside the module to the setter of `useFormField`, and lists each part that reads the form actions. [`form-submit-focus.test.tsx`](../../__tests__/browser/form-submit-focus.test.tsx) holds the focus of the submit button and of a field in Chromium.

Three parts act on the state of the form:

- [`FormSubmit`](form-submit.tsx) is a submit button that shows its loading state while a submit runs.
- [`FormReset`](form-reset.tsx) is a reset button that is `aria-disabled` while the form is clean or a submit runs. It stays enabled, so it keeps the focus after the reset that it starts.
- [`FormErrorSummary`](form-error-summary.tsx) lists the issue of each invalid field after a failure, and takes the focus. A form-bound `Message` registers the id of its control, so each row links to that control.

## Engine — the substrate

Each domain concept lands in [`engine/`](engine), the pure functional core of the module. The engine has no `'use client'`, no runtime `react` import, no `index` barrel, and no runtime import from the module root. It holds the vocabulary ([`types.ts`](engine/types.ts)), the validators ([`form-validate.ts`](engine/form-validate.ts)), the dirty flags ([`form-dirty.ts`](engine/form-dirty.ts)), and the reducer ([`form-reducer.ts`](engine/form-reducer.ts)). It also holds the steps of a submit ([`form-submission.ts`](engine/form-submission.ts)), the store ([`form-store.ts`](engine/form-store.ts)), and the schema adapter ([`form-zod-resolver.ts`](engine/form-zod-resolver.ts)). The filter bar reads [`form-filters.ts`](engine/form-filters.ts) and [`form-filters-axis.ts`](engine/form-filters-axis.ts), and the error summary reads [`form-error-summary.ts`](engine/form-error-summary.ts).

The engine reads `hasIssues` from the binding contract, because a control and the engine use the same definition of an invalid field.

[`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds the purity of this engine with the other pure engines. [`module-filename-boundary.test.ts`](../../__tests__/boundary/module-filename-boundary.test.ts) holds the `form-*` file names of the engine.

## Backlog

- **Field labels in the summary.** A row of `FormErrorSummary` shows the issue of its field. A row that also names the field needs the label of the field, which the form does not hold.

- **Native elements in a submit.** A native element that does not bind, such as a bare `<input>`, stays editable while a submit runs.

- **Buttons in a submit.** A button other than `FormSubmit` and `FormReset` stays live while a submit runs, so an action such as "Add stop" can change a value that the submit does not carry. Make each button of a submitting form `aria-disabled`, with the click cancel of the loading state of `Button`, and give a button that must stay live, such as Cancel, a prop to opt out.

- **A lock scope in Control.** The Control cascade reads the lock from the binding contract, so Control knows about forms. A form-agnostic scope in Control that cascades `readOnly` with no id, which `Form` renders, keeps Control apart from forms. A filter bar then needs a way to turn the lock off for its own fields.

- **A busy signal.** Only `FormSubmit` carries `aria-busy` while a submit runs. The shared announcer can speak that the form saves.

- **A focus target with no `Message`.** A row links to a control only when a form-bound `Message` of the field renders. A field with no `Message` shows its issue as text.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`docs/MODULES.md`](../../../docs/MODULES.md).
