'use client'

import type { ComponentPropsWithoutRef, MouseEvent } from 'react'
import { cn } from '../../core'
import { ActiveIndicator, useActiveIndicator } from '../../primitives/active-indicator'
import { useCurrent } from '../../primitives/current'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/tabs'
import { Button } from '../button'
import { Headless } from '../headless'
import { useTabsContext } from './context'

export type TabProps = {
	value?: string
	current?: boolean
	/** Links this tab to its panel via aria-controls. */
	id?: string
	stretch?: boolean
	disabled?: boolean
	className?: string
} & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'id' | 'value'>

export function Tab({
	value,
	current: currentProp,
	id,
	stretch = false,
	disabled,
	className,
	children,
	onClick,
}: TabProps) {
	const context = useCurrent()

	const tabsContext = useTabsContext()

	const indicator = useActiveIndicator()

	// When wrapped in <Tabs>, the parent has already resolved Density into tabsContext.size.
	// When used à la carte (just <TabList>+<Tab>), fall back to reading Density here.
	const inherited = useDensity()

	const size = tabsContext?.size ?? inherited.size

	const isSegment = tabsContext?.variant === 'segment'

	const orientation = tabsContext?.orientation ?? 'horizontal'

	const current = currentProp ?? (value !== undefined && context?.value === value)

	function handleClick(e: MouseEvent<HTMLButtonElement>) {
		onClick?.(e)

		if (value !== undefined) {
			context?.onValueChange?.(value)
		}
	}

	return (
		<span className={cn(stretch && 'flex-1', 'group relative')} {...indicator.tapHandlers}>
			<Headless>
				<Button
					data-slot="tab"
					data-current={current || undefined}
					role="tab"
					id={id}
					aria-selected={current ?? false}
					aria-controls={id ? `${id}-panel` : undefined}
					tabIndex={current ? 0 : -1}
					disabled={disabled}
					type="button"
					className={cn(
						'relative z-1',
						isSegment ? k.segment.item({ size }) : k.tab({ orientation, size }),
						stretch && 'w-full justify-center',
						className,
					)}
					onClick={handleClick}
				>
					{children}
				</Button>
			</Headless>
			{current && (
				<ActiveIndicator
					ref={indicator.ref}
					className={cn(isSegment ? k.segment.indicator : k.indicator({ orientation }))}
				/>
			)}
		</span>
	)
}
