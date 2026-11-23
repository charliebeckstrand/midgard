'use client'

import type { ComponentProps, ReactNode } from 'react'
import { Alert } from '../../components/alert'
import { useFormError, useFormErrorWrites } from '../../primitives/form/context'

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
 * `zodResolver` schema set the issue. The next submit and a reset clear it.
 * The alert has no close button: a closed alert unmounts with the focus in it,
 * and the issue stays until the next submit or a reset.
 *
 * The alert is an error `Alert` (`role="alert"`), so a screen reader speaks the
 * issue when it shows. Each write of the issue shows a new alert, so a screen
 * reader speaks the issue again when a second submit fails with the same issue.
 * A handler that sets the issue and then waits for more work gets one
 * announcement, not a second one when the attempt settles.
 *
 * After a failed submit, a `FormErrorSummary` lists the issue of the whole
 * form as its first row. Thus a form with a summary needs no `FormError` when
 * only a failed submit sets the issue. The summary shows nothing until a
 * submit fails, so a form that sets the issue at another time needs a
 * `FormError`. An example is a call of `setFormError` from a control outside
 * the submit.
 */
export function FormError({ title, ...props }: FormErrorProps) {
	const formError = useFormError()

	// A refusal by the rule of the whole form keeps the same issue from the last
	// refusal, and a live region does not speak text that does not change. A new
	// key for each write mounts a new alert, which the screen reader speaks. The
	// failure of the attempt is not a write, so it does not speak the issue again.
	const writes = useFormErrorWrites()

	if (formError === null) return null

	return (
		<Alert
			key={writes}
			data-slot="form-error"
			{...props}
			severity="error"
			title={title}
			description={formError}
		/>
	)
}
