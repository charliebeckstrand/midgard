'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { type FormActions, FormProvider, type FormStateValue } from './context'

type Errors = Record<string, string | undefined>
type Touched = Record<string, boolean>
type Validator<T, K extends keyof T> = (value: T[K], values: T) => string | undefined
type ValidateOn = 'touched' | 'change' | 'submit'

export type FormHelpers<T> = {
	setErrors: (errors: Partial<Record<keyof T, string>>) => void
	reset: () => void
}

export type FormProps<T extends Record<string, unknown>> = {
	defaultValues: T
	validate?: { [K in keyof T]?: Validator<T, K> }
	validateOn?: ValidateOn
	onSubmit?: (values: T, helpers: FormHelpers<T>) => void | Promise<void>
	onReset?: () => void
	disabled?: boolean
	className?: string
	children: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'form'>, 'onSubmit' | 'onReset' | 'children' | 'className'>

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
	const [values, setValues] = useState<T>(() => ({ ...defaultValues }))

	const [errors, setErrors] = useState<Errors>({})

	const [touched, setTouchedState] = useState<Touched>({})

	const [submitting, setSubmitting] = useState(false)

	const defaultsRef = useRef(defaultValues)

	const validateRef = useRef(validate)

	validateRef.current = validate

	const valuesRef = useRef(values)

	valuesRef.current = values

	const touchedRef = useRef(touched)

	touchedRef.current = touched

	const dirty = useMemo(() => {
		const d: Record<string, boolean> = {}

		for (const key in values) {
			d[key] = values[key] !== defaultsRef.current[key]
		}

		return d
	}, [values])

	const isDirty = useMemo(() => Object.values(dirty).some(Boolean), [dirty])

	const runValidation = useCallback(
		(vals: T, touchedState: Touched, fields?: string[]) => {
			const v = validateRef.current

			if (!v) return {}

			const result: Errors = {}

			const keys = fields ?? Object.keys(v)

			for (const key of keys) {
				const forced = fields !== undefined

				const shouldValidate =
					validateOn === 'change' || (validateOn === 'touched' && touchedState[key])

				if (forced || shouldValidate) {
					const fn = v[key as keyof T] as Validator<T, keyof T> | undefined

					if (fn) result[key] = fn(vals[key as keyof T], vals)
				}
			}

			return result
		},
		[validateOn],
	)

	const isValid = useMemo(() => {
		const v = validateRef.current

		if (!v) return true

		for (const key of Object.keys(v)) {
			const fn = v[key as keyof T] as Validator<T, keyof T> | undefined

			if (fn?.(values[key as keyof T], values) !== undefined) return false
		}

		return true
	}, [values])

	const getValue = useCallback((name: string) => valuesRef.current[name as keyof T], [])

	const setValue = useCallback(
		(name: string, value: unknown) => {
			setValues((prev: T) => {
				const next = { ...prev, [name]: value } as T

				valuesRef.current = next

				if (validateOn !== 'submit') {
					const newErrors = runValidation(next, touchedRef.current)

					if (Object.keys(newErrors).length > 0) {
						setErrors((prev: Errors) => ({ ...prev, ...newErrors }))
					}
				}

				return next
			})
		},
		[validateOn, runValidation],
	)

	const setTouched = useCallback(
		(name: string) => {
			setTouchedState((prev: Touched) => {
				if (prev[name]) return prev

				const next = { ...prev, [name]: true }

				touchedRef.current = next

				if (validateOn === 'touched') {
					const newErrors = runValidation(valuesRef.current as T, next, [name])

					setErrors((prev: Errors) => ({ ...prev, ...newErrors }))
				}

				return next
			})
		},
		[validateOn, runValidation],
	)

	const setErrorsExternal = useCallback((errs: Errors) => {
		setErrors((prev: Errors) => ({ ...prev, ...errs }))

		setTouchedState((prev: Touched) => {
			const next = { ...prev }

			for (const key in errs) {
				if (errs[key]) next[key] = true
			}

			return next
		})
	}, [])

	const reset = useCallback(() => {
		const defaults = { ...defaultsRef.current }

		setValues(defaults)

		valuesRef.current = defaults

		setErrors({})

		setTouchedState({})

		touchedRef.current = {}

		onReset?.()
	}, [onReset])

	const handleSubmit = useCallback(
		async (e: React.SyntheticEvent<HTMLFormElement>) => {
			e.preventDefault()

			const allTouched: Touched = {}

			for (const key in valuesRef.current) allTouched[key] = true

			setTouchedState(allTouched)

			touchedRef.current = allTouched

			const v = validateRef.current

			if (v) {
				const result: Errors = {}

				for (const key of Object.keys(v)) {
					const fn = v[key as keyof T] as Validator<T, keyof T> | undefined

					if (fn) result[key] = fn(valuesRef.current[key as keyof T], valuesRef.current as T)
				}

				setErrors(result)

				if (Object.values(result).some((err) => err !== undefined)) return
			}

			if (!onSubmit) return

			setSubmitting(true)

			try {
				await onSubmit(valuesRef.current as T, {
					setErrors: setErrorsExternal as FormHelpers<T>['setErrors'],
					reset,
				})
			} finally {
				setSubmitting(false)
			}
		},
		[onSubmit, setErrorsExternal, reset],
	)

	const handleReset = useCallback(
		(e: React.SyntheticEvent<HTMLFormElement>) => {
			e.preventDefault()

			reset()
		},
		[reset],
	)

	const state = useMemo<FormStateValue>(
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
		<FormProvider state={state} actions={actions}>
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
