'use client'

import { type ComponentProps, useRef } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { useA11yRoving } from '../../hooks'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/tabs'
import type { AccessibleName } from '../../types'
import { useTabsContext } from './context'
import { TAB_SELECTOR } from './tabs-constants'
import { useTabListScroll } from './use-tab-list-scroll'

/**
 * Keeps at least one enabled tab in `list` tabbable, now and after each change
 * of the tabs. A ref callback, so React stops the observer when it detaches the
 * list, as a hidden `<Activity>` does, and starts it again on the next attach.
 */
function observeTabbableFloor(list: HTMLDivElement) {
	const ensureTabbable = () => {
		const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR))

		const first = tabs[0]

		if (!first) return

		if (!tabs.some((t) => t.tabIndex === 0)) first.tabIndex = 0
	}

	ensureTabbable()

	const observer = new MutationObserver(ensureTabbable)

	observer.observe(list, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['tabindex', 'disabled'],
	})

	return () => observer.disconnect()
}

/** Props for {@link TabList}. Requires an accessible name (`aria-label` or `aria-labelledby`). */
export type TabListProps = AccessibleName &
	Omit<ComponentProps<'div'>, 'aria-label' | 'aria-labelledby'>

/**
 * `role="tablist"` container for `<Tab>` children. Manages roving focus along
 * the resolved `orientation`, and scopes the shared `<ActiveIndicator>`
 * animation. A MutationObserver keeps at least one tab tabbable as a floor; the
 * single Tab stop itself comes from each `<Tab>`'s roving `tabIndex`. The
 * underline variant sits in an overflow viewport, so an over-long tab row
 * scrolls in place rather than widening the page, and the edge with more tabs
 * behind it fades. The active tab is scrolled
 * into view on mount and as focus roves. A consumer `ref` reaches the
 * `role="tablist"` element.
 */
export function TabList({
	className,
	children,
	onKeyDown,
	onFocus,
	ref: consumerRef,
	...props
}: TabListProps) {
	const tabsContext = useTabsContext()

	const isSegment = tabsContext?.variant === 'segment'

	const orientation = tabsContext?.orientation ?? 'horizontal'

	const ref = useRef<HTMLDivElement>(null)

	// Roving reads `ref`, so a consumer `ref` joins it, with the tabbable floor.
	const setList = useComposedRef(ref, consumerRef, observeTabbableFloor)

	const scrollRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useA11yRoving(ref, {
		itemSelector: TAB_SELECTOR,
		orientation,
	})

	// The segment variant is a fixed pill control; only the underline list
	// scrolls, so the viewport (and its scroll-into-view) is gated off for it.
	const handleFocus = useTabListScroll(scrollRef, orientation, !isSegment)

	const list = (
		<div
			ref={setList}
			data-slot="tab-list"
			data-orientation={orientation}
			className={cn(isSegment ? k.segment.control : k.list({ orientation }), className)}
			// Consumer props spread first; the role, the orientation and the roving
			// handler below take precedence.
			{...props}
			role="tablist"
			aria-orientation={orientation}
			// Roving takes no gate: the consumer's handler runs first, then roving.
			onKeyDown={composeEventHandlers(onKeyDown, handleKeyDown, {
				checkForDefaultPrevented: false,
			})}
			// Scrolls a focused tab into the viewport after the consumer's handler.
			onFocus={composeEventHandlers(onFocus, handleFocus, {
				checkForDefaultPrevented: false,
			})}
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
