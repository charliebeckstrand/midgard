'use client'

import type { ComponentPropsWithoutRef, MouseEvent } from 'react'
import { cn } from '../../core'
import { ActiveIndicator, useActiveIndicator } from '../../primitives/active-indicator'
import { useCurrent } from '../../primitives/current'
import { useDensity } from '../../primitives/density'
import { segment as ks, segmentItemVariants } from '../../recipes/kata/segment'
import { k } from '../../recipes/kata/tabs'
import { useTabsContext } from './context'

export type TabProps = {
	value?: string
	current?: boolean
	/** Links this tab to its panel via aria-controls. */
	id?: string
	className?: string
} & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'id' | 'value'>

export function Tab({
	value,
	current: currentProp,
	id,
	className,
	children,
	onClick,
	...props
}: TabProps) {
	const ctx = useCurrent()

	const tabsContext = useTabsContext()
	const indicator = useActiveIndicator()

	// When wrapped in <Tabs>, the parent has already resolved Density into tabsContext.size.
	// When used à la carte (just <TabList>+<Tab>), fall back to reading Density here.
	const inherited = useDensity()

	const size = tabsContext?.size ?? inherited.size

	const isSegment = tabsContext?.variant === 'segment'

	const orientation = tabsContext?.orientation ?? 'horizontal'

	const current = currentProp ?? (value !== undefined && ctx?.value === value)

	function handleClick(e: MouseEvent<HTMLButtonElement>) {
		onClick?.(e)

		if (value !== undefined) {
			ctx?.onChange?.(value)
		}
	}

	return (
		<span className="group relative" {...indicator.tapHandlers}>
			<button
				data-slot="tab"
				data-current={current ? '' : undefined}
				role="tab"
				id={id}
				aria-selected={current ?? false}
				aria-controls={id ? `${id}-panel` : undefined}
				tabIndex={current ? 0 : -1}
				type="button"
				className={cn(
					isSegment ? segmentItemVariants({ size }) : k.tab({ orientation, size }),
					'relative z-1',
					className,
				)}
				onClick={handleClick}
				{...props}
			>
				{children}
			</button>
			{current && (
				<ActiveIndicator
					ref={indicator.ref}
					className={cn(isSegment ? ks.indicator : k.indicator({ orientation }))}
				/>
			)}
		</span>
	)
}
