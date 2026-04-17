'use client'

import { useMemo } from 'react'
import { CurrentProvider, useCurrent } from '../../primitives'
import { TabsProvider, type TabsVariant } from './context'

export type TabsProps = React.ComponentPropsWithoutRef<'div'> & {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string | undefined) => void
	variant?: TabsVariant
}

export function Tabs({
	value,
	defaultValue,
	onValueChange,
	variant = 'tab',
	className,
	children,
	...props
}: TabsProps) {
	const [ctx] = useCurrent({ value, defaultValue, onChange: onValueChange })

	const tabsCtx = useMemo(() => ({ variant }), [variant])

	return (
		<CurrentProvider value={ctx}>
			<TabsProvider value={tabsCtx}>
				<div data-slot="tab-group" className={className} {...props}>
					{children}
				</div>
			</TabsProvider>
		</CurrentProvider>
	)
}
