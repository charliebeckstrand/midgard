'use client'

import { type RefObject, useEffect } from 'react'
import type { TabsOrientation } from './context'
import { TAB_SELECTOR } from './tabs-constants'

/** Matches the current (selected) tab; `Tab` stamps `data-current` on the active trigger. */
const CURRENT_TAB_SELECTOR = '[data-slot="tab"][data-current]'

/**
 * Least scroll offset that brings an item fully into a viewport along one axis,
 * returning the current offset unchanged when the item already fits (the
 * `nearest` policy). Every input shares the axis: the viewport's current scroll
 * position, the item's leading edge relative to the viewport's content start,
 * the item size, and the viewport size.
 *
 * @internal
 */
export function scrollIntoViewOffset({
	current,
	leading,
	itemSize,
	viewport,
}: {
	current: number
	leading: number
	itemSize: number
	viewport: number
}): number {
	if (leading < 0) return current + leading

	if (leading + itemSize > viewport) return current + leading - (viewport - itemSize)

	return current
}

/** Scrolls `tab` into view within `scroller` along `axis`, moving the least amount needed. @internal */
function scrollTabIntoView(scroller: HTMLElement, tab: HTMLElement, axis: 'x' | 'y') {
	const tabRect = tab.getBoundingClientRect()

	const scrollerRect = scroller.getBoundingClientRect()

	if (axis === 'x') {
		// scrollLeft/clientWidth are padding-box metrics while the rect is
		// border-box; subtract the left border so a bordered viewport doesn't
		// overstate the offset.
		const leading = tabRect.left - scrollerRect.left - scroller.clientLeft

		const next = scrollIntoViewOffset({
			current: scroller.scrollLeft,
			leading,
			itemSize: tabRect.width,
			viewport: scroller.clientWidth,
		})

		if (next !== scroller.scrollLeft) scroller.scrollTo({ left: next })

		return
	}

	const leading = tabRect.top - scrollerRect.top - scroller.clientTop

	const next = scrollIntoViewOffset({
		current: scroller.scrollTop,
		leading,
		itemSize: tabRect.height,
		viewport: scroller.clientHeight,
	})

	if (next !== scroller.scrollTop) scroller.scrollTo({ top: next })
}

/**
 * Keeps the active tab visible inside the scroll viewport: on mount it brings
 * the current tab into view (a deep-linked or overflowed selection survives
 * page load), and a delegated `focusin` listener does the same for whichever
 * tab takes focus, so roving never strands focus off-screen. Both scope the
 * scroll to the viewport, never an outer container or the page.
 *
 * @param scrollRef - The overflow viewport wrapping the tab list.
 * @param orientation - List flow axis; selects the scroll axis.
 * @param enabled - Off for the segment variant, which renders no viewport.
 */
export function useTabListScroll(
	scrollRef: RefObject<HTMLDivElement | null>,
	orientation: TabsOrientation,
	enabled: boolean,
) {
	useEffect(() => {
		const scroller = scrollRef.current

		if (!scroller || !enabled) return

		const axis = orientation === 'vertical' ? 'y' : 'x'

		const current = scroller.querySelector<HTMLElement>(CURRENT_TAB_SELECTOR)

		if (current) scrollTabIntoView(scroller, current, axis)

		const onFocusIn = (event: FocusEvent) => {
			const target = event.target

			if (!(target instanceof HTMLElement)) return

			const tab = target.closest<HTMLElement>(TAB_SELECTOR)

			if (tab && scroller.contains(tab)) scrollTabIntoView(scroller, tab, axis)
		}

		scroller.addEventListener('focusin', onFocusIn)

		return () => scroller.removeEventListener('focusin', onFocusIn)
	}, [scrollRef, orientation, enabled])
}
