'use client'

import type { ReactNode } from 'react'
import { createContext } from '../../core'

/**
 * What a drag-handle host broadcasts: the handle element it minted — already
 * wired with its drag listeners and activator ref — and the registrar a
 * chrome surface calls while it renders that handle inline.
 */
export type DragHandleContextValue = {
	/** The host's handle node, ready to render wherever the chrome adopts it. */
	handle: ReactNode
	/**
	 * Claims the handle while the caller renders it, so the host stands its
	 * floating fallback down; returns the release. Call from a layout effect —
	 * claim on mount, release on cleanup — and the host never shows two
	 * handles or none.
	 */
	claim: () => () => void
}

/**
 * Ambient drag-handle channel between a tile host and the chrome inside it.
 * A host that makes its content draggable (the dashboard's editing mode)
 * provides the minted handle here; a header rendered anywhere below adopts
 * it as its leading element and `claim`s it, and a tile whose content never
 * claims gets the host's floating fallback instead. Returns `null` outside
 * any provider — content not hosted by a drag surface renders no handle.
 *
 * The channel carries behaviour, not styling: the host owns the handle's
 * look and wiring, the adopter only decides where it sits.
 */
const [DragHandleContext, useDragHandle] = createContext<DragHandleContextValue | null>(
	'DragHandle',
	{ default: null },
)

export { DragHandleContext, useDragHandle }
