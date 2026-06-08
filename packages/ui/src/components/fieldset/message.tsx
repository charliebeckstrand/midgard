'use client'

import { type ComponentPropsWithoutRef, useEffect } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/fieldset'
import { useControl } from '../control/context'
import { useFormField } from '../form/context'

export type MessageVariant = 'error' | 'success'

export type MessageProps = {
	variant?: MessageVariant
	className?: string
	name?: string
	/** When form-bound and the field has multiple errors, render every one as a list. Defaults to the first error only. */
	all?: boolean
} & Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'name'>

export function Message({
	variant = 'error',
	className,
	id,
	name,
	all,
	children,
	...props
}: MessageProps) {
	const control = useControl()

	const field = useFormField(name)

	const { size } = useDensity()

	// When form-bound, only the error variant auto-renders from the field's errors.
	// Other variants render their children verbatim.
	const isFormBoundError = variant === 'error' && field !== undefined

	const issues = isFormBoundError ? field.errors : undefined

	// Error messages register so aria-describedby references the id only while
	// the message is rendered. Registered before the early return to keep hook
	// order stable. Success messages are not field descriptions and don't register.
	const rendersError =
		variant === 'error' && (isFormBoundError ? (issues?.length ?? 0) > 0 : children != null)

	const registerMessage = control?.registerMessage

	useEffect(() => {
		if (!rendersError) return

		return registerMessage?.()
	}, [rendersError, registerMessage])

	if (isFormBoundError && (!issues || issues.length === 0)) return null

	const elementId =
		id ??
		(variant === 'error' ? control?.messageId : control ? `${control.id}-${variant}` : undefined)

	const className_ = cn(k.message({ size, variant }), className)

	// Errors use `role="alert"` (assertive); success feedback uses `role="status"` (polite).
	const role = variant === 'error' ? 'alert' : 'status'

	if (isFormBoundError && issues && all && issues.length > 1) {
		return (
			<ul
				data-slot="message"
				data-variant={variant}
				id={elementId}
				role={role}
				className={className_}
			>
				{issues.map((issue) => (
					<li key={issue}>{issue}</li>
				))}
			</ul>
		)
	}

	const content = isFormBoundError && issues ? issues[0] : children

	return (
		<p
			data-slot="message"
			data-variant={variant}
			id={elementId}
			role={role}
			className={className_}
			{...props}
		>
			{content}
		</p>
	)
}
