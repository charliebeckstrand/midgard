'use client'

import { Children, isValidElement } from 'react'
import { cn } from '../../core'
import { StepperStepProvider, type StepState, useStepper } from './context'
import { StepperIndicator } from './stepper-indicator'
import { k, stepperStepVariants } from './variants'

export type StepperStepProps = {
	value: number
	disabled?: boolean
	className?: string
	children?: React.ReactNode
}

function computeState(stepValue: number, value: number): StepState {
	if (stepValue < value) return 'completed'
	if (stepValue === value) return 'current'

	return 'upcoming'
}

function partitionVerticalChildren(children: React.ReactNode): React.ReactNode {
	const indicators: React.ReactNode[] = []

	const rest: React.ReactNode[] = []

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
function ensureStepperIndicator(children: React.ReactNode): React.ReactNode {
	const items = Children.toArray(children)

	const hasIndicator = items.some(
		(child) => isValidElement(child) && child.type === StepperIndicator,
	)

	if (hasIndicator) return children

	return [<StepperIndicator key="__auto-stepper-indicator" />, ...items]
}

export function StepperStep({ value, disabled, className, children }: StepperStepProps) {
	const { value: currentValue, onValueChange, orientation, linear } = useStepper()

	const state = computeState(value, currentValue)

	const classes = cn(stepperStepVariants({ orientation }), className)

	// Vertical mode: split into [indicator, content-column] so the recipe
	// can align the title baseline with the indicator center.
	const childrenWithIndicator = ensureStepperIndicator(children)

	const layoutChildren =
		orientation === 'vertical'
			? partitionVerticalChildren(childrenWithIndicator)
			: childrenWithIndicator

	const inner = <StepperStepProvider value={{ value, state }}>{layoutChildren}</StepperStepProvider>

	// Interactive when onValueChange is set. Linear mode disables upcoming steps.
	if (onValueChange !== undefined) {
		const isDisabled = disabled === true || (linear && state === 'upcoming')

		return (
			<button
				type="button"
				data-slot="stepper-step"
				data-state={state}
				aria-current={state === 'current' ? 'step' : undefined}
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
			data-slot="stepper-step"
			data-state={state}
			aria-current={state === 'current' ? 'step' : undefined}
			data-disabled={disabled ? '' : undefined}
			className={classes}
		>
			{inner}
		</div>
	)
}
