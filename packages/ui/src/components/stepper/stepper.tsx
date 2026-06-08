'use client'

import { Children, isValidElement, type ReactNode, useId, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving, useMinWidth } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k, type StepperVariants } from '../../recipes/kata/stepper'
import { Stack } from '../stack'
import { StepperContext, type StepperOrientation } from './context'
import { StepperPanels } from './stepper-panels'

export type StepperProps = StepperVariants & {
	value: number
	onValueChange?: (value: number) => void
	/** Restricts navigation to completed and current steps. */
	linear?: boolean
	orientation?: StepperOrientation
	className?: string
	children?: ReactNode
}

// Separates row content (steps, separators) from the panels group.
function partitionStepperChildren(children: ReactNode): {
	rowChildren: ReactNode[]
	panelsChildren: ReactNode[]
} {
	const rowChildren: ReactNode[] = []

	const panelsChildren: ReactNode[] = []

	Children.forEach(children, (child) => {
		if (isValidElement(child) && child.type === StepperPanels) {
			panelsChildren.push(child)
		} else {
			rowChildren.push(child)
		}
	})

	return { rowChildren, panelsChildren }
}

/** Indexed multi-step flow — partitions its children into a step row and a panels group, with roving arrow-key navigation across steps. */
export function Stepper({
	value,
	onValueChange,
	linear = false,
	orientation,
	className,
	children,
}: StepperProps) {
	const isDesktop = useMinWidth(640)

	// Default to vertical on mobile to avoid horizontal overflow.
	const resolvedOrientation: StepperOrientation =
		orientation ?? (isDesktop ? 'horizontal' : 'vertical')

	const { rowChildren, panelsChildren } = useMemo(
		() => partitionStepperChildren(children),
		[children],
	)

	const rowRef = useRef<HTMLDivElement>(null)

	const baseId = useId()

	const handleKeyDown = useA11yRoving(rowRef, {
		itemSelector: 'button[data-slot="stepper-step"]:not(:disabled)',
		orientation: resolvedOrientation,
		// The step row is a single Tab stop (role="toolbar"); arrows move across
		// steps and the resting stop sits on the current step. Only the interactive
		// branch renders <button>s, so this is a no-op for a display-only stepper.
		manageTabIndex: true,
		activeSelector: '[aria-current="step"]',
	})

	const contextValue = useMemo(
		() => ({
			value,
			onValueChange,
			orientation: resolvedOrientation,
			linear,
			baseId,
		}),
		[value, onValueChange, resolvedOrientation, linear, baseId],
	)

	const row = (
		<div
			ref={rowRef}
			data-slot="stepper"
			data-orientation={resolvedOrientation}
			role="toolbar"
			aria-label="Steps"
			aria-orientation={resolvedOrientation}
			onKeyDown={onValueChange !== undefined ? handleKeyDown : undefined}
			className={cn(k.root({ orientation: resolvedOrientation }), className)}
		>
			{rowChildren}
		</div>
	)

	return (
		<StepperContext value={contextValue}>
			<ActiveIndicatorScope>
				{panelsChildren.length === 0 ? (
					row
				) : (
					<Stack gap="xl" data-slot="stepper-root">
						{row}
						{panelsChildren}
					</Stack>
				)}
			</ActiveIndicatorScope>
		</StepperContext>
	)
}
