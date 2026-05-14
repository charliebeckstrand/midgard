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
import {
	type Errors,
	type FormAction,
	type FormState,
	formReducer,
	runValidators,
	type Touched,
	type ValidateOn,
	type Validators,
} from './form-reducer'

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
		formReducer as (state: FormState<T>, action: FormAction<T>) => FormState<T>,
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
					setErrors: setErrorsExternal,
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
			values,
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
