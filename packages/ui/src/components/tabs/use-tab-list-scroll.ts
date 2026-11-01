'use client'

import { type FocusEvent, useRef } from 'react'
import { scrollNodeWithin } from '../../hooks/use-scroll-within'
import type { TabsOrientation } from './context'
import { FLOW_SCROLL, TAB_SELECTOR } from './tabs-constants'

/**
 * Keeps a focused tab visible inside the scroll viewport. The returned
 * `onFocus` handler goes on the tab list in the viewport. It scrolls whichever
 * tab takes focus into view, so roving never strands focus off-screen. A tab
 * that becomes current without focus, as on the Back button of the browser,
 * scrolls through {@link useTabSelectScroll}. Each scopes the scroll to the
 * viewport, never an outer container or the page.
 *
 * A mount does not scroll. The server and the client paint the row at its
 * start, so the first paint and the hydrated page agree.
 *
 * @param orientation - List flow axis; selects the scroll axis.
 * @param enabled - Off for the segment variant, which renders no viewport.
 * @returns The ref of the viewport, and the focus handler of the tab list.
 */
export function useTabListScroll(orientation: TabsOrientation, enabled: boolean) {
	const scrollRef = useRef<HTMLDivElement>(null)

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

	return { scrollRef, onFocus }
}
