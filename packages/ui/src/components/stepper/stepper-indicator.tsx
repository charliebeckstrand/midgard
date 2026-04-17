'use client'

import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives'
import { useStepper, useStepperStep } from './context'
import { k } from './variants'

export type StepperIndicatorProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'span'>, 'className'>

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
				<ActiveIndicator className={cn(k.activeIndicator)} style={{ borderRadius: '9999px' }} />
			)}
		</span>
	)
}
