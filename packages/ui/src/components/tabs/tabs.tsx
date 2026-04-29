'use client'

import { type ComponentPropsWithoutRef, useMemo } from 'react'
import { cn } from '../../core'
import { CurrentProvider, useCurrent } from '../../primitives'
import { type TabsOrientation, TabsProvider, type TabsVariant } from './context'

export type TabsProps = ComponentPropsWithoutRef<'div'> & {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string | undefined) => void
	variant?: TabsVariant
	orientation?: TabsOrientation
}

export function Tabs({
	value,
	defaultValue,
	onValueChange,
	variant = 'tab',
	orientation = 'horizontal',
	className,
	children,
	...props
}: TabsProps) {
	const [ctx] = useCurrent({ value, defaultValue, onChange: onValueChange })

	// Vertical only applies to the 'tab' variant; segment is always horizontal.
	const resolvedOrientation: TabsOrientation = variant === 'segment' ? 'horizontal' : orientation

	const tabsCtx = useMemo(
		() => ({ variant, orientation: resolvedOrientation }),
		[variant, resolvedOrientation],
	)

	const isVertical = resolvedOrientation === 'vertical'

	return (
		<CurrentProvider value={ctx}>
			<TabsProvider value={tabsCtx}>
				<div
					data-slot="tab-group"
					data-orientation={resolvedOrientation}
					className={cn(isVertical ? 'flex gap-6' : 'space-y-4', className)}
					{...props}
				>
					{children}
				</div>
			</TabsProvider>
		</CurrentProvider>
	)
}
