'use client'

import { useInView } from 'motion/react'
import type { RefObject } from 'react'
import { useHydrated } from '../../hooks/use-hydrated'
import type { Mount } from './mount'
import { type MountHoldState, useMountHold } from './use-mount'

/** What {@link useViewportHold} gives the box that it gates. @internal */
export type ViewportHold = {
	/** The hold of the content. Render the fallback while it is not present. */
	hold: MountHoldState
	/** Whether the box is in the viewport, or within the margin of it. */
	inView: boolean
}

/**
 * Holds the content of a box back until the box comes near the viewport: the
 * gate of a chat embed and a dashboard tile. `lazy` mounts the content at the
 * first sight, and keeps it. `active` also unmounts it when the box leaves. A
 * margin of 200 pixels prepares the content just before the reader reaches it.
 *
 * @remarks
 * The server and the hydration render give an absent hold, so the box shows its
 * fallback there. An observer cannot run on the server, and the client must
 * hydrate the same markup. The gate therefore opens only after hydration.
 *
 * `always` takes no gate, because its content is live from the first render.
 * A caller renders that content bare, with no observer.
 *
 * @param ref - The box to observe. It stays in the DOM while the content is held back.
 * @param mount - The policy of the content: `lazy` or `active`.
 * @param options - `seen`: whether the content is active before the box is in
 * view, as for a box that the reader reached before a remount.
 * @returns The {@link ViewportHold} of the box.
 * @internal
 */
export function useViewportHold(
	ref: RefObject<Element | null>,
	mount: Exclude<Mount, 'always'>,
	options?: { seen?: boolean },
): ViewportHold {
	// `active` must see the box leave the viewport, so its observer stays
	// connected. `lazy` needs only the first sight.
	const inView = useInView(ref, { margin: '200px', once: mount !== 'active' })

	const hydrated = useHydrated()

	const hold = useMountHold(hydrated && (inView || (options?.seen ?? false)), mount)

	return { hold, inView }
}
