'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ActiveIndicator } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/stepper'
import { useStepper, useStepperStep } from './context'

export type StepperIndicatorProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'span'>, 'className'>

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
		</span>
	)
}
