/** Per-field issue map: field key to its issue list, or `undefined` when the field is clean. */
export type Errors = Record<string, string[] | undefined>
/** Per-field touched map: field key to whether the user has blurred it. */
export type Touched = Record<string, boolean>
/** Validates one field against its value and the whole record; returns an issue (or issues), or `undefined` when valid. @internal */
type Validator<T, K extends keyof T> = (value: T[K], values: T) => string | string[] | undefined
/** Optional {@link Validator} per field of `T`; the map {@link Form} consumes via its `validate` prop. Build one from a schema with {@link zodResolver}. */
export type Validators<T> = { [K in keyof T]?: Validator<T, K> }
/** When the reducer runs validators: on a field's first blur (`'touched'`), on each change of a field (`'change'`), or only on submit (`'submit'`). A change validates that field and the fields that are touched or have a result already, so that a cross-field rule (a confirmation) stays current. It does not validate a field that the user has not used. A change of one field does not replace an issue of another field that came from `setErrors` or a `{ fieldErrors }` return. */
export type ValidateOn = 'touched' | 'change' | 'submit'

/**
 * Reducer state for one form: current `values`, the `defaults` that `values`
 * compare against for dirtiness, and the {@link Errors} and {@link Touched} maps.
 * `external` holds the keys whose current issue came from `set-errors-external`.
 * A change of another field does not replace those issues.
 * @internal
 */
export type FormState<T> = {
	values: T
	defaults: T
	errors: Errors
	touched: Touched
	external: Record<string, true>
}

/**
 * Discriminated action set for {@link formReducer}. An action writes a value,
 * marks a field touched, merges external errors, re-syncs controlled values
 * and the defaults with them, resets to new defaults or to the held ones, or
 * commits a full-field submit validation.
 *
 * @internal
 */
export type FormAction<T> =
	| {
			type: 'set-value'
			name: string
			value: unknown
			validate: Validators<T> | undefined
			validateOn: ValidateOn
	  }
	| {
			type: 'set-touched'
			name: string
			validate: Validators<T> | undefined
			validateOn: ValidateOn
	  }
	| { type: 'set-errors-external'; errors: Errors }
	| { type: 'sync-values'; values: T }
	| { type: 'reset'; defaults?: T }
	| { type: 'submit-validate'; touched: Touched; errors: Errors }

/**
 * Runs the applicable field validators and returns their normalized issues.
 * Runs a field when `fields` forces it, when `validateOn` is `'change'`, or when
 * `'touched'` and the field is touched.
 *
 * @param fields - Restricts to (and forces) these field keys; omit to consider every validator.
 * @internal
 */
export function runValidators<T extends Record<string, unknown>>(
	validate: Validators<T> | undefined,
	values: T,
	touched: Touched,
	validateOn: ValidateOn,
	fields?: string[],
): Errors {
	if (!validate) return {}

	const forced = fields !== undefined

	const keys = fields ?? Object.keys(validate)

	const result: Errors = {}

	for (const key of keys) {
		const fn = validate[key as keyof T] as Validator<T, keyof T> | undefined

		if (!fn) continue

		if (forced || validateOn === 'change' || (validateOn === 'touched' && touched[key])) {
			const out = fn(values[key as keyof T], values)

			result[key] = normalizeIssues(out)
		}
	}

	return result
}

/** Normalizes a validator return to a non-empty issue array or `undefined`. @internal */
export function normalizeIssues(out: string | string[] | undefined): string[] | undefined {
	if (out === undefined) return undefined

	if (typeof out === 'string') return [out]

	return out.length > 0 ? out : undefined
}

/** True when a normalized issue list is present and non-empty — the single definition of a field being invalid. @internal */
export function hasIssues(issues: string[] | undefined): boolean {
	return issues !== undefined && issues.length > 0
}

/** True for a `null`-proto or `Object.prototype` object, excluding class instances. @internal */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') return false

	const proto = Object.getPrototypeOf(value)

	return proto === null || proto === Object.prototype
}

/** Element-wise {@link valuesEqual} over two arrays. @internal */
function arraysEqual(a: unknown[], b: unknown[]): boolean {
	return a.length === b.length && a.every((item, i) => valuesEqual(item, b[i]))
}

/** Key-wise {@link valuesEqual} over two plain objects. @internal */
function plainObjectsEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	const ak = Object.keys(a)
	const bk = Object.keys(b)

	return (
		ak.length === bk.length &&
		ak.every((key) => Object.hasOwn(b, key) && valuesEqual(a[key], b[key]))
	)
}

/**
 * Equality for the `dirty` derivation. Reference first, then structural over
 * `Date`, plain arrays, and plain objects; reference equality for `File`,
 * `Map`, `Set`, and class instances.
 *
 * @internal
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true

	if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()

	if (Array.isArray(a) && Array.isArray(b)) return arraysEqual(a, b)

	if (isPlainObject(a) && isPlainObject(b)) return plainObjectsEqual(a, b)

	return false
}

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

	const newErrors = runValidators(action.validate, state.values, nextTouched, action.validateOn, [
		action.name,
	])

	return {
		...state,
		errors: { ...state.errors, ...newErrors },
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

	const newErrors = runValidators(
		action.validate,
		nextValues,
		state.touched,
		action.validateOn,
		fields,
	)

	// Keep each issue from `set-errors-external`. Here, only a change of its own
	// field replaces it.
	for (const key in external) delete newErrors[key]

	return {
		...state,
		values: nextValues,
		errors: Object.keys(newErrors).length > 0 ? { ...state.errors, ...newErrors } : state.errors,
		external,
	}
}

/** Reducer for {@link Form} state: applies value/touched/error/sync/reset/submit actions, re-validating per `validateOn`. @internal */
export function formReducer<T extends Record<string, unknown>>(
	state: FormState<T>,
	action: FormAction<T>,
): FormState<T> {
	switch (action.type) {
		case 'set-value':
			return setFieldValue(state, action)
		case 'set-touched':
			return touchField(state, action)
		case 'set-errors-external': {
			const nextErrors = { ...state.errors, ...action.errors }
			const nextTouched = { ...state.touched }
			const nextExternal = { ...state.external }

			for (const key in action.errors) {
				const issues = action.errors[key]

				if (hasIssues(issues)) {
					nextTouched[key] = true

					nextExternal[key] = true
				} else delete nextExternal[key]
			}

			return { ...state, errors: nextErrors, touched: nextTouched, external: nextExternal }
		}
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
