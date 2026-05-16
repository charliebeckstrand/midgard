'use client'

import { type ComponentPropsWithoutRef, useMemo } from 'react'
import { cn } from '../../core'
import { CurrentProvider, useCurrentState } from '../../primitives/current'
import { useDensity } from '../../primitives/density'
import { type TabsOrientation, TabsProvider, type TabsSize, type TabsVariant } from './context'

export type TabsProps = ComponentPropsWithoutRef<'div'> & {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string | undefined) => void
	variant?: TabsVariant
	orientation?: TabsOrientation
	/**
	 * Size step that drives tab text size and padding.
	 * Resolution order: explicit prop, then enclosing concentric size, then `'md'`.
	 */
	size?: TabsSize
}

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
	const ctx = useCurrentState({ value, defaultValue, onChange: onValueChange })

	const inherited = useDensity()
	const resolvedSize: TabsSize = size ?? inherited.size

	// Vertical only applies to the 'tab' variant; segment is always horizontal.
	const resolvedOrientation: TabsOrientation = variant === 'segment' ? 'horizontal' : orientation

	const tabsCtx = useMemo(
		() => ({ variant, orientation: resolvedOrientation, size: resolvedSize }),
		[variant, resolvedOrientation, resolvedSize],
	)

	const isVertical = resolvedOrientation === 'vertical'

	return (
		<CurrentProvider value={ctx}>
			<TabsProvider value={tabsCtx}>
				<div
					data-slot="tab-group"
					data-orientation={resolvedOrientation}
					className={cn(isVertical ? 'flex gap-6' : '', className)}
					{...props}
				>
					{children}
				</div>
			</TabsProvider>
		</CurrentProvider>
	)
}
