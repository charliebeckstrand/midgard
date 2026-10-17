# Form roadmap

> **Goal: a form module with a pure engine for the form domain, a `Form` and a filter bar as two views over it, and small parts that act on the state of the form.** The bindable controls read the form through an internal contract below the components, so no component imports the module. This file tracks the module one measured piece at a time.

## Status

`Form` and `Filters` were components. `Form` is now the root of this module, and `Filters` is its filter bar, `FormFilters`. The parts of the bar take the `FormFilters` prefix: `FormFiltersBar`, `FormFiltersRow`, `FormFiltersField`, `FormFiltersClear`, `FormFiltersPrefix`, `FormFiltersSuffix`, and `FormFiltersSkeleton`. Their anchors take the `form-filters` prefix, so the bar no longer shares the `filters` anchor of the aside of `DashboardLayout`. The `ui/filters` entry is gone, and `ui/form` holds each export of the module.

The binding contract moved to [`primitives/form`](../../primitives/form). It holds the store and the actions of a form, the slice hooks of a field and of the status, and the binding cascade (`useFormValue`, `useFormToggle`). About twenty-five controls read it, and a component sits below a module. So the contract is a primitive with no entry point, and the barrel of this module re-exports its public hooks. `component-boundary.test.ts` lets a module barrel re-export the internal primitive of its own name, and no other primitive.

`Form` and `FormFilters` are two providers of the one contract. `Form` holds a reducer with validation, touch, and a baseline. `FormFilters` holds a value record that drops empty slots, and has no validation. A control binds a field of either one by its `name`.

The submit flow is a set of small hooks over the engine. [`useFormReducer`](use-form-reducer.ts) holds the state and the field actions. [`useFormSubmission`](use-form-submission.ts) runs a submit, and [`useFormSync`](use-form-sync.ts) syncs the controlled `values` prop. A refused submit and a handler that returns a field issue each count as a failure. The provider gives the count to the parts.

While a submit runs, the form disables its fields and not its buttons. The provider gives a `fieldsDisabled` flag, and the Control cascade reads it: `useControlFieldContext` for a field in a `Field` or a `Control`, and `useControlProps` for a bare control. A disabled `<fieldset>` disabled each button too, and the focused submit button then lost the focus. Now `FormSubmit` stays enabled, its loading state cancels a second click, and the form ignores a submit that starts during another one. The `<fieldset>` follows only the `disabled` prop. A filter bar inside a form provides its own flag, so its fields stay enabled.

A field that has the focus when the submit starts, after an Enter in it, becomes disabled. An engine that applies the focus fixup rule of HTML then moves the focus to the body. When the submit ends and the focus is on the body, `useFormSubmission` gives the focus back to the element that had it at the start. A focus that went to another element, such as `FormErrorSummary`, stays there.

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

- **Native elements in a submit.** A native element that does not read the Control cascade, such as a bare `<input>`, stays enabled while a submit runs.

- **A focus target with no `Message`.** A row links to a control only when a form-bound `Message` of the field renders. A field with no `Message` shows its issue as text.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`docs/MODULES.md`](../../../docs/MODULES.md).
