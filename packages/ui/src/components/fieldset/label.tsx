'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useConcentric } from '../../primitives'
import { k } from '../../recipes/kata/fieldset'
import { useControl } from '../control/context'

export type LabelProps = {
	className?: string
	htmlFor?: string
} & Omit<ComponentPropsWithoutRef<'label'>, 'className'>

export function Label({ className, htmlFor, ...props }: LabelProps) {
	const control = useControl()

	const concentric = useConcentric()

	const size = control?.size ?? concentric?.size

	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is passed by the consumer or the label wraps its control
		<label
			data-slot="label"
			htmlFor={htmlFor ?? control?.id}
			className={cn(k.label({ size }), className)}
			{...props}
		/>
	)
}
