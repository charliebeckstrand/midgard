'use client'

import { useComposedRefs } from 'motion/react'
import { type ComponentProps, type KeyboardEvent, useRef } from 'react'
import { cn } from '../../core/cn'
import { composeEventHandlers } from '../../core/compose-event-handlers'
import { useA11yRoving } from '../../hooks/a11y/use-a11y-roving'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/tabs'
import type { AccessibleName } from '../../types/accessible-name'
import { useTabsContext } from './context'
import { TAB_SELECTOR } from './tabs-constants'
import { useTabListScroll } from './use-tab-list-scroll'
import { useTabsPanels } from './use-tabs-panels'

/**
 * Keeps at least one enabled tab in `list` tabbable, now and after each change
 * of the tabs. A ref callback, so React stops the observer when it detaches the
 * list, as a hidden `<Activity>` does, and starts it again on the next attach.
 */
function observeTabbableFloor(list: HTMLDivElement) {
	// The tab that the floor made tabbable. React does not write its tabIndex
	// again while its prop stays -1, so the floor must give the stop back.
	let raised: HTMLButtonElement | null = null

	const ensureTabbable = () => {
		const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR))

		// When a different tab holds the Tab stop, return the raised tab to -1.
		if (raised && tabs.some((tab) => tab !== raised && tab.tabIndex === 0)) {
			raised.tabIndex = -1

			raised = null
		}

		const first = tabs[0]

		if (!first) return

		if (!tabs.some((tab) => tab.tabIndex === 0)) {
			first.tabIndex = 0

			raised = first
		}
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
 * `role="tablist"` container for `<Tab>` children, or a `role="radiogroup"` in a
 * segment group with no panels (see {@link Tabs}). Manages roving focus along
 * the resolved `orientation`, and scopes the shared `<ActiveIndicator>`
 * animation. The indicator morphs only along that orientation. A container that
 * moves the list, such as a Dialog that takes its height from the panel, thus
 * does not slide it off the line of the tabs. A MutationObserver keeps at least
 * one tab tabbable as a floor; the single Tab stop itself comes from each
 * `<Tab>`'s roving `tabIndex`. The list of each variant sits in an overflow
 * viewport, so an over-long tab row scrolls in place rather than widening the
 * page, and the edge with more tabs behind it fades. The row paints at its start, on the server and on the
 * client, and a mount does not scroll it. The active tab scrolls into view when
 * the selection changes and as focus roves. A consumer `ref` reaches the
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

	const slots = k({ orientation })

	const ref = useRef<HTMLDivElement>(null)

	// Roving reads `ref`, so a consumer `ref` joins it, with the tabbable floor.
	const setList = useComposedRefs(ref, consumerRef, observeTabbableFloor)

	const rove = useA11yRoving(ref, {
		itemSelector: TAB_SELECTOR,
		orientation,
	})

	const { choice } = useTabsPanels()

	// In a choice group, the item that an arrow key focuses is also selected, as
	// a native radio is. The click goes through the handler of the item, so a
	// locked item keeps the value.
	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const document = event.currentTarget.ownerDocument

		const before = document.activeElement

		rove(event)

		const after = document.activeElement

		if (choice && after !== before && after instanceof HTMLElement && after.matches(TAB_SELECTOR))
			after.click()
	}

	const handleFocus = useTabListScroll(orientation)

	// Roving takes no gate: the consumer's handler runs first, then roving.
	const keyDown = composeEventHandlers(onKeyDown, handleKeyDown, {
		checkForDefaultPrevented: false,
	})

	// Scrolls a focused tab into the viewport after the consumer's handler.
	const focus = composeEventHandlers(onFocus, handleFocus, { checkForDefaultPrevented: false })

	const listClass = cn(isSegment ? k.segment.control : slots.list, className)

	// Consumer props spread first; the role, the orientation and the roving
	// handler after them take precedence. A choice group is horizontal, so its
	// radiogroup states no orientation.
	const list = choice ? (
		<div
			ref={setList}
			data-slot="tab-list"
			data-orientation={orientation}
			className={listClass}
			{...props}
			role="radiogroup"
			onKeyDown={keyDown}
			onFocus={focus}
		>
			{children}
		</div>
	) : (
		<div
			ref={setList}
			data-slot="tab-list"
			data-orientation={orientation}
			className={listClass}
			{...props}
			role="tablist"
			aria-orientation={orientation}
			onKeyDown={keyDown}
			onFocus={focus}
		>
			{children}
		</div>
	)

	return (
		// Each tab of a list has the same box across the list, so the marker
		// morphs only along the list.
		<ActiveIndicatorScope orientation={orientation}>
			<div data-slot="tab-list-scroll" data-scroll-region className={slots.scroll}>
				{list}
			</div>
		</ActiveIndicatorScope>
	)
}
