'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { FormProvider } from './context'
import type { ValidateOn, Validators } from './form-reducer'
import { type FormHelpers, useFormReducer } from './use-form-reducer'

export type { FormHelpers }

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
	const { formState, actions, handleSubmit, handleReset } = useFormReducer({
		defaultValues,
		validate,
		validateOn,
		onSubmit,
		onReset,
	})

	return (
		<FormProvider state={formState} actions={actions}>
			<form
				data-slot="form"
				onSubmit={handleSubmit}
				onReset={handleReset}
				className={className}
				{...props}
			>
				<fieldset
					disabled={disabled || formState.submitting}
					className="m-0 min-w-0 border-none p-0"
				>
					{children}
				</fieldset>
			</form>
		</FormProvider>
	)
}
