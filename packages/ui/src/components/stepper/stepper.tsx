'use client'

import { Children, isValidElement, useRef } from 'react'
import { cn } from '../../core'
import { useIsDesktop, useRovingFocus } from '../../hooks'
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
	children?: React.ReactNode
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
