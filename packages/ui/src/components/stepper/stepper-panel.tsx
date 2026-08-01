'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { Hold, useMountHold } from '../../primitives/mount'
import { useStepper } from './context'

/** Props for {@link StepperPanel}: the step `value` it belongs to, plus `<div>` attributes. */
export type StepperPanelProps = {
	value: number
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

/**
 * Content region for a single step, shown while its `value` matches the
 * stepper's current value. Emits a `<section>` whose disclosure ids match the
 * corresponding {@link StepperStep} for `aria-controls` wiring. Place inside
 * {@link StepperPanels}.
 *
 * @remarks
 * The stepper's `mount` policy decides what happens off the current step. Under
 * the default `active` the panel renders nothing, so leaving the step discards
 * its state; under `lazy` or `always` it is held in `<Activity mode="hidden">`
 * instead — kept in the DOM with its state and scroll position intact, its
 * effects torn down, and its re-renders deferred until it is shown again. The
 * panel has no transition to wait on, so the hold takes effect on the step
 * change itself.
 */
export function StepperPanel({ value, className, children, ...props }: StepperPanelProps) {
	const { value: currentValue, baseId, mount } = useStepper()

	// Derives the same ids as the matching StepperStep via the shared baseId + value.
	const { panelProps } = useA11yDisclosure({ id: baseId, key: value })

	const hold = useMountHold(value === currentValue, mount)

	if (!hold.present) return null

	return (
		<Hold hold={hold} name="stepper-panel">
			<section {...panelProps} data-slot="stepper-panel" className={className} {...props}>
				{children}
			</section>
		</Hold>
	)
}
