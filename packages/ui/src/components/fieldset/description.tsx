'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useConcentric } from '../../primitives'
import { k } from '../../recipes/kata/fieldset'
import { useControl } from '../control/context'

export type DescriptionProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'p'>, 'className'>

export function Description({ className, id, ...props }: DescriptionProps) {
	const control = useControl()

	const concentric = useConcentric()

	const size = control?.size ?? concentric?.size

	return (
		<p
			data-slot="description"
			id={id ?? (control ? `${control.id}-description` : undefined)}
			className={cn(k.description({ size }), className)}
			{...props}
		/>
	)
}
