'use client'

import type { MouseEvent } from 'react'
import { Button, type ButtonProps } from '../../components/button'
import { ariaAttr, composeEventHandlers, dataAttr } from '../../core'
import { useFormStatus } from '../../primitives/form/context'

/** Props for {@link FormReset}: the props of a `Button`, with no `href` and no `type`. */
export type FormResetProps = Omit<ButtonProps & { href?: never }, 'href' | 'type'>

/**
 * The reset button of a `Form`. It sets each field back to its default value,
 * and clears the errors and the touched marks.
 *
 * @remarks
 * While each field holds its default value, a reset changes no value. While a
 * submit runs, a reset would discard the result of the submit. In both states
 * the button is `aria-disabled`, and a click does nothing. The button stays
 * enabled, so it keeps the focus. Outside a `Form`, it is a plain reset button.
 */
export function FormReset({ onClick, ...props }: FormResetProps) {
	const status = useFormStatus()

	const idle = status !== undefined && (!status.dirty || status.submitting)

	// A click on a clean or submitting form does not reset it. The consumer
	// handler runs first.
	const handleClick = composeEventHandlers(onClick, (event: MouseEvent<HTMLButtonElement>) => {
		if (idle) event.preventDefault()
	})

	return (
		<Button
			data-slot="form-reset"
			{...props}
			onClick={handleClick}
			aria-disabled={ariaAttr(idle)}
			data-disabled={dataAttr(idle)}
			type="reset"
		/>
	)
}
