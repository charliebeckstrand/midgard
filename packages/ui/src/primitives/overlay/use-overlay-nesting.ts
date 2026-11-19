'use client'

import { use, useLayoutEffect } from 'react'
import {
	closestFloatingPortal,
	publishPortalReference,
} from '../../utilities/floating-portal-registry'
import { SurfaceNodeContext } from '../portal/context'

/**
 * Publishes the root node of the nearest surface, an overlay or a floating
 * surface, as the reference of the portal of `node`, the root node of an
 * overlay that opens in the content of that surface.
 *
 * @remarks
 * A Dialog that opens from a non-modal Sheet portals out of the DOM of the
 * Sheet. Without the reference, the outside press of the Sheet reads each press
 * in the Dialog as outside, and the Sheet closes. The Dialog is in the content
 * of the Sheet, so it unmounts with the Sheet. With the reference, the
 * outside-press tests and the stack of the layers know that the Dialog is in
 * the Sheet, as they know it for a menu that opens from the Sheet. The nearest
 * surface is the reference, so a Popover between the Sheet and the Dialog
 * keeps the Dialog too.
 *
 * Before hydration, an overlay renders in place, in the DOM of its parent.
 * Containment then answers, and the overlay publishes nothing.
 *
 * @param node - The root node of the overlay, or `null` before it mounts.
 * @internal
 */
export function useOverlayNesting(node: HTMLElement | null): void {
	const parent = use(SurfaceNodeContext)

	useLayoutEffect(() => {
		if (!node || !parent) return

		const portal = closestFloatingPortal(node)

		if (!portal || portal === closestFloatingPortal(parent())) return

		return publishPortalReference(portal, parent)
	}, [node, parent])
}
