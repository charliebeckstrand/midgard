'use client'

import {
	type ComponentPropsWithoutRef,
	type ReactNode,
	type SyntheticEvent,
	useCallback,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react'
import { type FormActions, FormProvider, type FormStateValue } from './context'

type Errors = Record<string, string | undefined>
type Touched = Record<string, boolean>
type Validator<T, K extends keyof T> = (value: T[K], values: T) => string | undefined
type Validators<T> = { [K in keyof T]?: Validator<T, K> }
type ValidateOn = 'touched' | 'change' | 'submit'

export type FormHelpers<T> = {
	setErrors: (errors: Partial<Record<keyof T, string>>) => void
	reset: () => void
}

export type FormProps<T extends Record<string, unknown>> = {
	defaultValues: T
	validate?: Validators<T>
	validateOn?: ValidateOn
	onSubmit?: (values: T, helpers: FormHelpers<T>) => void | Promise<void>
	onReset?: () => void
	disabled?: boolean
	className?: string
	children: ReactNode
} & Omit<ComponentPropsWithoutRef<'form'>, 'onSubmit' | 'onReset' | 'children' | 'className'>

type FormState<T> = {
	values: T
	errors: Errors
	touched: Touched
}

type Action<T> =
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

function runValidators<T extends Record<string, unknown>>(
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

function reducer<T extends Record<string, unknown>>(
	state: FormState<T>,
	action: Action<T>,
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

export function Form<T extends Record<string, unknown>>({
	defaultValues,
	validate,
	validateOn = 'touched',
	onSubmit,
	onReset,
	disabled,
	className,
	children,
	...props
}: FormProps<T>) {
	const [state, dispatch] = useReducer(
		reducer as (state: FormState<T>, action: Action<T>) => FormState<T>,
		undefined,
		(): FormState<T> => ({ values: { ...defaultValues }, errors: {}, touched: {} }),
	)

	const [submitting, setSubmitting] = useState(false)

	const defaultsRef = useRef(defaultValues)

	const validateRef = useRef(validate)

	validateRef.current = validate

	const { values, errors, touched } = state

	// Mirror current values so getValue stays stable across re-renders;
	// consumers rely on actions object identity (see useFormActions tests).
	const valuesRef = useRef(values)

	valuesRef.current = values

	const dirty = useMemo(() => {
		const d: Record<string, boolean> = {}

		for (const key in values) {
			d[key] = values[key] !== defaultsRef.current[key]
		}

		return d
	}, [values])

	const isDirty = useMemo(() => Object.values(dirty).some(Boolean), [dirty])

	const isValid = useMemo(() => {
		const v = validateRef.current

		if (!v) return true

		const errs = runValidators(v, values, {}, validateOn, Object.keys(v))

		return !Object.values(errs).some((err) => err !== undefined)
	}, [values, validateOn])

	const getValue = useCallback((name: string) => valuesRef.current[name as keyof T], [])

	const setValue = useCallback(
		(name: string, value: unknown) => {
			dispatch({ type: 'set-value', name, value, validate: validateRef.current, validateOn })
		},
		[validateOn],
	)

	const setTouched = useCallback(
		(name: string) => {
			dispatch({ type: 'set-touched', name, validate: validateRef.current, validateOn })
		},
		[validateOn],
	)

	const setErrorsExternal = useCallback((errs: Errors) => {
		dispatch({ type: 'set-errors-external', errors: errs })
	}, [])

	const reset = useCallback(() => {
		dispatch({ type: 'reset', defaults: { ...defaultsRef.current } })

		onReset?.()
	}, [onReset])

	const handleSubmit = useCallback(
		async (e: SyntheticEvent<HTMLFormElement>) => {
			e.preventDefault()

			const current = valuesRef.current

			const allTouched: Touched = {}

			for (const key in current) allTouched[key] = true

			const v = validateRef.current

			const submitErrors = v
				? runValidators(v, current, allTouched, validateOn, Object.keys(v))
				: {}

			dispatch({ type: 'submit-validate', touched: allTouched, errors: submitErrors })

			if (Object.values(submitErrors).some((err) => err !== undefined)) return

			if (!onSubmit) return

			setSubmitting(true)

			try {
				await onSubmit(valuesRef.current, {
					setErrors: setErrorsExternal as FormHelpers<T>['setErrors'],
					reset,
				})
			} finally {
				setSubmitting(false)
			}
		},
		[onSubmit, setErrorsExternal, reset, validateOn],
	)

	const handleReset = useCallback(
		(e: SyntheticEvent<HTMLFormElement>) => {
			e.preventDefault()

			reset()
		},
		[reset],
	)

	const formState = useMemo<FormStateValue>(
		() => ({
			values: values as Record<string, unknown>,
			errors,
			touched,
			dirty,
			isDirty,
			isValid,
			submitting,
		}),
		[values, errors, touched, dirty, isDirty, isValid, submitting],
	)

	const actions = useMemo<FormActions>(
		() => ({
			getValue,
			setValue,
			setErrors: setErrorsExternal,
			setTouched,
			reset,
		}),
		[getValue, setValue, setErrorsExternal, setTouched, reset],
	)

	return (
		<FormProvider state={formState} actions={actions}>
			<form
				data-slot="form"
				onSubmit={handleSubmit}
				onReset={handleReset}
				className={className}
				{...props}
			>
				<fieldset disabled={disabled || submitting} className="m-0 min-w-0 border-none p-0">
					{children}
				</fieldset>
			</form>
		</FormProvider>
	)
}
