'use client'

import { type ComponentProps, type ReactNode, useState } from 'react'
import { ControlLockContext, ControlTargetsContext } from '../../components/control/context'
import { Fieldset } from '../../components/fieldset'
import { cn } from '../../core'
import { useA11yAnnouncements } from '../../hooks'
import { FormProvider } from '../../primitives/form/context'
import { createFormFieldTargets } from '../../primitives/form/form-field-targets'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import type { FormSubmitHandler, SubmitOutcome, ValidateOn, Validators } from './engine/types'
import { useFormReducer } from './use-form-reducer'

const messages = defineMessages({
	submitting: {
		id: 'ui.form.submitting',
		defaultMessage: 'Submitting',
		description: 'Spoken while a form sends its values, after the reader submits it.',
	},
})

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
	 * @defaultValue 'touched'
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
	 * Every field present carries at least one issue, so the list is never empty.
	 */
	onInvalidSubmit?: (errors: Partial<Record<keyof T, string[]>>) => void
	onReset?: () => void
	/**
	 * Disables the form's `<Fieldset>`, and with it each control and button of
	 * the form. A submit makes only the fields read-only.
	 * @defaultValue false
	 */
	disabled?: boolean
	children: ReactNode
} & Omit<ComponentProps<'form'>, 'onSubmit' | 'onReset' | 'children' | 'values'>

/**
 * Reducer-backed form scope over typed `defaultValues`: tracks dirty, touched,
 * errors, and submitting state, validates on the `validateOn` trigger, and
 * locks its parts while submitting. Renders a layout-neutral
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
 * guards against superseding resets/unmounts via a monotonic token. A native
 * reset of the `<form>` does not change the inputs: the form cancels it and
 * resets its bound fields.
 *
 * While a submit runs, the form announces it politely and locks its parts. It
 * locks the Control scope, so each field is read-only and each `Button` is
 * inert, and a bound control cannot write its field. Nothing is disabled, so
 * the focused field or button keeps the focus. The form ignores a second
 * submit until the first one ends. A native element that does not bind or
 * read the scope, such as a bare `<input>`, stays editable.
 *
 * The `<form>` sets `noValidate`, so a native constraint such as `type="url"` or
 * `required` never stops a submit before the validators run. Otherwise the
 * browser bubble takes the place of the app message, and the other fields show
 * no error. Each constraint therefore needs a validator. Pass
 * `noValidate={false}` to turn native validation back on.
 *
 * The parts of the module act on the state of the form. Put a
 * {@link FormSubmit}, a {@link FormReset}, or a {@link FormErrorSummary}
 * anywhere inside the form.
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
	const intl = useIntl()

	const { formState, store, actions, handleSubmit, handleReset, resets, failures } = useFormReducer(
		{
			defaultValues,
			values,
			validate,
			validateOn,
			onSubmit,
			onSettled,
			onInvalidSubmit,
			onReset,
		},
	)

	// The controls of the form register their ids here, and FormErrorSummary
	// reads them.
	const [targets] = useState(createFormFieldTargets)

	// Only the busy state of FormSubmit shows that a submit runs, and a screen
	// reader does not speak it. The empty message ends the run, so each submit
	// speaks again.
	useA11yAnnouncements(formState.submitting ? intl.formatMessage(messages.submitting) : '')

	return (
		<FormProvider
			store={store}
			actions={actions}
			resets={resets}
			failures={failures}
			locked={formState.submitting}
			targets={targets}
		>
			<form
				data-slot="form"
				noValidate
				onSubmit={handleSubmit}
				onReset={handleReset}
				className={cn('contents', className)}
				{...props}
			>
				{/* The fieldset only cascades `disabled`. It has no legend, so `role="none"`
				keeps it from an unnamed `group` around every form. */}
				<Fieldset role="none" disabled={disabled} className="contents">
					<ControlTargetsContext value={targets}>
						<ControlLockContext value={formState.submitting}>{children}</ControlLockContext>
					</ControlTargetsContext>
				</Fieldset>
			</form>
		</FormProvider>
	)
}
