'use client'

import { type ComponentProps, useEffect } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/fieldset'
import { useControl } from '../control/context'

/** Props for {@link Description}: the native `<p>` attributes plus `className`. */
export type DescriptionProps = {
	className?: string
} & Omit<ComponentProps<'p'>, 'className'>

/**
 * Help text for a form control, rendered as a `<p>`. While mounted it registers
 * its id with the enclosing `<Field>`/`<Control>`, which folds it into the
 * control's `aria-describedby`. Its type scale takes the step of the nearest
 * density scope.
 */
export function Description({ className, id, ...props }: DescriptionProps) {
	const control = useControl()

	// Registers while mounted; the field's aria-describedby references this id
	// only while the Description renders.
	const registerDescription = control?.registerDescription

	useEffect(() => registerDescription?.(id), [registerDescription, id])

	return (
		<p
			data-slot="description"
			id={id ?? control?.descriptionId}
			className={cn(k.description(), className)}
			{...props}
		/>
	)
}
