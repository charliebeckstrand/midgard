'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/fieldset'
import { useControl } from '../control/context'

export type LabelProps = {
	className?: string
	htmlFor?: string
} & Omit<ComponentPropsWithoutRef<'label'>, 'className'>

export function Label({ className, htmlFor, ...props }: LabelProps) {
	const control = useControl()
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is passed by the consumer or the label wraps its control
		<label
			data-slot="label"
			htmlFor={htmlFor ?? control?.id}
			className={cn(k.label, className)}
			{...props}
		/>
	)
}
