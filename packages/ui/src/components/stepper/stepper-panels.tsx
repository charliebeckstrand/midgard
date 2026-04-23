import type { ComponentPropsWithoutRef } from 'react'
export type StepperPanelsProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

export function StepperPanels({ className, children, ...props }: StepperPanelsProps) {
	return (
		<div data-slot="stepper-panels" className={className} {...props}>
			{children}
		</div>
	)
}
