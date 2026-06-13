'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { useStepper } from './context'

/** Props for {@link StepperPanel}: the step `value` it belongs to, plus `<div>` attributes. */
export type StepperPanelProps = {
	value: number
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Content region for a single step, shown only while its `value` matches the
 * stepper's current value (otherwise renders nothing). Emits a `<section>` whose
 * disclosure ids match the corresponding {@link StepperStep} for `aria-controls`
 * wiring. Place inside {@link StepperPanels}.
 */
export function StepperPanel({ value, className, children, ...props }: StepperPanelProps) {
	const { value: currentValue, baseId } = useStepper()

	// Derives the same ids as the matching StepperStep via the shared baseId + value.
	const { panelProps } = useA11yDisclosure({ id: baseId, key: value })

	if (value !== currentValue) return null

	return (
		<section {...panelProps} data-slot="stepper-panel" className={className} {...props}>
			{children}
		</section>
	)
}
