'use client'

import { type ComponentPropsWithoutRef, useEffect } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/fieldset'
import { useControl } from '../control/context'

export type DescriptionProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'p'>, 'className'>

export function Description({ className, id, ...props }: DescriptionProps) {
	const control = useControl()

	const { size } = useDensity()

	// Registers while mounted so the field's aria-describedby only references
	// this id while the Description is rendered.
	const registerDescription = control?.registerDescription

	useEffect(() => registerDescription?.(id), [registerDescription, id])

	return (
		<p
			data-slot="description"
			id={id ?? control?.descriptionId}
			className={cn(k.description({ size }), className)}
			{...props}
		/>
	)
}
