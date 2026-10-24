# Form roadmap

> **Goal: a form module with a pure engine for the form domain, a `Form` and a filter bar as two views over it, and small parts that act on the state of the form.** The bindable controls read the form through an internal contract below the components, so no component imports the module. This file tracks the module one measured piece at a time.

## Status

`Form` and `Filters` were components. `Form` is now the root of this module, and `Filters` is its filter bar, `FormFilters`. The parts of the bar take the `FormFilters` prefix: `FormFiltersBar`, `FormFiltersRow`, `FormFiltersField`, `FormFiltersClear`, `FormFiltersPrefix`, `FormFiltersSuffix`, and `FormFiltersSkeleton`. Their anchors take the `form-filters` prefix, so the bar no longer shares the `filters` anchor of the aside of `DashboardLayout`. The `ui/filters` entry is gone, and `ui/form` holds each export of the module.

The binding contract moved to [`primitives/form`](../../primitives/form). It holds the store and the actions of a form, the slice hooks of a field and of the status, and the binding cascade (`useFormValue`, `useFormToggle`). About twenty-five controls read it, and a component sits below a module. So the contract is a primitive with no entry point, and the barrel of this module re-exports its public hooks. `component-boundary.test.ts` lets a module barrel re-export the internal primitive of its own name, and no other primitive.

`Form` and `FormFilters` are two providers of the one contract. `Form` holds a reducer with validation, touch, and a baseline. `FormFilters` holds a value record that drops empty slots, and has no validation. A control binds a field of either one by its `name`.

The submit flow is a set of small hooks over the engine. [`useFormReducer`](use-form-reducer.ts) holds the state and the field actions. [`useFormSubmission`](use-form-submission.ts) runs a submit, and [`useFormSync`](use-form-sync.ts) syncs the controlled `values` prop. A refused submit and a handler that returns a field issue each count as a failure. The provider gives the count to the parts.

While a submit runs, the form locks its parts, and disables nothing. `Form` renders `ControlLockContext`, a lock scope of Control that knows nothing about forms. The nearest scope wins. The Control cascade reads the lock as `readOnly`: `useControlFieldContext` for a field in a `Field` or a `Control`, and `useControlProps` for a bare control. Each `Button` reads the lock too. A locked button is `aria-disabled`, cancels its click, and stays in the tab order. A button that must stay live, such as Cancel, takes `lockable={false}`. A library button that writes no field, such as a `Tab` or a `CopyButton`, takes it too. A button that is part of a field, such as a stepper of `NumberInput`, locks with its field. The lock does not reach a button with an `href`, because that button is a link.

The lock is React context, so it follows the component tree into a portal. A `Popover`, `Dialog`, `Drawer`, `Sheet`, `Confirm`, or `CommandPalette` that opens from inside a `Form` is in the scope of the form. So a field in the overlay locks with the form, because the field belongs to the form. A library button in the overlay that only closes or navigates writes no field, so it stays live. The standard button of `DialogClose`, `DrawerClose`, `SheetClose`, and `PopoverClose` takes `lockable={false}`, and so do `CommandPaletteClose` and the Cancel button of `Confirm`. The confirm action of `Confirm` locks, because it runs a handler of the app. A custom child of a close part is a button of the app, and the app chooses its lock.

The binding contract has its own `locked` flag, which `Form` gives. The setter of `useFormField` refuses a write while the form is locked. So a control with no read-only state, such as `Calendar`, cannot change its field either. A write through the form actions still lands, because a write from the app must land. While the submit runs, the form also gives "Submitting" to the shared announcer, which speaks politely.

A disabled `<fieldset>` locked the fields once, and it disabled the buttons with them. Chromium moves the focus of a control that becomes disabled to the body, so the focused submit button or field lost the focus. Now each field and button keeps the focus. `FormSubmit` stays enabled, its loading state cancels a second click, and the form ignores a submit that starts during another one. The `<fieldset>` follows only the `disabled` prop. A filter bar inside a form opens a scope with no lock, and gives the contract with no lock. So its fields and its Clear button stay live.

Three checks hold the lock. The capability sweep submits a form around each control of the corpus that writes its field, and expects no write. [`form-write-boundary.test.ts`](../../__tests__/boundary/form-write-boundary.test.ts) holds each part outside the module to the setter of `useFormField`, and lists each part that reads the form actions. [`form-submit-focus.test.tsx`](../../__tests__/browser/form-submit-focus.test.tsx) holds the focus of the submit button and of a field in Chromium.

Three parts act on the state of the form:

- [`FormSubmit`](form-submit.tsx) is a submit button that shows its loading state while a submit runs.
- [`FormReset`](form-reset.tsx) is a reset button that is `aria-disabled` while the form is clean or a submit runs. It stays enabled, so it keeps the focus after the reset that it starts.
- [`FormErrorSummary`](form-error-summary.tsx) lists the issue of each invalid field after a failure, and takes the focus. Each row links to the control of its field.

`Form` renders `ControlTargetsContext`, a registry of control ids by field name. Each bindable control registers its id there, and so does a form-bound `Message`. A bare control, with no `id` and no `Field` or `Control` around it, registers the id that it renders. `Input`, `Checkbox`, `Switch`, `Slider`, `RangeSlider`, `Rating`, and the pickers make that id with `useIdScope`. The registry counts each registration, so the end of one does not remove the other. A row of a field that registers no id, such as a custom field over `useFormValue`, shows its issue as text. A filter bar opens no registry, so its fields do not take the names of the form.

## Engine: the substrate

Each domain concept lands in [`engine/`](engine), the pure functional core of the module. The engine has no `'use client'`, no runtime `react` import, no `index` barrel, and no runtime import from the module root. It holds the vocabulary ([`types.ts`](engine/types.ts)), the validators ([`form-validate.ts`](engine/form-validate.ts)), the dirty flags ([`form-dirty.ts`](engine/form-dirty.ts)), and the reducer ([`form-reducer.ts`](engine/form-reducer.ts)). It also holds the steps of a submit ([`form-submission.ts`](engine/form-submission.ts)), the store ([`form-store.ts`](engine/form-store.ts)), and the schema adapter ([`form-zod-resolver.ts`](engine/form-zod-resolver.ts)). The filter bar reads [`form-filters.ts`](engine/form-filters.ts) and [`form-filters-axis.ts`](engine/form-filters-axis.ts), and the error summary reads [`form-error-summary.ts`](engine/form-error-summary.ts).

The engine reads `hasIssues` from the binding contract, because a control and the engine use the same definition of an invalid field.

[`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds the purity of this engine with the other pure engines. [`module-filename-boundary.test.ts`](../../__tests__/boundary/module-filename-boundary.test.ts) holds the `form-*` file names of the engine.

## Backlog

- **Field labels in the summary.** A row of `FormErrorSummary` shows the issue of its field. A row that also names the field needs the label of the field, which the form does not hold.

- **Native elements in a submit.** A native element that does not bind, such as a bare `<input>`, stays editable while a submit runs.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`docs/MODULES.md`](../../../docs/MODULES.md).
