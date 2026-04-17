'use client'

import { useStepper } from './context'

export type StepperPanelProps = {
	value: number
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function StepperPanel({ value, className, children, ...props }: StepperPanelProps) {
	const { value: currentValue } = useStepper()

	if (value !== currentValue) return null

	return (
		<div data-slot="stepper-panel" className={className} {...props}>
			{children}
		</div>
	)
}
