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
// glyph only (WCAG 1.4.1); the sr-only suffix names the state for AT. The
// current step has no suffix: its aria-current="step" already reads as
// "current step".
const STATE_TEXT = {
	completed: 'completed',
	current: undefined,
	upcoming: 'not started',
} as const

/**
 * The leading marker of a {@link StepperStep} (number, checkmark, or dot)
 * styled by the step's state. Renders an animated `<ActiveIndicator>` overlay on
 * the current step and an `interactive` variant when the stepper is navigable.
 *
 * @remarks
 * State reads visually through color and the checkmark glyph alone, so an
 * `sr-only` suffix ("completed"/"not started") names it for assistive tech
 * (WCAG 1.4.1). The current step has no suffix, because the
 * `aria-current="step"` of its step already gives "current step". A completed
 * step fills green and draws a checkmark. `<StepperStep>` injects a default
 * instance when the consumer omits one. Pass a number or another glyph as `children` to replace the checkmark; it
 * renders ahead of the `sr-only` suffix. On the current step, it paints in white
 * above the blue fill.
 */
export function StepperIndicator({ className, children, ...props }: StepperIndicatorProps) {
	const { onValueChange } = useStepper()
	const { state } = useStepperStep()

	const interactive = onValueChange !== undefined

	const content =
		children ??
		(state === 'completed' && <Check aria-hidden="true" className={k.indicator.check} />)

	return (
		<span
			data-slot="stepper-indicator"
			className={cn(
				k.indicator.base,
				interactive && k.indicator.interactive,
				state === 'current' && k.indicator.current,
				state === 'completed' && k.indicator.completed,
				className,
			)}
			{...props}
		>
			{state === 'current' && (
				<ActiveIndicator className={cn(k.indicator.active)} style={{ borderRadius: '9999px' }} />
			)}
			{content !== false && <span className={cn(k.indicator.content)}>{content}</span>}
			{STATE_TEXT[state] && <span className="sr-only">, {STATE_TEXT[state]}</span>}
		</span>
	)
}
