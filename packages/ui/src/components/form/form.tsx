'use client'

import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../core'
import { Fieldset } from '../fieldset'
import { FormProvider } from './context'
import type { Errors, ValidateOn, Validators } from './form-reducer'
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
	/**
	 * Seed values and field schema; keys and types define the form. Single source
	 * of truth for bound controls' initial state — a bound control's
	 * `defaultValue`/`defaultChecked` is ignored (CONVENTIONS §7.2).
	 */
	defaultValues: T
	/**
	 * Controlled re-sync source. Reference change → `values` replaced and the
	 * dirty baseline shifts; `touched`, `errors`, and `submitting` stay put.
	 * Passing `undefined` re-syncs to `defaultValues` under the same contract.
	 * Pass a stable reference; a new derived object each render loops the sync.
	 */
	values?: T
	/** Per-field validators; compose one from a schema via {@link zodResolver}. */
	validate?: Validators<T>
	/**
	 * When validators run.
	 * @defaultValue `'touched'`
	 */
	validateOn?: ValidateOn
	onSubmit?: FormSubmitHandler<T>
	onSettled?: (outcome: SubmitOutcome<T>) => void
	/**
	 * Fires when client validation refuses a submit, with the failed fields only.
	 *
	 * A refused submit returns before `onSubmit`, and `onSettled` reports only a
	 * terminal outcome, so nothing else marks the attempt. To the caller a refused
	 * submit and no submit look the same. Use this callback to scroll to the first
	 * error, to count the attempt, or to announce the refusal. Server-side issues
	 * arrive through `helpers.setErrors` or a `{ fieldErrors }` return, not here.
	 */
	onInvalidSubmit?: (errors: Errors) => void
	onReset?: () => void
	/** Disables the form's `<Fieldset>`; submitting disables it regardless. */
	disabled?: boolean
	className?: string
	children: ReactNode
} & Omit<ComponentProps<'form'>, 'onSubmit' | 'onReset' | 'children' | 'className' | 'values'>

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
	onInvalidSubmit,
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
		onInvalidSubmit,
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
