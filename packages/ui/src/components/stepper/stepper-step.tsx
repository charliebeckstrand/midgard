'use client'

import { Children, isValidElement, type ReactNode, useMemo } from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { mountsEveryPanel } from '../../primitives/mount'
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

/**
 * Derives a step's display state by comparing its index to the stepper's current value.
 *
 * @returns `'completed'` below the current value, `'current'` at it, `'upcoming'` above.
 * @internal
 */
function computeState(stepValue: number, value: number): StepState {
	if (stepValue < value) return 'completed'
	if (stepValue === value) return 'current'

	return 'upcoming'
}

/** True for a `<StepperIndicator>` element. @internal */
function isStepperIndicator(child: ReactNode): boolean {
	return isValidElement(child) && child.type === StepperIndicator
}

/**
 * Splits the step's children (already flattened by {@link Children.toArray})
 * into an indicator column and a content column for vertical layout, wrapping
 * non-indicator nodes in a `stepper-content` slot.
 *
 * @internal
 */
function partitionVerticalChildren(items: readonly ReactNode[]): ReactNode {
	return (
		<>
			{items.filter(isStepperIndicator)}
			<span data-slot="stepper-content" className={cn(k.content)}>
				{items.filter((child) => !isStepperIndicator(child))}
			</span>
		</>
	)
}

/**
 * Injects a default `<StepperIndicator>` when the consumer omits one.
 *
 * @remarks Takes and returns the flattened child array so the vertical
 * partition reuses it without a second {@link Children.toArray} pass.
 * @internal
 */
function ensureStepperIndicator(items: ReactNode[]): ReactNode[] {
	if (items.some(isStepperIndicator)) return items

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
		mount,
	} = useStepper()

	const state = computeState(value, currentValue)

	// Shares baseId + value with StepperPanel; the two derive matching ids.
	const { triggerId, panelId } = useA11yDisclosure({ id: baseId, key: value })

	const classes = cn(k.step({ orientation }), className)

	// Vertical mode: splits into [indicator, content-column] for the recipe to
	// align the title baseline with the indicator center.
	const layoutChildren = useMemo(() => {
		const withIndicator = ensureStepperIndicator(Children.toArray(children))

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
				// aria-controls needs the panel id to actually be in the DOM: guaranteed
				// for the current step, and for every step under a policy that mounts
				// them all.
				aria-controls={
					hasPanels && (state === 'current' || mountsEveryPanel(mount)) ? panelId : undefined
				}
				disabled={isDisabled}
				onClick={() => onValueChange(value)}
				className={classes}
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
