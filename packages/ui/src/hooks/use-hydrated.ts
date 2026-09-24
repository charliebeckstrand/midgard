'use client'

import { useSyncExternalStore } from 'react'

/** A subscription that never fires, because the snapshot changes only at hydration. */
const subscribeNothing = () => () => {}

/** The snapshot on the client. */
const onClient = () => true

/** The snapshot on the server and in the hydration render. */
const onServer = () => false

/**
 * Whether the client has hydrated: `false` on the server and in the hydration
 * render, and `true` after. A render that does not hydrate is `true` at once.
 *
 * @remarks
 * Gate on it where a value that only the client can read decides the markup.
 * The server and the hydration render then agree, and the client value takes
 * effect in the render after hydration. `useInView` is the case in point: it
 * reports visible where no observer exists, so a server draws what the first
 * client render defers.
 *
 * @returns Whether the client has hydrated.
 * @internal
 */
export function useHydrated(): boolean {
	return useSyncExternalStore(subscribeNothing, onClient, onServer)
}
