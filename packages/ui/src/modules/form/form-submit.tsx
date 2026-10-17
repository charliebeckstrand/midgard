'use client'

import { Button, type ButtonProps } from '../../components/button'
import { useFormStatus } from '../../primitives/form/context'

/** Props for {@link FormSubmit}: the props of a `Button`, with no `href` and no `type`. */
export type FormSubmitProps = Omit<ButtonProps & { href?: never }, 'href' | 'type'>

/**
 * The submit button of a `Form`. It shows the `loading` state of `Button`
 * while a submit is in flight.
 *
 * @remarks
 * It is a `type="submit"` button, so a click or the Enter key in a field
 * submits the enclosing form. The loading state cancels each activation, so a
 * second click starts no second submit. A `loading` prop also sets the state.
 * Outside a `Form`, it is a plain submit button.
 */
export function FormSubmit({ loading, ...props }: FormSubmitProps) {
	const submitting = useFormStatus()?.submitting === true

	return <Button data-slot="form-submit" {...props} loading={loading || submitting} type="submit" />
}
