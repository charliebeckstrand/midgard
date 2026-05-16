'use client'

import type { ComponentPropsWithoutRef } from 'react'
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
} & Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'name'>

export function Message({
	variant = 'error',
	className,
	id,
	name,
	children,
	...props
}: MessageProps) {
	const control = useControl()

	const field = useFormField(name)

	const { size } = useDensity()

	// When form-bound, only the error variant auto-renders from the field's error.
	// Other variants render their children verbatim.
	const isFormBoundError = variant === 'error' && field !== undefined

	if (isFormBoundError && !field.error) return null

	const content = isFormBoundError ? field.error : children

	return (
		<p
			data-slot="message"
			data-variant={variant}
			id={id ?? (control ? `${control.id}-${variant}` : undefined)}
			className={cn(k.message.base({ size }), k.message[variant], className)}
			{...props}
		>
			{content}
		</p>
	)
}
