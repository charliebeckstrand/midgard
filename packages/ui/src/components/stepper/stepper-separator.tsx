'use client'

import type { HTMLAttributes, Ref } from 'react'
import { cn } from '../../core'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { k } from '../../recipes/kata/stepper'
import { useStepper } from './context'

/** Props for {@link StepperSeparator}: `className`, a `ref`, and HTML attributes. */
export type StepperSeparatorProps = {
	className?: string
	/**
	 * The ref of the separator.
	 *
	 * @remarks
	 * The separator is a `<div>` in an interactive stepper and an `<li>` in a
	 * display-only stepper, so the ref type is `HTMLElement`.
	 */
	ref?: Ref<HTMLElement>
} & Omit<HTMLAttributes<HTMLElement>, 'className'>

/**
 * Decorative connector rule drawn between adjacent {@link StepperStep}s,
 * oriented along the stepper's axis from context. It is `aria-hidden`, so it
 * carries no semantics for assistive tech.
 *
 * @remarks
 * In an interactive stepper it is a `<div>` with `role="presentation"`. In a
 * display-only stepper it is an `<li>`, because the row is an `<ol>`. The
 * `aria-hidden` keeps it out of the step count.
 */
export function StepperSeparator({ className, ref, ...props }: StepperSeparatorProps) {
	const { layout, onValueChange } = useStepper()

	const composedRef = useComposedRef<HTMLElement>(ref)

	const classes = cn(k.separator({ orientation: layout }), className)

	// A display-only row is an <ol>, which holds only <li> children.
	if (onValueChange === undefined) {
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

	return (
		<div
			data-slot="stepper-separator"
			role="presentation"
			aria-hidden="true"
			className={classes}
			{...props}
			ref={composedRef}
		/>
	)
}
