import { hasIssues } from '../../../primitives/form/form-issues'
import { runValidators } from './form-validate'
import type { Errors, FormAction, FormState, Validators } from './types'

/**
 * Applies the `set-touched` action: marks the field touched, then validates
 * that one field unless `validateOn` is `'submit'`.
 *
 * @internal
 */
function touchField<T extends Record<string, unknown>>(
	state: FormState<T>,
	action: Extract<FormAction<T>, { type: 'set-touched' }>,
): FormState<T> {
	if (state.touched[action.name]) return state

	const nextTouched = { ...state.touched, [action.name]: true }

	// The `fields` argument below forces the run, so guard the submit mode here.
	if (action.validateOn === 'submit') {
		return { ...state, touched: nextTouched }
	}

	const errors = runValidators(action.validate, state.values, nextTouched, action.validateOn, [
		action.name,
	])

	return {
		...state,
		errors: { ...state.errors, ...errors },
		touched: nextTouched,
	}
}

/**
 * The fields that a change of `name` validates in the `'change'` mode: that
 * field, and each field that is touched or has a result in `errors` already. A
 * validator gets all the values, so a change can make the result of a
 * validated field stale (a confirmation that compares to a password). A field
 * that the user has not used gets no result.
 *
 * @internal
 */
function changeValidationFields<T>(
	validate: Validators<T>,
	name: string,
	state: FormState<T>,
): string[] {
	return Object.keys(validate).filter(
		(key) => key === name || state.touched[key] === true || Object.hasOwn(state.errors, key),
	)
}

/** Gives `external` without `name`, or the same reference when `name` is not in it. @internal */
function dropExternal(external: Record<string, true>, name: string): Record<string, true> {
	if (!Object.hasOwn(external, name)) return external

	const next = { ...external }

	delete next[name]

	return next
}

/**
 * Applies the `set-value` action: writes the value, then validates per
 * `validateOn`. The `'change'` mode validates the fields that
 * {@link changeValidationFields} gives. The result of a field in `external`
 * does not land, except for the changed field, which leaves `external`.
 *
 * @internal
 */
function setFieldValue<T extends Record<string, unknown>>(
	state: FormState<T>,
	action: Extract<FormAction<T>, { type: 'set-value' }>,
): FormState<T> {
	const nextValues = { ...state.values, [action.name]: action.value } as T

	const external = dropExternal(state.external, action.name)

	if (action.validateOn === 'submit') {
		return { ...state, values: nextValues, external }
	}

	// The `fields` argument forces the run, so pass it in the `'change'` mode
	// only. The `'touched'` mode validates the touched fields.
	const fields =
		action.validateOn === 'change' && action.validate
			? changeValidationFields(action.validate, action.name, state)
			: undefined

	const errors = runValidators(
		action.validate,
		nextValues,
		state.touched,
		action.validateOn,
		fields,
	)

	// Keep each issue from `set-errors-external`. Here, only a change of its own
	// field replaces it.
	for (const key in external) delete errors[key]

	return {
		...state,
		values: nextValues,
		errors: Object.keys(errors).length > 0 ? { ...state.errors, ...errors } : state.errors,
		external,
	}
}

/**
 * Applies the `set-errors-external` action: merges the errors, and marks each
 * field with an issue touched and external. A field that the action clears
 * leaves `external`.
 *
 * @internal
 */
function setExternalErrors<T>(state: FormState<T>, errors: Errors): FormState<T> {
	const nextErrors = { ...state.errors, ...errors }
	const nextTouched = { ...state.touched }
	const nextExternal = { ...state.external }

	for (const key in errors) {
		if (hasIssues(errors[key])) {
			nextTouched[key] = true

			nextExternal[key] = true
		} else delete nextExternal[key]
	}

	return { ...state, errors: nextErrors, touched: nextTouched, external: nextExternal }
}

/** Reducer for `Form` state: applies value/touched/error/sync/reset/submit actions, re-validating per `validateOn`. @internal */
export function formReducer<T extends Record<string, unknown>>(
	state: FormState<T>,
	action: FormAction<T>,
): FormState<T> {
	switch (action.type) {
		case 'set-value':
			return setFieldValue(state, action)
		case 'set-touched':
			return touchField(state, action)
		case 'set-errors-external':
			return setExternalErrors(state, action.errors)
		case 'sync-values':
			if (state.values === action.values && state.defaults === action.values) return state

			return { ...state, values: action.values, defaults: action.values }
		case 'reset': {
			const defaults = action.defaults ?? state.defaults

			return { values: { ...defaults }, defaults, errors: {}, touched: {}, external: {} }
		}
		case 'submit-validate':
			return {
				...state,
				errors: action.errors,
				touched: action.touched,
				external: {},
			}
	}
}
