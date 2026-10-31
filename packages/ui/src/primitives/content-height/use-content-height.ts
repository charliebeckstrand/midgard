'use client'

import { useSyncExternalStore } from 'react'
import { noopSubscribe } from '../../utilities/noop'
import type { ContentHeightHost } from './context'

/** The server cannot measure a box, so no box is available there. */
const onServer = () => false

/**
 * Whether `host` takes the height of its content now. The reader renders again
 * when the value changes.
 *
 * @param host - The box, or `null` outside a box.
 * @returns `false` for `null`, on the server, and in the hydration render.
 */
export function useContentHeightAvailable(host: ContentHeightHost | null): boolean {
	return useSyncExternalStore(
		host?.subscribe ?? noopSubscribe,
		() => host?.available() ?? false,
		onServer,
	)
}
