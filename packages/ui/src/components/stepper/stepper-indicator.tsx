'use client'

import { Check } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/stepper'
import { useStepper, useStepperStep } from './context'

/** Props for {@link StepperIndicator}: `className` plus `<span>` attributes. */
export type StepperIndicatorProps = {
	className?: string
} & Omit<ComponentProps<'span'>, 'className'>

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
 * assistive tech (WCAG 1.4.1). A completed step fills blue and draws a
 * checkmark. `<StepperStep>` injects a default instance when the consumer omits
 * one. Pass a number or another glyph as `children` to replace the checkmark; it
 * renders ahead of the `sr-only` suffix.
 */
export function StepperIndicator({ className, children, ...props }: StepperIndicatorProps) {
	const { onValueChange } = useStepper()
	const { state } = useStepperStep()

	const interactive = onValueChange !== undefined

	return (
		<span
			data-slot="stepper-indicator"
			className={cn(
				k.indicator.base,
				interactive && k.indicator.interactive,
				state === 'completed' && k.indicator.completed,
				className,
			)}
			{...props}
		>
			{state === 'current' && (
				<ActiveIndicator className={cn(k.indicator.active)} style={{ borderRadius: '9999px' }} />
			)}
			{children ??
				(state === 'completed' && <Check aria-hidden="true" className={k.indicator.check} />)}
			<span className="sr-only">, {STATE_TEXT[state]}</span>
		</span>
	)
}
