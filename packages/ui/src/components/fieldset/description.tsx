'use client'

import { type ComponentPropsWithoutRef, useEffect } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/fieldset'
import { useControl } from '../control/context'

/** Props for {@link Description}: the native `<p>` attributes plus `className`. */
export type DescriptionProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'p'>, 'className'>

/**
 * Help text for a form control, rendered as a `<p>`. While mounted it registers
 * its id with the enclosing `<Field>`/`<Control>`, which folds it into the
 * control's `aria-describedby`; resolves type scale from the Density cascade.
 */
export function Description({ className, id, ...props }: DescriptionProps) {
	const control = useControl()

	const { size } = useDensity()

	// Registers while mounted; the field's aria-describedby references this id
	// only while the Description renders.
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
