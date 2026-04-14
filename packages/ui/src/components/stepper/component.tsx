'use client'

import { Children, isValidElement, useRef } from 'react'
import { cn } from '../../core'
import { useIsDesktop, useRovingFocus } from '../../hooks'
import { ActiveIndicator, ActiveIndicatorScope } from '../../primitives'
import { katachi } from '../../recipes'
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
	/**
	 * When true, users can only click steps that are completed or current.
	 * Upcoming steps are rendered as disabled buttons; advancing the stepper
	 * has to happen via `onValueChange` (e.g. from a "Next" button).
	 */
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

	// When orientation isn't explicitly set, fall back to vertical on mobile so
	// the steps stack instead of overflowing the viewport horizontally.
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

// Auto-inject a default `<StepperIndicator />` when the consumer didn't supply
// one, so the indicator slot is always present without forcing boilerplate.
// Returns an array (not a Fragment) so downstream `Children.forEach` walks each
// item — Fragments are opaque to `Children.forEach` and would hide the
// auto-injected indicator from `partitionVerticalChildren`.
function ensureStepperIndicator(children: React.ReactNode): React.ReactNode {
	const items = Children.toArray(children)

	const hasIndicator = items.some(
		(child) => isValidElement(child) && child.type === StepperIndicator,
	)

	if (hasIndicator) return children

	return [<StepperIndicator key="__auto-stepper-indicator" />, ...items]
}

// Splits the children of `Stepper` into the row content (steps, separators,
// anything not a panels group) and the panels group itself, so the two can be
// stacked vertically when content panels are present.
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

	// In vertical mode the step is a flex row [indicator, content-column]. We split
	// the children so the indicator stays as a flex sibling and everything else
	// (title, description, ...) gets wrapped in a content span that lays out as a
	// flex column. The wrapper's top offset (in the recipe) aligns the title's
	// first line with the indicator's center.
	const childrenWithIndicator = ensureStepperIndicator(children)

	const layoutChildren =
		orientation === 'vertical'
			? partitionVerticalChildren(childrenWithIndicator)
			: childrenWithIndicator

	const inner = <StepperStepProvider value={{ value, state }}>{layoutChildren}</StepperStepProvider>

	// Interactive when the parent provided an `onValueChange`. Linear mode forbids
	// jumping to upcoming steps, so those render as `<button disabled>` — the
	// browser blocks clicks, AT skips it, and the not-allowed cursor is automatic
	// via the recipe's `disabled:cursor-not-allowed`.
	if (onValueChange !== undefined) {
		const isDisabled = disabled === true || (linear && state === 'upcoming')

		return (
			<button
				type="button"
				data-slot="stepper-step"
				data-state={state}
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
