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
 * While each field holds its default value, a reset changes no value. The
 * button is then `aria-disabled`, and a click does nothing. The button stays
 * enabled, so it keeps the focus after the reset that it starts. While a submit
 * runs, the form locks its parts, and the button is inert as each `Button` is.
 * Outside a `Form`, it is a plain reset button.
 */
export function FormReset({ onClick, ...props }: FormResetProps) {
	const status = useFormStatus()

	const clean = status !== undefined && !status.dirty

	// A click on a clean form does not reset it. The consumer handler runs first.
	const handleClick = composeEventHandlers(onClick, (event: MouseEvent<HTMLButtonElement>) => {
		if (clean) event.preventDefault()
	})

	return (
		<Button
			data-slot="form-reset"
			{...props}
			onClick={handleClick}
			aria-disabled={ariaAttr(clean)}
			data-disabled={dataAttr(clean)}
			type="reset"
		/>
	)
}
