'use client'

import { type ComponentPropsWithoutRef, useEffect } from 'react'
import { cn } from '../../core'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/fieldset'
import { useControl } from '../control/context'

/**
 * Props for {@link Label}: the optional `htmlFor` override (defaults to the
 * enclosing control id) plus the native `<label>` attributes.
 */
export type LabelProps = {
	className?: string
	htmlFor?: string
} & Omit<ComponentPropsWithoutRef<'label'>, 'className'>

/**
 * Caption for a single form control, rendered as a `<label>`. Defaults `htmlFor`
 * to the enclosing `<Field>`/`<Control>` id and registers its own id so the
 * control can name itself via `aria-labelledby`; resolves type scale from the
 * Density cascade.
 */
export function Label({ className, htmlFor, id, ...props }: LabelProps) {
	const control = useControl()

	const { size } = useDensity()

	// Registers while mounted; the field's `labelledBy` references this id only
	// while the Label renders.
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
