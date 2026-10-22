'use client'

import { Check } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { useStepper, useStepperStep } from './context'

/** Props for {@link StepperIndicator}: `className` plus `<span>` attributes. */
export type StepperIndicatorProps = ComponentProps<'span'>

/**
 * The leading marker of a {@link StepperStep} (number, checkmark, or dot)
 * styled by the step's state. Renders an animated `<ActiveIndicator>` overlay on
 * the current step, and a hover and a focus mark when the stepper is navigable.
 *
 * @remarks
 * A completed step fills green and draws a checkmark. `<StepperStep>` injects a
 * default instance when the consumer omits one, and names the state for
 * assistive tech after the title. Pass a number or another glyph as `children`
 * to replace the checkmark. On the current step, it paints in white above the
 * blue fill.
 */
export function StepperIndicator({ className, children, ...props }: StepperIndicatorProps) {
	const { slots } = useStepper()
	const { state } = useStepperStep()

	const content =
		children ?? (state === 'completed' && <Check aria-hidden="true" className={slots.check} />)

	return (
		<span data-slot="stepper-indicator" className={cn(slots.indicator, className)} {...props}>
			{state === 'current' && (
				<ActiveIndicator className={slots.fill} style={{ borderRadius: '9999px' }} />
			)}
			{content !== false && <span className={slots.glyph}>{content}</span>}
		</span>
	)
}
