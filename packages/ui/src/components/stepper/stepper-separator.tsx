'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { k } from '../../recipes/kata/stepper'
import { useStepper } from './context'

/** Props for {@link StepperSeparator}: `className` plus `<li>` attributes, `ref` included. */
export type StepperSeparatorProps = {
	className?: string
} & Omit<ComponentProps<'li'>, 'className'>

/**
 * Decorative connector rule drawn between adjacent {@link StepperStep}s,
 * oriented along the stepper's axis from context. It is `aria-hidden`, so it
 * carries no semantics for assistive tech.
 *
 * @remarks
 * It is an `<li>`, because the steps are in an `<ol>` in an interactive and in
 * a display-only stepper. The `aria-hidden` keeps it out of the step count.
 * The `ref` gets the `<li>` as an `HTMLLIElement`.
 */
export function StepperSeparator({ className, ref, ...props }: StepperSeparatorProps) {
	const { layout } = useStepper()

	const composedRef = useComposedRef<HTMLLIElement>(ref)

	const classes = cn(k.separator({ orientation: layout }), className)

	// The row is an <ol>, which holds only <li> children.
	return (
		<li
			data-slot="stepper-separator"
			aria-hidden="true"
			className={classes}
			{...props}
			ref={composedRef}
		/>
	)
}
