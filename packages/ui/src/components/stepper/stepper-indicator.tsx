'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/stepper'
import { useStepper, useStepperStep } from './context'

/** Props for {@link StepperIndicator}: `className` plus `<span>` attributes. */
export type StepperIndicatorProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className'>

// Completed/current/upcoming differ visually by color and the checkmark
// glyph only (WCAG 1.4.1); the sr-only suffix names the state for AT.
const STATE_TEXT = {
	completed: 'completed',
	current: 'current step',
	upcoming: 'not started',
} as const

/**
 * The leading marker of a {@link StepperStep} (number, checkmark, or dot)
 * styled by the step's state. Renders an animated `<ActiveIndicator>` overlay on
 * the current step and an `interactive` variant when the stepper is navigable.
 *
 * @remarks
 * State reads visually through color and the checkmark glyph alone, so an
 * `sr-only` suffix ("completed"/"current step"/"not started") names it for
 * assistive tech (WCAG 1.4.1). `<StepperStep>` injects a default instance when
 * the consumer omits one.
 */
export function StepperIndicator({ className, ...props }: StepperIndicatorProps) {
	const { onValueChange } = useStepper()
	const { state } = useStepperStep()

	const interactive = onValueChange !== undefined

	return (
		<span
			data-slot="stepper-indicator"
			data-display-state={state}
			className={cn(k.indicator.base, interactive && k.indicator.interactive, className)}
			{...props}
		>
			{state === 'current' && (
				<ActiveIndicator className={cn(k.indicator.active)} style={{ borderRadius: '9999px' }} />
			)}
			<span className="sr-only">, {STATE_TEXT[state]}</span>
		</span>
	)
}
