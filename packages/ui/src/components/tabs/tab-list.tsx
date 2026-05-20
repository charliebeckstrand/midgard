'use client'

import { type ComponentPropsWithoutRef, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { useRoving } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { useDensity } from '../../primitives/density'
import { k as ks } from '../../recipes/kata/segment'
import { k } from '../../recipes/kata/tabs'
import { useTabsContext } from './context'
import { TAB_SELECTOR } from './tabs-constants'

export type TabListProps = ComponentPropsWithoutRef<'div'>

export function TabList({ className, children, ...props }: TabListProps) {
	const tabsContext = useTabsContext()

	const isSegment = tabsContext?.variant === 'segment'

	const orientation = tabsContext?.orientation ?? 'horizontal'

	// When wrapped in <Tabs>, the parent has already resolved Density into tabsContext.size.
	// When used à la carte (just <TabList>+<Tab>), fall back to reading Density here.
	const inherited = useDensity()

	const size = tabsContext?.size ?? inherited.size

	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRoving(ref, {
		itemSelector: TAB_SELECTOR,
		orientation,
	})

	useEffect(() => {
		const el = ref.current

		if (!el) return

		const ensureTabbable = () => {
			const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR))

			const first = tabs[0]

			if (!first) return

			if (!tabs.some((t) => t.tabIndex === 0)) first.tabIndex = 0
		}

		ensureTabbable()

		const observer = new MutationObserver(ensureTabbable)

		observer.observe(el, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['tabindex', 'disabled'],
		})

		return () => observer.disconnect()
	}, [])

	return (
		<ActiveIndicatorScope>
			<div
				ref={ref}
				data-slot="tab-list"
				data-orientation={orientation}
				role="tablist"
				aria-orientation={orientation}
				onKeyDown={handleKeyDown}
				className={cn(isSegment ? ks.control({ size }) : k.list({ orientation }), className)}
				{...props}
			>
				{children}
			</div>
		</ActiveIndicatorScope>
	)
}
