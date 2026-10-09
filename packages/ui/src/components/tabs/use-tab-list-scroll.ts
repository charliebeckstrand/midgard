'use client'

import { type FocusEvent, type RefObject, useEffect } from 'react'
import { type ScrollWithinOptions, scrollNodeWithin } from '../../hooks/use-scroll-within'
import type { TabsOrientation } from './context'
import { TAB_SELECTOR } from './tabs-constants'

/** Matches the current (selected) tab; `Tab` stamps `data-current` on the active trigger. */
const CURRENT_TAB_SELECTOR = '[data-slot="tab"][data-current]'

/** The least move on the flow axis of the list. The cross axis keeps its position. */
const FLOW_SCROLL: Record<TabsOrientation, ScrollWithinOptions> = {
	horizontal: { inline: 'nearest' },
	vertical: { block: 'nearest' },
}

/**
 * Keeps the active tab visible inside the scroll viewport. On mount it brings
 * the current tab into view, so a deep-linked or overflowed selection survives
 * page load. The returned `onFocus` handler goes on the tab list in the
 * viewport. It does the same for whichever tab takes focus, so roving never
 * strands focus off-screen. Both scope the scroll to the viewport, never an outer container
 * or the page.
 *
 * @param scrollRef - The overflow viewport wrapping the tab list.
 * @param orientation - List flow axis; selects the scroll axis.
 * @param enabled - Off for the segment variant, which renders no viewport.
 * @returns The focus handler of the tab list.
 */
export function useTabListScroll(
	scrollRef: RefObject<HTMLDivElement | null>,
	orientation: TabsOrientation,
	enabled: boolean,
) {
	const options = FLOW_SCROLL[orientation]

	useEffect(() => {
		const scroller = scrollRef.current

		if (!scroller || !enabled) return

		const current = scroller.querySelector<HTMLElement>(CURRENT_TAB_SELECTOR)

		if (current) scrollNodeWithin(scroller, current, options)
	}, [scrollRef, options, enabled])

	const onFocus = (event: FocusEvent<HTMLDivElement>) => {
		const scroller = scrollRef.current

		if (!scroller || !enabled) return

		const target = event.target

		if (!(target instanceof HTMLElement)) return

		const tab = target.closest<HTMLElement>(TAB_SELECTOR)

		// A React focus event also bubbles from a portal. Thus the handler
		// scrolls only for a tab in the viewport.
		if (tab && scroller.contains(tab)) scrollNodeWithin(scroller, tab, options)
	}

	return onFocus
}
