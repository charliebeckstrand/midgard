'use client'

import { Children, isValidElement, type ReactNode, useId, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving, useMinWidth } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k, type StepperVariants } from '../../recipes/kata/stepper'
import { Stack } from '../stack'
import { StepperContext, type StepperOrientation } from './context'
import { StepperPanels } from './stepper-panels'

/** Props for {@link Stepper}: the controlled `value`, its `onValueChange` handler, `linear`/`orientation` modifiers, recipe variants, and step children. */
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

/**
 * Controlled, indexed multi-step flow keyed by a numeric `value`. Partitions
 * its children into a `role="toolbar"` step row and a `<StepperPanels>` group,
 * scopes an `ActiveIndicator` for the current-step marker, and shares step state
 * via context. Each `<StepperStep>` derives its completed/current/upcoming state
 * by comparing its own index against `value`.
 *
 * @remarks
 * Client component (`'use client'`) — it tracks viewport width. `orientation`
 * defaults to `horizontal` on viewports >= 640px and `vertical` below, since a
 * horizontal row overflows narrow screens. When `onValueChange` is set, steps
 * render as buttons and the row is a single Tab stop with roving arrow-key
 * navigation; `linear` then disables upcoming steps. Compose `<StepperSkeleton>`
 * in loading trees.
 */
export function Stepper({
	value,
	onValueChange,
	linear = false,
	orientation,
	className,
	children,
}: StepperProps) {
	const isDesktop = useMinWidth(640)

	// Defaults to vertical on mobile (horizontal overflows narrow viewports).
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
		// Step row is a single Tab stop (role="toolbar"); arrows move across steps,
		// resting on the current step. A no-op for display-only steppers (no buttons).
		manageTabIndex: true,
		activeSelector: '[aria-current="step"]',
	})

	const hasPanels = panelsChildren.length > 0

	const contextValue = useMemo(
		() => ({
			value,
			onValueChange,
			orientation: resolvedOrientation,
			linear,
			baseId,
			hasPanels,
		}),
		[value, onValueChange, resolvedOrientation, linear, baseId, hasPanels],
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
