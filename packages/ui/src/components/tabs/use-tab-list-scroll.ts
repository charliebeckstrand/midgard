'use client'

import { useComposedRefs } from 'motion/react'
import { type FocusEvent, type RefCallback, useRef, useState } from 'react'
import { useHydrated } from '../../hooks/use-hydrated'
import { type ScrollWithinOptions, scrollNodeWithin } from '../../hooks/use-scroll-within'
import type { TabsOrientation } from './context'
import { FLOW_SCROLL, TAB_SELECTOR } from './tabs-constants'

/** Matches the current (selected) tab; `Tab` stamps `data-current` on the active trigger. */
const CURRENT_TAB_SELECTOR = '[data-slot="tab"][data-current]'

/** Scrolls the current tab into view in `scroller`, if a tab is current. React gives `null` on detach. */
function revealCurrentTab(scroller: HTMLDivElement | null, options: ScrollWithinOptions) {
	const tab = scroller?.querySelector<HTMLElement>(CURRENT_TAB_SELECTOR)

	if (scroller && tab) scrollNodeWithin(scroller, tab, options)
}

/**
 * Ref callbacks of the viewport, one for each axis, so each keeps one identity.
 * React attaches a ref in the commit, before the browser paints, so a list that
 * mounts on the client paints with the current tab in view. A list that
 * hydrates does not use them.
 */
const REVEAL_CURRENT_TAB: Record<TabsOrientation, RefCallback<HTMLDivElement>> = {
	horizontal: (scroller) => revealCurrentTab(scroller, FLOW_SCROLL.horizontal),
	vertical: (scroller) => revealCurrentTab(scroller, FLOW_SCROLL.vertical),
}

/**
 * Keeps the active tab visible inside the scroll viewport. When a list mounts
 * on the client, the viewport brings the current tab into view as it attaches,
 * so the list paints with the tab in view after a client navigation. A
 * server-rendered list paints before hydration, and the hydration does not
 * scroll it: a scroll then would move a row that the reader already sees. The
 * current tab is the initial scroll target of the viewport instead (the `tab`
 * slot of the kata), so where the browser supports `scroll-initial-target`,
 * the server paint has the tab in view. The returned `onFocus` handler goes on
 * the tab list in the viewport. It does the same for whichever tab takes
 * focus, so roving never strands focus off-screen. A tab that becomes current
 * without focus, as on the Back button of the browser, scrolls through
 * {@link useTabSelectScroll}. Each scopes the scroll to the viewport, never an
 * outer container or the page.
 *
 * @param orientation - List flow axis; selects the scroll axis.
 * @param enabled - Off for the segment variant, which renders no viewport.
 * @returns The ref of the viewport, and the focus handler of the tab list.
 */
export function useTabListScroll(orientation: TabsOrientation, enabled: boolean) {
	const scrollRef = useRef<HTMLDivElement>(null)

	const hydrated = useHydrated()

	// `false` in the hydration render, so a list that hydrates keeps the scroll
	// of its server paint. The state keeps the value of the mount.
	const [mountedOnClient] = useState(hydrated)

	const setScroller: RefCallback<HTMLDivElement> = useComposedRefs(
		scrollRef,
		mountedOnClient ? REVEAL_CURRENT_TAB[orientation] : undefined,
	)

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
