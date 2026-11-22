'use client'

import type { ComponentProps, ReactNode } from 'react'
import { Alert } from '../../components/alert'
import { useFormActions, useFormError } from '../../primitives/form/context'

/** Props for {@link FormError}: the `title` of the alert, atop the native attributes of its `<div>`. */
export type FormErrorProps = Omit<ComponentProps<'div'>, 'title' | 'color' | 'children'> & {
	/** The heading of the alert, above the issue. @defaultValue no heading */
	title?: ReactNode
}

/**
 * The issue of the whole form of the enclosing `Form`: an issue that is about
 * no one field, such as "Invalid credentials". It shows as an error `Alert`
 * while the form holds the issue, and renders nothing otherwise.
 *
 * @remarks
 * A `{ formError }` return of `onSubmit`, `helpers.setFormError`,
 * `useFormActions().setFormError`, and the issue of the whole form of a
 * `zodResolver` schema set the issue. The next submit and a reset clear it, and
 * so does the close button of the alert.
 *
 * The alert is an error `Alert` (`role="alert"`), so a screen reader speaks the
 * issue when it shows. After a failed submit, a `FormErrorSummary` lists the
 * issue of the whole form as its first row. Thus a form with a summary needs
 * no `FormError` when only a failed submit sets the issue. The summary shows
 * nothing until a submit fails, so a form that sets the issue at another time
 * needs a `FormError`. An example is a call of `setFormError` from a control
 * outside the submit.
 */
export function FormError({ title, ...props }: FormErrorProps) {
	const formError = useFormError()

	const actions = useFormActions()

	if (formError === null) return null

	return (
		<Alert
			data-slot="form-error"
			{...props}
			severity="error"
			title={title}
			description={formError}
			closable
			open
			onOpenChange={(open) => {
				if (!open) actions?.setFormError(null)
			}}
		/>
	)
}
