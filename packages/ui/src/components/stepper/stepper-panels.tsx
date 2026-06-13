import type { ComponentPropsWithoutRef } from 'react'

/** Props for {@link StepperPanels}: `className` plus `<div>` attributes. */
export type StepperPanelsProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Container grouping the {@link StepperPanel}s of a {@link Stepper}. The
 * presence of this group below the step row drives whether steps wire
 * `aria-controls` to their panels and switches the stepper into a stacked
 * row-plus-panels layout.
 */
export function StepperPanels({ className, children, ...props }: StepperPanelsProps) {
	return (
		<div data-slot="stepper-panels" className={className} {...props}>
			{children}
		</div>
	)
}
