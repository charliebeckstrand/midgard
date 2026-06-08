'use client'

import { type ComponentPropsWithoutRef, useId, useMemo } from 'react'
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
 * context for its list and panels — controlled or uncontrolled via
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

	const tabsContext = useMemo(
		() => ({ variant, orientation: resolvedOrientation, size: resolvedSize, baseId }),
		[variant, resolvedOrientation, resolvedSize, baseId],
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
