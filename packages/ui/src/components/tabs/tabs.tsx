'use client'

import { type ComponentPropsWithoutRef, useCallback, useId, useMemo, useState } from 'react'
import { cn } from '../../core'
import { CurrentContext, useCurrentState } from '../../primitives/current'
import { useDensity } from '../../primitives/density'
import { TabsContext, type TabsOrientation, type TabsSize, type TabsVariant } from './context'

export type TabsProps = ComponentPropsWithoutRef<'div'> & {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string | undefined) => void
	variant?: TabsVariant
	orientation?: TabsOrientation
	/**
	 * Size step that drives tab text size and padding.
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
	 */
	size?: TabsSize
}

/**
 * Tab-group root holding selection state and `variant`/`orientation`/`size`
 * context for its list and panels. Controlled or uncontrolled via
 * `value`/`defaultValue`; the `segment` variant forces horizontal orientation.
 */
export function Tabs({
	value,
	defaultValue,
	onValueChange,
	variant = 'tab',
	orientation = 'horizontal',
	size,
	className,
	children,
	...props
}: TabsProps) {
	const context = useCurrentState({ value, defaultValue, onValueChange })

	const inherited = useDensity()

	const resolvedSize: TabsSize = size ?? inherited.size

	// Vertical only applies to the 'tab' variant; segment is always horizontal.
	const resolvedOrientation: TabsOrientation = variant === 'segment' ? 'horizontal' : orientation

	const baseId = useId()

	// Tracks whether a fade-mode TabContents (inactive panels stay mounted)
	// is rendered.
	const [panelsMounted, setPanelsMounted] = useState(false)

	const registerMountedPanels = useCallback(() => {
		setPanelsMounted(true)

		return () => setPanelsMounted(false)
	}, [])

	const tabsContext = useMemo(
		() => ({
			variant,
			orientation: resolvedOrientation,
			size: resolvedSize,
			baseId,
			panelsMounted,
			registerMountedPanels,
		}),
		[variant, resolvedOrientation, resolvedSize, baseId, panelsMounted, registerMountedPanels],
	)

	const isVertical = resolvedOrientation === 'vertical'

	return (
		<CurrentContext value={context}>
			<TabsContext value={tabsContext}>
				<div
					data-slot="tab-group"
					data-orientation={resolvedOrientation}
					className={cn('flex gap-4', isVertical ? 'flex-row' : 'flex-col', className)}
					{...props}
				>
					{children}
				</div>
			</TabsContext>
		</CurrentContext>
	)
}
