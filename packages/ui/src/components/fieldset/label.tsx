'use client'

import { type ComponentPropsWithoutRef, useEffect } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/fieldset'
import { useControl } from '../control/context'

export type LabelProps = {
	className?: string
	htmlFor?: string
} & Omit<ComponentPropsWithoutRef<'label'>, 'className'>

export function Label({ className, htmlFor, id, ...props }: LabelProps) {
	const control = useControl()

	const { size } = useDensity()

	// Registers while mounted so the field's `labelledBy` only references this id
	// while the Label is rendered, keeping the reference live and accurate.
	const registerLabel = control?.registerLabel

	useEffect(() => registerLabel?.(id), [registerLabel, id])

	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is passed by the consumer or the label wraps its control
		<label
			data-slot="label"
			id={id ?? control?.labelId}
			htmlFor={htmlFor ?? control?.id}
			className={cn(k.label({ size }), className)}
			{...props}
		/>
	)
}
