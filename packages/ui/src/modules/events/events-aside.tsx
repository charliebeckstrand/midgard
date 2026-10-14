'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { cn } from '../../core'
import { createLazyModule } from '../../utilities/lazy-module'
import { getEventSink } from './engine/events-sink'
import { useEventsPinned } from './use-events-pinned'

const panel = createLazyModule(() => import('./events-panel'))

const readNothing = () => null

/** Props of {@link EventsAside}. */
export type EventsAsideProps = {
	/** The class of the panel box, such as a width. @defaultValue 'w-96' */
	className?: string
}

/**
 * The pinned panel of the events, for the `aside` of `SidebarLayout`. From
 * `lg` up, while the events run and the panel is pinned, it shows each event
 * as it comes in, with the Bugs tab and Capture. The Pin of the events sheet
 * pins it, and its Unpin returns the view to `EventsButton`.
 *
 * The box renders on the server too, and CSS shows it by the attributes that
 * `EventsScript` writes before the first paint. The page then paints at its
 * final width, and the content of the panel loads after hydration. The
 * sources skip the events in the panel, so the store does not record its own
 * rows, and the panel does not pause the store.
 */
export function EventsAside({ className = 'w-96' }: EventsAsideProps) {
	const pinned = useEventsPinned()

	const Panel = useSyncExternalStore(panel.subscribe, panel.read, readNothing)?.EventsPanel

	// The store pauses while the panel loads, so it does not record the load of
	// its own module. A load that fails leaves the box empty.
	useEffect(() => {
		if (!pinned || panel.read()) return

		const store = getEventSink()?.store

		if (store) store.paused = true

		void panel
			.load()
			.catch(() => undefined)
			.finally(() => {
				if (store) store.paused = false
			})
	}, [pinned])

	// The attribute marks the panel as a part of the tools (`OWN`).
	return (
		<aside
			data-events-tool=""
			aria-label="Events"
			className={cn(
				'hidden h-full min-h-0 flex-col py-2 pe-2 lg:[:root[data-events][data-events-pinned]_&]:flex',
				className,
			)}
		>
			{pinned && Panel && <Panel />}
		</aside>
	)
}
