'use client'

import { type FocusEvent, type RefCallback, useRef } from 'react'
import { useComposedRef } from '../../hooks/use-composed-ref'
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

/** Scrolls the current tab into view in `scroller`, if a tab is current. React gives `null` on detach. */
function revealCurrentTab(scroller: HTMLDivElement | null, options: ScrollWithinOptions) {
	const current = scroller?.querySelector<HTMLElement>(CURRENT_TAB_SELECTOR)

	if (scroller && current) scrollNodeWithin(scroller, current, options)
}

/**
 * Ref callbacks of the viewport, one for each axis, so each keeps one identity.
 * React attaches a ref in the commit, before the browser paints, so a list that
 * mounts on the client paints with the current tab in view.
 */
const REVEAL_CURRENT_TAB: Record<TabsOrientation, RefCallback<HTMLDivElement>> = {
	horizontal: (scroller) => revealCurrentTab(scroller, FLOW_SCROLL.horizontal),
	vertical: (scroller) => revealCurrentTab(scroller, FLOW_SCROLL.vertical),
}

/**
 * Keeps the active tab visible inside the scroll viewport. When the viewport
 * attaches, it brings the current tab into view before the first paint, so a
 * deep-linked or overflowed selection survives page load and a client
 * navigation. A server-rendered list gets the same scroll from
 * `CurrentScrollScript` before hydration. The returned `onFocus` handler goes
 * on the tab list in the viewport. It does the same for whichever tab takes
 * focus, so roving never strands focus off-screen. Both scope the scroll to the
 * viewport, never an outer container or the page.
 *
 * @param orientation - List flow axis; selects the scroll axis.
 * @param enabled - Off for the segment variant, which renders no viewport.
 * @returns The ref of the viewport, and the focus handler of the tab list.
 */
export function useTabListScroll(orientation: TabsOrientation, enabled: boolean) {
	const scrollRef = useRef<HTMLDivElement>(null)

	const setScroller = useComposedRef(scrollRef, REVEAL_CURRENT_TAB[orientation])

	const options = FLOW_SCROLL[orientation]

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

	return { setScroller, onFocus }
}
