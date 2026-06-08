'use client'

import type { ComponentPropsWithoutRef, MouseEvent } from 'react'
import { cn } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
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

	// Derive a matched tab/panel id pair from the Tabs base id + value so the
	// idiomatic <TabContent value> auto-wires, unless the consumer pinned an
	// explicit id for manual <TabPanel id> linkage. Segments map onto tab roles
	// but have no panels, so they never auto-wire `aria-controls`.
	const disclosure = useA11yDisclosure({ id: tabsContext?.baseId, key: value })

	const auto =
		!isSegment && id === undefined && value !== undefined && tabsContext?.baseId !== undefined

	const tabId = id ?? (auto ? disclosure.triggerId : undefined)

	const controlsId = id ? `${id}-panel` : auto ? disclosure.panelId : undefined

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
					id={tabId}
					aria-selected={current ?? false}
					// Explicit-id panels are always mounted, so reference them always;
					// auto panels can unmount when inactive, so only the current tab points
					// at its panel — never a dangling id.
					aria-controls={id !== undefined || current ? controlsId : undefined}
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
