'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { type FormContextValue, FormProvider } from './context'

type Validator<T, K extends keyof T> = (value: T[K], values: T) => string | undefined

type ValidateOn = 'touched' | 'change' | 'submit'

export type FormHelpers<T> = {
	setErrors: (errors: Partial<Record<keyof T, string>>) => void
	reset: () => void
}

export type FormProps<T extends Record<string, unknown>> = {
	defaultValues: T
	validate?: { [K in keyof T]?: (value: T[K], values: T) => string | undefined }
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
	const [errors, setErrors] = useState<Record<string, string | undefined>>({})
	const [touched, setTouchedState] = useState<Record<string, boolean>>({})
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
		(vals: T, touchedState: Record<string, boolean>, fields?: string[]) => {
			const v = validateRef.current
			if (!v) return {}

			const result: Record<string, string | undefined> = {}
			const keys = fields ?? Object.keys(v)

			for (const key of keys) {
				const shouldValidate =
					validateOn === 'change' || (validateOn === 'touched' && touchedState[key])

				if (shouldValidate || fields !== undefined) {
					const validator = v[key as keyof T] as Validator<T, keyof T> | undefined
					if (validator) {
						result[key] = validator(vals[key as keyof T], vals)
					}
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
			const validator = v[key as keyof T] as Validator<T, keyof T> | undefined
			if (validator) {
				const error = validator(values[key as keyof T], values)
				if (error !== undefined) return false
			}
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
					const validationErrors = runValidation(next, touchedRef.current)
					if (Object.keys(validationErrors).length > 0) {
						setErrors(
							(prevErrors: Record<string, string | undefined>) =>
								({ ...prevErrors, ...validationErrors }) as Record<string, string | undefined>,
						)
					}
				}

				return next
			})
		},
		[validateOn, runValidation],
	)

	const setTouched = useCallback(
		(name: string) => {
			setTouchedState((prev: Record<string, boolean>) => {
				if (prev[name]) return prev
				const next = { ...prev, [name]: true }
				touchedRef.current = next

				if (validateOn === 'touched') {
					const validationErrors = runValidation(valuesRef.current as T, next, [name])
					setErrors(
						(prevErrors: Record<string, string | undefined>) =>
							({ ...prevErrors, ...validationErrors }) as Record<string, string | undefined>,
					)
				}

				return next
			})
		},
		[validateOn, runValidation],
	)

	const setErrorsExternal = useCallback((errs: Record<string, string | undefined>) => {
		setErrors(
			(prev: Record<string, string | undefined>) =>
				({ ...prev, ...errs }) as Record<string, string | undefined>,
		)
		// Mark fields with errors as touched so they display
		setTouchedState((prev: Record<string, boolean>) => {
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
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()

			// Mark all fields as touched
			const allTouched: Record<string, boolean> = {}
			for (const key in valuesRef.current) {
				allTouched[key] = true
			}
			setTouchedState(allTouched)
			touchedRef.current = allTouched

			// Validate all fields
			const v = validateRef.current
			if (v) {
				const validationErrors: Record<string, string | undefined> = {}
				for (const key of Object.keys(v)) {
					const validator = v[key as keyof T] as Validator<T, keyof T> | undefined
					if (validator) {
						validationErrors[key] = validator(
							valuesRef.current[key as keyof T],
							valuesRef.current as T,
						)
					}
				}

				setErrors(validationErrors)

				const hasErrors = Object.values(validationErrors).some((e) => e !== undefined)
				if (hasErrors) return
			}

			if (!onSubmit) return

			const helpers: FormHelpers<T> = {
				setErrors: setErrorsExternal as FormHelpers<T>['setErrors'],
				reset,
			}

			setSubmitting(true)
			try {
				await onSubmit(valuesRef.current as T, helpers)
			} finally {
				setSubmitting(false)
			}
		},
		[onSubmit, setErrorsExternal, reset],
	)

	const handleReset = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()
			reset()
		},
		[reset],
	)

	const context = useMemo<FormContextValue>(
		() => ({
			values: values as Record<string, unknown>,
			getValue,
			setValue,
			errors,
			setErrors: setErrorsExternal,
			touched,
			setTouched,
			dirty,
			isDirty,
			isValid,
			submitting,
			reset,
		}),
		[
			values,
			getValue,
			setValue,
			errors,
			setErrorsExternal,
			touched,
			setTouched,
			dirty,
			isDirty,
			isValid,
			submitting,
			reset,
		],
	)

	return (
		<FormProvider value={context}>
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
