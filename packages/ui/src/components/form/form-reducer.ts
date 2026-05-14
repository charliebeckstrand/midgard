export type Errors = Record<string, string | undefined>
export type Touched = Record<string, boolean>
export type Validator<T, K extends keyof T> = (value: T[K], values: T) => string | undefined
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
			result[key] = fn(values[key as keyof T], values)
		}
	}

	return result
}

export function formReducer<T extends Record<string, unknown>>(
	state: FormState<T>,
	action: FormAction<T>,
): FormState<T> {
	switch (action.type) {
		case 'set-value': {
			const nextValues = { ...state.values, [action.name]: action.value } as T

			if (action.validateOn === 'submit') {
				return { values: nextValues, errors: state.errors, touched: state.touched }
			}

			const newErrors = runValidators(action.validate, nextValues, state.touched, action.validateOn)

			return {
				values: nextValues,
				errors:
					Object.keys(newErrors).length > 0 ? { ...state.errors, ...newErrors } : state.errors,
				touched: state.touched,
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
				values: state.values,
				errors: { ...state.errors, ...newErrors },
				touched: nextTouched,
			}
		}
		case 'set-errors-external': {
			const nextErrors = { ...state.errors, ...action.errors }
			const nextTouched = { ...state.touched }

			for (const key in action.errors) {
				if (action.errors[key]) nextTouched[key] = true
			}

			return { values: state.values, errors: nextErrors, touched: nextTouched }
		}
		case 'reset':
			return { values: action.defaults, errors: {}, touched: {} }
		case 'submit-validate':
			return { values: state.values, errors: action.errors, touched: action.touched }
	}
}
