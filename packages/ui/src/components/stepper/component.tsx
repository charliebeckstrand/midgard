'use client'

import { Children, isValidElement, useRef } from 'react'
import { cn } from '../../core'
import { useIsDesktop, useRovingFocus } from '../../hooks'
import { ActiveIndicator, ActiveIndicatorScope } from '../../primitives'
import { Stack } from '../stack'
import {
	type StepperOrientation,
	StepperProvider,
	StepperStepProvider,
	type StepState,
	useStepper,
	useStepperStep,
} from './context'
import {
	k,
	type StepperVariants,
	stepperSeparatorVariants,
	stepperStepVariants,
	stepperTitleVariants,
	stepperVariants,
} from './variants'

// ── Stepper ─────────────────────────────────────────────

export type StepperProps = StepperVariants & {
	value: number
	onValueChange?: (value: number) => void
	/** Restricts navigation to completed and current steps. */
	linear?: boolean
	orientation?: StepperOrientation
	className?: string
	children?: React.ReactNode
}

export function Stepper({
	value,
	onValueChange,
	linear = false,
	orientation,
	className,
	children,
}: StepperProps) {
	const isDesktop = useIsDesktop()

	// Default to vertical on mobile to avoid horizontal overflow.
	const resolvedOrientation: StepperOrientation =
		orientation ?? (isDesktop ? 'horizontal' : 'vertical')

	const { rowChildren, panelsChildren } = partitionStepperChildren(children)

	const rowRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRovingFocus(rowRef, {
		itemSelector: 'button[data-slot="stepper-step"]:not(:disabled)',
		orientation: resolvedOrientation,
	})

	const row = (
		<div
			ref={rowRef}
			data-slot="stepper"
			data-orientation={resolvedOrientation}
			role="toolbar"
			aria-orientation={resolvedOrientation}
			onKeyDown={onValueChange !== undefined ? handleKeyDown : undefined}
			className={cn(stepperVariants({ orientation: resolvedOrientation }), className)}
		>
			{rowChildren}
		</div>
	)

	return (
		<StepperProvider
			value={{
				value,
				onValueChange,
				orientation: resolvedOrientation,
				linear,
			}}
		>
			<ActiveIndicatorScope>
				{panelsChildren.length === 0 ? (
					row
				) : (
					<Stack gap={6} data-slot="stepper-root">
						{row}
						{panelsChildren}
					</Stack>
				)}
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

// Separates row content (steps, separators) from the panels group.
function partitionStepperChildren(children: React.ReactNode): {
	rowChildren: React.ReactNode[]
	panelsChildren: React.ReactNode[]
} {
	const rowChildren: React.ReactNode[] = []

	const panelsChildren: React.ReactNode[] = []

	Children.forEach(children, (child) => {
		if (isValidElement(child) && child.type === StepperPanels) {
			panelsChildren.push(child)
		} else {
			rowChildren.push(child)
		}
	})

	return { rowChildren, panelsChildren }
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

// ── StepperIndicator ────────────────────────────────────

export type StepperIndicatorProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'span'>, 'className'>

export function StepperIndicator({ className, ...props }: StepperIndicatorProps) {
	const { onValueChange } = useStepper()
	const { state } = useStepperStep()

	const interactive = onValueChange !== undefined

	return (
		<span
			data-slot="stepper-indicator"
			data-display-state={state}
			className={cn(k.indicator.base, interactive && k.indicator.interactive, className)}
			{...props}
		>
			{state === 'current' && (
				<ActiveIndicator className={cn(k.activeIndicator)} style={{ borderRadius: '9999px' }} />
			)}
		</span>
	)
}

// ── StepperTitle ────────────────────────────────────────

export type StepperTitleProps = React.ComponentPropsWithoutRef<'span'>

export function StepperTitle({ className, ...props }: StepperTitleProps) {
	const { orientation, onValueChange } = useStepper()

	const interactive = onValueChange !== undefined

	return (
		<span
			data-slot="stepper-title"
			className={cn(stepperTitleVariants({ orientation, interactive }), className)}
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
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function StepperSeparator({ className, ...props }: StepperSeparatorProps) {
	const { orientation } = useStepper()

	return (
		<div
			data-slot="stepper-separator"
			role="presentation"
			aria-hidden="true"
			className={cn(stepperSeparatorVariants({ orientation }), className)}
			{...props}
		/>
	)
}

// ── StepperPanels ───────────────────────────────────────

export type StepperPanelsProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function StepperPanels({ className, children, ...props }: StepperPanelsProps) {
	return (
		<div data-slot="stepper-panels" className={className} {...props}>
			{children}
		</div>
	)
}

// ── StepperPanel ────────────────────────────────────────

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
