'use client'

import { Children, isValidElement, type ReactNode, useMemo } from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { k } from '../../recipes/kata/stepper'
import { StepperStepContext, type StepState, useStepper } from './context'
import { StepperIndicator } from './stepper-indicator'

/** Props for {@link StepperStep}: the step's `value` index, an optional `disabled` flag, and child indicator/title/description content. */
export type StepperStepProps = {
	value: number
	disabled?: boolean
	className?: string
	children?: ReactNode
}

function computeState(stepValue: number, value: number): StepState {
	if (stepValue < value) return 'completed'
	if (stepValue === value) return 'current'

	return 'upcoming'
}

function partitionVerticalChildren(children: ReactNode): ReactNode {
	const indicators: ReactNode[] = []

	const rest: ReactNode[] = []

	Children.forEach(children, (child) => {
		if (isValidElement(child) && child.type === StepperIndicator) {
			indicators.push(child)
		} else {
			rest.push(child)
		}
	})

	return (
		<>
			{indicators}
			<span data-slot="stepper-content" className={cn(k.content)}>
				{rest}
			</span>
		</>
	)
}

// Injects a default StepperIndicator when the consumer omits one.
// Returns an array, not a Fragment, so Children.forEach can walk each item.
function ensureStepperIndicator(children: ReactNode): ReactNode {
	const items = Children.toArray(children)

	const hasIndicator = items.some(
		(child) => isValidElement(child) && child.type === StepperIndicator,
	)

	if (hasIndicator) return children

	return [<StepperIndicator key="__auto-stepper-indicator" />, ...items]
}

/**
 * A single step within a {@link Stepper}, identified by its `value` index.
 * Derives its `completed`/`current`/`upcoming` state from the stepper's current
 * value and exposes it to descendant indicator, title, and description slots.
 * Injects a default `<StepperIndicator>` when none is supplied.
 *
 * @remarks
 * Renders as a `<button>` (with `aria-current`, and `aria-controls` wiring to the
 * matching `<StepperPanel>`) when the stepper has an `onValueChange` handler,
 * otherwise a display-only `<div>`. In `linear` steppers, upcoming steps are
 * disabled. In `vertical` orientation it splits children into an indicator column
 * and a content column to align the title baseline with the indicator.
 */
export function StepperStep({ value, disabled, className, children }: StepperStepProps) {
	const {
		value: currentValue,
		onValueChange,
		orientation,
		linear,
		baseId,
		hasPanels,
	} = useStepper()

	const state = computeState(value, currentValue)

	// Shares baseId + value with StepperPanel; the two derive matching ids.
	const { triggerId, panelId } = useA11yDisclosure({ id: baseId, key: value })

	const classes = cn(k.step({ orientation }), className)

	// Vertical mode: splits into [indicator, content-column] for the recipe to
	// align the title baseline with the indicator center.
	const layoutChildren = useMemo(() => {
		const withIndicator = ensureStepperIndicator(children)

		return orientation === 'vertical' ? partitionVerticalChildren(withIndicator) : withIndicator
	}, [children, orientation])

	const providerValue = useMemo(() => ({ value, state }), [value, state])

	const inner = <StepperStepContext value={providerValue}>{layoutChildren}</StepperStepContext>

	// Renders as a <button> when onValueChange is set. Linear mode disables upcoming steps.
	if (onValueChange !== undefined) {
		const isDisabled = disabled === true || (linear && state === 'upcoming')

		return (
			<button
				type="button"
				id={triggerId}
				data-slot="stepper-step"
				data-state={state}
				aria-current={state === 'current' ? 'step' : undefined}
				// aria-controls applies only while a StepperPanels group exists and
				// this step is current; the panel id is in the DOM only then.
				aria-controls={hasPanels && state === 'current' ? panelId : undefined}
				disabled={isDisabled}
				onClick={() => onValueChange(value)}
				className={cn(classes, 'cursor-pointer')}
			>
				{inner}
			</button>
		)
	}

	return (
		<div
			id={triggerId}
			data-slot="stepper-step"
			data-state={state}
			aria-current={state === 'current' ? 'step' : undefined}
			data-disabled={dataAttr(disabled)}
			className={cn(classes, 'cursor-default')}
		>
			{inner}
		</div>
	)
}
