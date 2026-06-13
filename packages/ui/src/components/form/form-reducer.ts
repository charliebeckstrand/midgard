export type Errors = Record<string, string[] | undefined>
export type Touched = Record<string, boolean>
type Validator<T, K extends keyof T> = (value: T[K], values: T) => string | string[] | undefined
export type Validators<T> = { [K in keyof T]?: Validator<T, K> }
export type ValidateOn = 'touched' | 'change' | 'submit'

export type FormState<T> = {
	values: T
	errors: Errors
	touched: Touched
}

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
	| { type: 'reset'; defaults: T }
	| { type: 'submit-validate'; touched: Touched; errors: Errors }

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

export function normalizeIssues(out: string | string[] | undefined): string[] | undefined {
	if (out === undefined) return undefined

	if (typeof out === 'string') return [out]

	return out.length > 0 ? out : undefined
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') return false

	const proto = Object.getPrototypeOf(value)

	return proto === null || proto === Object.prototype
}

function arraysEqual(a: unknown[], b: unknown[]): boolean {
	if (a.length !== b.length) return false

	for (let i = 0; i < a.length; i++) {
		if (!valuesEqual(a[i], b[i])) return false
	}

	return true
}

function plainObjectsEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	const ak = Object.keys(a)
	const bk = Object.keys(b)

	if (ak.length !== bk.length) return false

	for (const key of ak) {
		if (!Object.hasOwn(b, key)) return false

		if (!valuesEqual(a[key], b[key])) return false
	}

	return true
}

/**
 * Equality for the `dirty` derivation. Reference first, then structural over
 * `Date`, plain arrays, and plain objects; reference equality for `File`,
 * `Map`, `Set`, and class instances.
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true

	if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()

	if (Array.isArray(a) && Array.isArray(b)) return arraysEqual(a, b)

	if (isPlainObject(a) && isPlainObject(b)) return plainObjectsEqual(a, b)

	return false
}

export function formReducer<T extends Record<string, unknown>>(
	state: FormState<T>,
	action: FormAction<T>,
): FormState<T> {
	switch (action.type) {
		case 'set-value': {
			const nextValues = { ...state.values, [action.name]: action.value } as T

			if (action.validateOn === 'submit') {
				return { ...state, values: nextValues }
			}

			const newErrors = runValidators(action.validate, nextValues, state.touched, action.validateOn)

			return {
				...state,
				values: nextValues,
				errors:
					Object.keys(newErrors).length > 0 ? { ...state.errors, ...newErrors } : state.errors,
			}
		}
		case 'set-touched': {
			if (state.touched[action.name]) return state

			const nextTouched = { ...state.touched, [action.name]: true }

			const newErrors = runValidators(
				action.validate,
				state.values,
				nextTouched,
				action.validateOn,
				[action.name],
			)

			return {
				...state,
				errors: { ...state.errors, ...newErrors },
				touched: nextTouched,
			}
		}
		case 'set-errors-external': {
			const nextErrors = { ...state.errors, ...action.errors }
			const nextTouched = { ...state.touched }

			for (const key in action.errors) {
				const issues = action.errors[key]

				if (issues !== undefined && issues.length > 0) nextTouched[key] = true
			}

			return { ...state, errors: nextErrors, touched: nextTouched }
		}
		case 'sync-values':
			if (state.values === action.values) return state

			return { ...state, values: action.values }
		case 'reset':
			return { values: action.defaults, errors: {}, touched: {} }
		case 'submit-validate':
			return {
				...state,
				errors: action.errors,
				touched: action.touched,
			}
	}
}
