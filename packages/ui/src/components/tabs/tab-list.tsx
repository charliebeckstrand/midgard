'use client'

import { type ComponentPropsWithoutRef, useEffect, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving } from '../../hooks'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { useDensity } from '../../primitives/density'
import { k } from '../../recipes/kata/tabs'
import type { AccessibleName } from '../../types'
import { useTabsContext } from './context'
import { TAB_SELECTOR } from './tabs-constants'
import { useTabListScroll } from './use-tab-list-scroll'

/** Props for {@link TabList}. Requires an accessible name (`aria-label` or `aria-labelledby`). */
export type TabListProps = AccessibleName &
	Omit<ComponentPropsWithoutRef<'div'>, 'aria-label' | 'aria-labelledby'>

/**
 * `role="tablist"` container for `<Tab>` children. Manages roving focus along
 * the resolved `orientation` and keeps exactly one tab tabbable via a
 * MutationObserver, scoping the shared `<ActiveIndicator>` animation. The
 * underline variant sits in an overflow viewport so an over-long tab row
 * scrolls in place rather than widening the page; the active tab is scrolled
 * into view on mount and as focus roves.
 */
export function TabList({ className, children, ...props }: TabListProps) {
	const tabsContext = useTabsContext()

	const isSegment = tabsContext?.variant === 'segment'

	const orientation = tabsContext?.orientation ?? 'horizontal'

	// Inside <Tabs>, `tabsContext.size` is pre-resolved; à la carte use
	// (<TabList>+<Tab> without <Tabs>) falls back to the Density cascade.
	const inherited = useDensity()

	const size = tabsContext?.size ?? inherited.size

	const ref = useRef<HTMLDivElement>(null)

	const scrollRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useA11yRoving(ref, {
		itemSelector: TAB_SELECTOR,
		orientation,
	})

	// The segment variant is a fixed pill control; only the underline list
	// scrolls, so the viewport (and its scroll-into-view) is gated off for it.
	useTabListScroll(scrollRef, orientation, !isSegment)

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

	const list = (
		<div
			ref={ref}
			data-slot="tab-list"
			data-orientation={orientation}
			role="tablist"
			aria-orientation={orientation}
			onKeyDown={handleKeyDown}
			className={cn(isSegment ? k.segment.control({ size }) : k.list({ orientation }), className)}
			{...props}
		>
			{children}
		</div>
	)

	return (
		<ActiveIndicatorScope>
			{isSegment ? (
				list
			) : (
				<div
					ref={scrollRef}
					data-slot="tab-list-scroll"
					data-scroll-region
					className={k.scroll({ orientation })}
				>
					{list}
				</div>
			)}
		</ActiveIndicatorScope>
	)
}
