'use client'

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

	return (
		<StepperProvider value={{ value, onValueChange, orientation: resolvedOrientation }}>
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

export function StepperStep({ value, disabled, className, children }: StepperStepProps) {
	const { value: currentValue, onValueChange, orientation } = useStepper()
	const state = computeState(value, currentValue)
	const clickable = onValueChange !== undefined && !disabled
	const classes = cn(stepperStepVariants({ orientation }), className)

	const inner = <StepperStepProvider value={{ value, state }}>{children}</StepperStepProvider>

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
	const { state } = useStepperStep()

	return (
		<span data-slot="stepper-indicator" className={cn(k.indicator, className)}>
			{state === 'current' && (
				<ActiveIndicator className={cn(k.activeIndicator)} style={{ borderRadius: '9999px' }} />
			)}
			<span className="relative z-10">{children}</span>
		</span>
	)
}

// ── StepperTitle ────────────────────────────────────────

export type StepperTitleProps = React.ComponentPropsWithoutRef<'span'>

export function StepperTitle({ className, ...props }: StepperTitleProps) {
	return <span data-slot="stepper-title" className={cn(k.title, className)} {...props} />
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
