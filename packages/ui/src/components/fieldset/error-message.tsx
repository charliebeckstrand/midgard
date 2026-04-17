'use client'

import { cn } from '../../core'
import { useControl } from '../control/context'
import { useFormField } from '../form/context'
import { k } from './variants'

export type ErrorMessageProps = {
	className?: string
	name?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className' | 'name'>

export function ErrorMessage({ className, id, name, children, ...props }: ErrorMessageProps) {
	const control = useControl()
	const field = useFormField(name)

	const content = field !== undefined ? field.error : children

	// When form-bound, only render if there is an error
	if (field !== undefined && !field.error) return null

	return (
		<p
			data-slot="error"
			id={id ?? (control ? `${control.id}-error` : undefined)}
			className={cn(k.error, className)}
			{...props}
		>
			{content}
		</p>
	)
}
