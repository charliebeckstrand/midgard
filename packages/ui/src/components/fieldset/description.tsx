'use client'

import { cn } from '../../core'
import { useControl } from '../control/context'
import { k } from './variants'

export type DescriptionProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function Description({ className, id, ...props }: DescriptionProps) {
	const control = useControl()
	return (
		<p
			data-slot="description"
			id={id ?? (control ? `${control.id}-description` : undefined)}
			className={cn(k.description, className)}
			{...props}
		/>
	)
}
