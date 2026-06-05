'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { useStepper } from './context'

export type StepperPanelProps = {
	value: number
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function StepperPanel({ value, className, children, ...props }: StepperPanelProps) {
	const { value: currentValue, baseId } = useStepper()

	if (value !== currentValue) return null

	return (
		<section
			id={`${baseId}-panel-${value}`}
			aria-labelledby={`${baseId}-step-${value}`}
			data-slot="stepper-panel"
			className={className}
			{...props}
		>
			{children}
		</section>
	)
}
