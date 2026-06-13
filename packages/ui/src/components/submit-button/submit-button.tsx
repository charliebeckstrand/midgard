'use client'

import { Button, type ButtonProps } from '../button'
import { useFormStatus } from '../form'

/**
 * Props for {@link SubmitButton}: the non-anchor {@link ButtonProps} branch
 * minus `type` and `loading`, which the component owns.
 */
// `ButtonProps` distributes over `href` (button vs. anchor). Narrow to the
// button branch first so native props like `disabled` survive the `Omit`.
export type SubmitButtonProps = Omit<Extract<ButtonProps, { href?: never }>, 'type' | 'loading'>

/**
 * Submit button bound to the enclosing `<Form>`. Reflects `submitting` via
 * `loading`; falls back to `type="submit"` outside a Form. Doesn't auto-disable
 * on validity; submitting an invalid form runs full validation and surfaces
 * every error.
 */
export function SubmitButton({ disabled, children, ...props }: SubmitButtonProps) {
	const status = useFormStatus()

	const submitting = status?.submitting ?? false

	return (
		<Button
			data-slot="submit-button"
			{...props}
			type="submit"
			loading={submitting}
			disabled={disabled || submitting}
		>
			{children}
		</Button>
	)
}
