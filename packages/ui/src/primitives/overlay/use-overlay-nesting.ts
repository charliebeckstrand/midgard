'use client'

import { use, useLayoutEffect } from 'react'
import { createContext } from '../../core/create-context'
import {
	closestFloatingPortal,
	publishPortalReference,
} from '../../utilities/floating-portal-registry'

/**
 * The root node of the nearest overlay, for an overlay that opens in its
 * content. The value is a getter with one identity for the life of the
 * overlay, so the mount of the node does not render the content again.
 *
 * @internal
 */
export const [OverlayNodeContext] = createContext<(() => HTMLElement | null) | null>(
	'OverlayNode',
	{ default: null },
)

/**
 * Publishes the root node of the parent overlay as the reference of the portal
 * of `node`, the root node of an overlay that opens in the content of the
 * parent.
 *
 * @remarks
 * A Dialog that opens from a non-modal Sheet portals out of the DOM of the
 * Sheet. Without the reference, the outside press of the Sheet reads each press
 * in the Dialog as outside, and the Sheet closes. The Dialog is in the content
 * of the Sheet, so it unmounts with the Sheet. With the reference, the
 * outside-press tests and the stack of the layers know that the Dialog is in
 * the Sheet, as they know it for a menu that opens from the Sheet.
 *
 * Before hydration, an overlay renders in place, in the DOM of its parent.
 * Containment then answers, and the overlay publishes nothing.
 *
 * @param node - The root node of the overlay, or `null` before it mounts.
 * @internal
 */
export function useOverlayNesting(node: HTMLElement | null): void {
	const parent = use(OverlayNodeContext)

	useLayoutEffect(() => {
		const parentNode = parent?.()

		if (!node || !parentNode) return

		const portal = closestFloatingPortal(node)

		if (!portal || portal === closestFloatingPortal(parentNode)) return

		return publishPortalReference(portal, () => parent?.() ?? null)
	}, [node, parent])
}
