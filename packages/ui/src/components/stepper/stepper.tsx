'use client'

import { Children, isValidElement, type ReactNode, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useMinWidth, useRoving } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives'
import { Stack } from '../stack'
import { type StepperOrientation, StepperProvider } from './context'
import { StepperPanels } from './stepper-panels'
import { type StepperVariants, stepperVariants } from './variants'

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

	const handleKeyDown = useRoving(rowRef, {
		itemSelector: 'button[data-slot="stepper-step"]:not(:disabled)',
		orientation: resolvedOrientation,
	})

	const contextValue = useMemo(
		() => ({
			value,
			onValueChange,
			orientation: resolvedOrientation,
			linear,
		}),
		[value, onValueChange, resolvedOrientation, linear],
	)

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
		<StepperProvider value={contextValue}>
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
		</StepperProvider>
	)
}
