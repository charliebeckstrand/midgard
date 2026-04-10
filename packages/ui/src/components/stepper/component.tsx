'use client'

import { Check } from 'lucide-react'
import { Children, isValidElement, useCallback, useState } from 'react'
import { cn } from '../../core'
import { ActiveIndicator, ActiveIndicatorScope } from '../../primitives'
import { katachi } from '../../recipes'
import {
	type StepperOrientation,
	StepperProvider,
	StepperStepProvider,
	type StepState,
	useStepper,
	useStepperStep,
} from './context'
import {
	type StepperVariants,
	stepperSeparatorVariants,
	stepperStepVariants,
	stepperTitleVariants,
	stepperVariants,
} from './variants'

const k = katachi.stepper

// ── Stepper ─────────────────────────────────────────────

export type StepperProps = StepperVariants & {
	value: number
	onValueChange?: (value: number) => void
	className?: string
	children?: React.ReactNode
}

export function Stepper({ value, onValueChange, orientation, className, children }: StepperProps) {
	const resolvedOrientation: StepperOrientation = orientation ?? 'horizontal'

	// `displayValue` lags `value` until the active indicator pill finishes its
	// layout animation. All step content (numbers vs. checks) is derived from
	// `displayValue`, so a step's appearance only changes once the pill has
	// arrived. The pill itself follows the live `value` prop directly via
	// framer-motion's layout animation, so it moves immediately on click.
	const [displayValue, setDisplayValue] = useState(value)

	const onActiveIndicatorSettled = useCallback(() => {
		setDisplayValue(value)
	}, [value])

	return (
		<StepperProvider
			value={{
				value,
				displayValue,
				onValueChange,
				onActiveIndicatorSettled,
				orientation: resolvedOrientation,
			}}
		>
			<ActiveIndicatorScope>
				<div
					data-slot="stepper"
					data-orientation={resolvedOrientation}
					className={cn(stepperVariants({ orientation }), className)}
				>
					{children}
				</div>
			</ActiveIndicatorScope>
		</StepperProvider>
	)
}

// ── StepperStep ─────────────────────────────────────────

export type StepperStepProps = {
	value: number
	disabled?: boolean
	className?: string
	children?: React.ReactNode
}

function computeState(stepValue: number, currentValue: number): StepState {
	if (stepValue < currentValue) return 'completed'

	if (stepValue === currentValue) return 'current'

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
			<span data-slot="stepper-content" className={k.content}>
				{rest}
			</span>
		</>
	)
}

export function StepperStep({ value, disabled, className, children }: StepperStepProps) {
	const { displayValue, onValueChange, orientation } = useStepper()

	const state = computeState(value, displayValue)

	const clickable = onValueChange !== undefined && !disabled

	const classes = cn(stepperStepVariants({ orientation }), className)

	// In vertical mode the step is a flex row [indicator, content-column]. We split
	// the children so the indicator stays as a flex sibling and everything else
	// (title, description, ...) gets wrapped in a content span that lays out as a
	// flex column. The wrapper's top offset (in the recipe) aligns the title's
	// first line with the indicator's center.
	const layoutChildren = orientation === 'vertical' ? partitionVerticalChildren(children) : children

	const inner = <StepperStepProvider value={{ value, state }}>{layoutChildren}</StepperStepProvider>

	if (clickable) {
		return (
			<button
				type="button"
				data-slot="stepper-step"
				data-state={state}
				data-clickable="true"
				disabled={disabled}
				onClick={() => onValueChange(value)}
				className={classes}
			>
				{inner}
			</button>
		)
	}

	return (
		<div
			data-slot="stepper-step"
			data-state={state}
			data-clickable="false"
			data-disabled={disabled ? '' : undefined}
			className={classes}
		>
			{inner}
		</div>
	)
}

// ── StepperIndicator ────────────────────────────────────

export type StepperIndicatorProps = {
	className?: string
	children?: React.ReactNode
}

export function StepperIndicator({ className, children }: StepperIndicatorProps) {
	const { value: stepValue, state } = useStepperStep()

	const { value: liveValue, onActiveIndicatorSettled } = useStepper()

	// Whichever step matches the live prop hosts the pill; framer-motion's
	// LayoutGroup morphs the pill from its previous position. Underlying
	// content is driven by `state` (which lags via `displayValue`), so steps
	// don't visibly change until the pill has finished moving into place.
	const isTarget = stepValue === liveValue

	const completed = state === 'completed'

	return (
		<span
			data-slot="stepper-indicator"
			data-display-state={state}
			className={cn(k.indicator, className)}
		>
			<span className="grid place-items-center">
				{completed ? (
					<Check aria-hidden="true" strokeWidth={2.5} className="size-4 text-green-600" />
				) : (
					children
				)}
			</span>
			{isTarget && (
				<ActiveIndicator
					className={cn(k.activeIndicator)}
					style={{ borderRadius: '9999px' }}
					onLayoutAnimationComplete={onActiveIndicatorSettled}
				>
					{children}
				</ActiveIndicator>
			)}
		</span>
	)
}

// ── StepperTitle ────────────────────────────────────────

export type StepperTitleProps = React.ComponentPropsWithoutRef<'span'>

export function StepperTitle({ className, ...props }: StepperTitleProps) {
	const { orientation } = useStepper()

	return (
		<span
			data-slot="stepper-title"
			className={cn(stepperTitleVariants({ orientation }), className)}
			{...props}
		/>
	)
}

// ── StepperDescription ──────────────────────────────────

export type StepperDescriptionProps = React.ComponentPropsWithoutRef<'span'>

export function StepperDescription({ className, ...props }: StepperDescriptionProps) {
	return (
		<span data-slot="stepper-description" className={cn(k.description, className)} {...props} />
	)
}

// ── StepperSeparator ────────────────────────────────────

export type StepperSeparatorProps = {
	className?: string
}

export function StepperSeparator({ className }: StepperSeparatorProps) {
	const { orientation } = useStepper()

	return (
		<div
			data-slot="stepper-separator"
			role="presentation"
			aria-hidden="true"
			className={cn(stepperSeparatorVariants({ orientation }), className)}
		/>
	)
}
