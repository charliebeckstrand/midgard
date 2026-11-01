'use client'

import { useLayoutEffect, useRef } from 'react'
import { scrollNodeWithin } from '../../hooks/use-scroll-within'
import type { TabsOrientation } from './context'
import { FLOW_SCROLL, TAB_LIST_SCROLL_SELECTOR } from './tabs-constants'

/**
 * Scrolls a tab into its viewport when the tab becomes current, before the
 * paint. Thus a selection that does not move focus, such as a controlled
 * `value` that the Back button of the browser sets, keeps the current tab in
 * view. The scroll occurs once on each change from not current to current. The
 * mount does not count: the ref callback of the viewport scrolls then. A
 * StrictMode replay of the effect sees no change, so it does not scroll.
 *
 * @param current - Whether the tab is current.
 * @param orientation - List flow axis; selects the scroll axis.
 * @param enabled - Off for the segment variant, which renders no viewport.
 * @returns The ref of the tab trigger.
 */
export function useTabSelectScroll(
	current: boolean,
	orientation: TabsOrientation,
	enabled: boolean,
) {
	const ref = useRef<HTMLButtonElement>(null)

	const wasCurrent = useRef(current)

	useLayoutEffect(() => {
		const becameCurrent = current && !wasCurrent.current

		wasCurrent.current = current

		const tab = ref.current

		const scroller = tab?.closest<HTMLElement>(TAB_LIST_SCROLL_SELECTOR)

		if (becameCurrent && enabled && tab && scroller)
			scrollNodeWithin(scroller, tab, FLOW_SCROLL[orientation])
	}, [current, orientation, enabled])

	return ref
}
