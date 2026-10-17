'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useLazyModule } from '../../hooks/use-lazy-module'
import { createLazyModule } from '../../utilities/lazy-module'
import { noop } from '../../utilities/noop'
import { addEventsDock, isEventsPinned, subscribePinned } from './engine/events-setting'
import { loadTools } from './events-load'

const panel = createLazyModule(() => import('./events-panel'))

// The server does not know the setting, so the first render after hydration reads it.
const pinnedOnServer = () => false

/**
 * The pinned panel of the events, for the `aside` of `SidebarLayout`. While
 * the layout is inline, the events run and the panel is pinned, it shows each event
 * as it comes in, with the Bugs tab and Capture. The Pin of the events sheet
 * pins it, and its Unpin returns the view to `EventsButton`.
 *
 * The box renders on the server too, and CSS shows it by the attributes that
 * `EventsScript` writes before the first paint. The page then paints at its
 * final width, and the content of the panel loads after hydration. The
 * sources skip the events in the panel, so the store does not record its own
 * rows, and the panel does not pause the store.
 */
export function EventsAside() {
	const pinned = useSyncExternalStore(subscribePinned, isEventsPinned, pinnedOnServer)

	const Panel = useLazyModule(panel, false)?.EventsPanel

	// The mounted panel lets the sheet show Pin.
	useEffect(addEventsDock, [])

	// The store pauses while the panel loads, so it does not record the load of
	// its own module. A load that fails leaves the box empty.
	useEffect(() => {
		if (pinned && !panel.read()) loadTools(panel, false).catch(noop)
	}, [pinned])

	// The attribute marks the panel as a part of the tools (`OWN`).
	return (
		<aside
			data-events-tool=""
			aria-label="Events"
			// The aside of the layout shows only in the inline layout, so the panel
			// needs no breakpoint of its own.
			className="hidden h-full min-h-0 w-96 flex-col py-2 pe-2 [:root[data-events][data-events-pinned]_&]:flex"
		>
			{pinned && Panel && <Panel />}
		</aside>
	)
}
