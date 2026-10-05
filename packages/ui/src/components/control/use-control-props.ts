'use client'

import { type ValidationAttrs, validationAttrs } from '../../core'
import { useAriaIds } from '../../hooks'
import { useDevWarning } from '../../hooks/use-dev-warning'
import { useControl } from './context'

/** Field-supplied input to {@link useControlProps}: the explicit form-field props a control passes for resolution against its `<Control>` / `<Field>` context. */
export type ControlPropsOptions = {
	id?: string
	autoComplete?: string
	disabled?: boolean
	required?: boolean
	readOnly?: boolean
	/** Consumer-supplied `aria-describedby`, merged ahead of the field's own ids. */
	'aria-describedby'?: string
	/**
	 * Form-bound invalid state (from `useInputValue` / `useFormValue` /
	 * `useFormToggle`); OR's with an ambient `error` severity so an external form
	 * error and an ambient `<Field severity="error">` both surface.
	 */
	invalid?: boolean
}

/** Resolved form-field props from {@link useControlProps}: input-over-context values for a field plus the spreadable {@link ControlPropsResult.validation} attributes. */
export type ControlPropsResult = {
	id: string | undefined
	autoComplete: string | undefined
	disabled: boolean | undefined
	required: boolean | undefined
	readOnly: boolean | undefined
	invalid: boolean | undefined
	'aria-describedby': string | undefined
	/** Spreadable `data-*` / `aria-invalid` attributes for the resolved validation state: `error`/invalid, else the Control `severity` (`warning` / `success`), else none. */
	validation: ValidationAttrs
}

/**
 * The development warning for an explicit control id that differs from the id
 * of its `<Control>` / `<Field>`. It tells the consumer to pin the id on the
 * wrapper.
 */
function strayIdWarning(explicitId: string, wrapperId: string): string {
	return `Control: a control under a <Control> or <Field> takes the explicit id "${explicitId}", but the wrapper has the id "${wrapperId}". A <Label> that takes its htmlFor from the wrapper then points at no element. Pin the id on the wrapper: pass htmlFor="${explicitId}" to the <Field> (or the CheckboxField, RadioField, or SwitchField), or id="${explicitId}" to the <Control>.`
}

/**
 * Resolves the form-field props that all members of the Control cascade share:
 * id, autoComplete, disabled, required, readOnly, invalid.
 *
 * Resolution order: explicit input wins, then the wrapping `<Control>` /
 * `<Field>` context. `invalid` instead OR's the form-bound flag with the
 * context's.
 *
 * Does **not** resolve size. A field takes its step from the nearest density
 * scope. The Control context carries no size.
 *
 * @param input - Explicit control props from the field. Each wins over the
 * context value of the same name, except `invalid` and `aria-describedby`.
 * `invalid` is OR-merged with `error` severity; `aria-describedby` is merged
 * ahead of the field's own ids.
 * @returns The resolved `id`, `autoComplete`, `disabled`, `required`,
 * `readOnly`, `invalid`, and composed `aria-describedby`; any field is
 * `undefined` when neither input nor context supplies it.
 * @remarks `invalid` resolves `true` from an explicit `invalid` (the field's
 * own prop or form binding), or when the Control / Field `severity` is `error`.
 * A nested `<Message>` is presentational and never marks the control
 * invalid. `validation` collapses the resolved state into a single spreadable
 * attribute object: invalid wins, then a `warning` / `success` severity. The
 * three validation rings therefore stay mutually exclusive.
 *
 * An explicit `id` that differs from the `<Control>` / `<Field>` id warns in
 * development, and the explicit id still wins. A `<Label>` takes its `htmlFor`
 * from the wrapper id, so it then points at no element. Pin the id on the
 * wrapper instead: `htmlFor` on a `<Field>`, or `id` on a `<Control>`.
 * @example
 *   const { id, disabled, required, invalid, validation } = useControlProps({
 *     id: idProp, disabled: disabledProp, required: requiredProp, invalid,
 *   })
 */
export function useControlProps(input: ControlPropsOptions = {}): ControlPropsResult {
	const control = useControl()

	// Consumer-supplied ids first, then the field's registered description /
	// error ids. Omitted when neither is present.
	const describedBy = useAriaIds(input['aria-describedby'], control?.describedBy)

	const severity = control?.severity

	// An explicit `invalid` (the field's own prop or a form binding) or an ambient
	// `error` severity marks the control invalid. A nested `<Message>` is
	// presentational: it never drives the chrome — the ring comes from severity.
	const invalid = input.invalid || severity === 'error' || undefined

	// Invalid wins the validation chrome; otherwise reflect a warning / success
	// severity. The three states are mutually exclusive.
	const validation = validationAttrs(
		invalid ? 'error' : severity === 'warning' || severity === 'success' ? severity : undefined,
	)

	// The explicit id wins on the control, but a Label takes its `for` from the
	// wrapper id. When the two ids differ, the Label points at no element.
	const explicitId = input.id

	const wrapperId = control?.id

	const strayId = explicitId !== undefined && wrapperId !== undefined && explicitId !== wrapperId

	useDevWarning(strayId, strayId ? strayIdWarning(explicitId, wrapperId) : '')

	return {
		id: input.id ?? control?.id,
		autoComplete: input.autoComplete ?? control?.autoComplete,
		disabled: input.disabled ?? control?.disabled,
		required: input.required ?? control?.required,
		readOnly: input.readOnly ?? control?.readOnly,
		invalid,
		'aria-describedby': describedBy,
		validation,
	}
}
