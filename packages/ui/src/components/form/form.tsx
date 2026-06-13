'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { Fieldset } from '../fieldset'
import { FormProvider } from './context'
import type { ValidateOn, Validators } from './form-reducer'
import {
	type FormHelpers,
	type FormSubmitHandler,
	type SubmitOutcome,
	type SubmitResult,
	useFormReducer,
} from './use-form-reducer'

export type { FormHelpers, FormSubmitHandler, SubmitOutcome, SubmitResult }

/** Props for {@link Form}. Generic over the form-value record `T`; field keys and types flow from `defaultValues`. */
export type FormProps<T extends Record<string, unknown>> = {
	defaultValues: T
	/**
	 * Controlled re-sync source. Reference change → `values` replaced and the
	 * dirty baseline shifts; `touched`, `errors`, and `submitting` stay put.
	 * Passing `undefined` re-syncs to `defaultValues` under the same contract.
	 * Pass a stable reference; a new derived object each render loops the sync.
	 */
	values?: T
	validate?: Validators<T>
	validateOn?: ValidateOn
	onSubmit?: FormSubmitHandler<T>
	onSettled?: (outcome: SubmitOutcome<T>) => void
	onReset?: () => void
	disabled?: boolean
	className?: string
	children: ReactNode
} & Omit<
	ComponentPropsWithoutRef<'form'>,
	'onSubmit' | 'onReset' | 'children' | 'className' | 'values'
>

/**
 * Reducer-backed form scope over typed `defaultValues`: tracks dirty, touched,
 * errors, and submitting state, validates on the `validateOn` trigger, and
 * disables its `<Fieldset>` while submitting. Renders a layout-neutral
 * (`display: contents`) `<form>`, so it imposes no box; fields read and mutate
 * state through the context hooks ({@link useFormField}, {@link useFormStatus},
 * {@link useFormActions}) rather than props.
 *
 * @remarks
 * Uncontrolled by default from `defaultValues`; pass a stable `values`
 * reference to drive it as a controlled re-sync source. Field components
 * subscribe to their own slice through an external store, so a keystroke
 * re-renders only the touched field, not the whole tree. Submit awaits
 * `onSubmit`, surfaces a returned `{ fieldErrors }` or thrown error, and
 * guards against superseding resets/unmounts via a monotonic token.
 *
 * @typeParam T - Shape of the form-value record.
 */
export function Form<T extends Record<string, unknown>>({
	defaultValues,
	values,
	validate,
	validateOn = 'touched',
	onSubmit,
	onSettled,
	onReset,
	disabled,
	className,
	children,
	...props
}: FormProps<T>) {
	const { formState, store, actions, handleSubmit, handleReset } = useFormReducer({
		defaultValues,
		values,
		validate,
		validateOn,
		onSubmit,
		onSettled,
		onReset,
	})

	return (
		<FormProvider store={store} actions={actions}>
			<form
				data-slot="form"
				onSubmit={handleSubmit}
				onReset={handleReset}
				className={cn('contents', className)}
				{...props}
			>
				<Fieldset disabled={disabled || formState.submitting} className="contents">
					{children}
				</Fieldset>
			</form>
		</FormProvider>
	)
}
