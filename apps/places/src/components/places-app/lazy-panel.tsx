'use client'

import { type ReactNode, Suspense, useState } from 'react'

/** Props for {@link LazyPanel}. */
export type LazyPanelProps = {
	/** Whether the panel is open. */
	open: boolean
	/** Whether the code of the panel has loaded. */
	loaded: boolean
	/** The panel, a component whose code loads on use. */
	children: ReactNode
}

/**
 * Renders a panel whose code loads on use: from the load of its code or its
 * first open on, whichever comes first.
 *
 * Before that, the panel is not rendered, so its code does not load for it.
 * After that, it stays rendered, because a closing panel has an exit to play.
 * The app loads the code of the panels in idle time, so a panel usually mounts
 * closed, before its first open.
 *
 * The render that first shows a lazy panel suspends, also when its code is in
 * the cache. A panel that mounts after the first render gets a Suspense boundary
 * of its own. Without one, the suspense reaches the boundary of the page. React
 * then hides the whole app for a frame and shows it again. That hide interrupts
 * the exit of a closing surface: the user menu opens two of the panels, and it
 * closes in the same render. A hidden menu showed its panel again at full
 * opacity, took no input, and did not unmount.
 *
 * A panel that is open on the first render, because the address opens it, gets
 * no boundary. On the server, a boundary that waits for code sends its content
 * after the shell, in a hidden segment. The browser can paint the shell first,
 * and React shows the segment in a later frame. Thus a reload painted the map
 * with no panel for a frame. With no boundary, the shell waits for the code, and
 * the panel paints with the page. The hydration waits for the code in the same
 * way, and keeps the HTML of the server until then.
 */
export function LazyPanel({ open, loaded, children }: LazyPanelProps) {
	const [opened, setOpened] = useState(open)

	// Whether the panel is open on the first render. It does not change, so the
	// boundary does not come or go, which would mount the panel again.
	const [first] = useState(open)

	if (open && !opened) setOpened(true)

	if (!opened && !open && !loaded) return null

	if (first) return children

	return <Suspense fallback={null}>{children}</Suspense>
}
