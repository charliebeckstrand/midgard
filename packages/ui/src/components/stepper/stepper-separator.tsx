'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stepper'
import { useStepper } from './context'

/** Props for {@link StepperSeparator}: `className` plus `<div>` attributes. */
export type StepperSeparatorProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Decorative connector rule drawn between adjacent {@link StepperStep}s,
 * oriented along the stepper's axis from context. Marked `role="presentation"`
 * and `aria-hidden`, so it carries no semantics for assistive tech.
 */
export function StepperSeparator({ className, ...props }: StepperSeparatorProps) {
	const { orientation } = useStepper()

	return (
		<div
			data-slot="stepper-separator"
			role="presentation"
			aria-hidden="true"
			className={cn(k.separator({ orientation }), className)}
			{...props}
		/>
	)
}
