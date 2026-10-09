'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import {
	isTopDismissLayer,
	nextDismissOrder,
	registerDismissLayer,
} from '../utilities/dismiss-layers'
import { subscribeDocumentEvent } from '../utilities/document-listener'
import { isComposing } from '../utilities/is-composing'

/** Options for {@link useEscapeLayer}: where the layer sits in the dismiss stack and what an Escape press does there. */
export type EscapeLayerOptions = {
	open: boolean
	/** Gate dismissal without unmounting the hook. @defaultValue true */
	enabled?: boolean
	/**
	 * Layered surfaces (the default) occupy a slot on the shared dismiss stack,
	 * and Escape dismisses only the topmost open surface. Pass `false` for
	 * incidental surfaces (tooltips) that close on any Escape press without
	 * consuming it for the surface beneath.
	 * @defaultValue true
	 */
	layered?: boolean
	onDismiss: (event: KeyboardEvent) => void
}

/**
 * Escape-key dismissal routed through the shared dismiss-layer stack, so
 * stacked surfaces (menu in dialog, dialog over sheet) close one per press,
 * innermost first. Presses a consumer already handled (`preventDefault`)
 * are ignored. The layer also ignores an Escape that is part of an IME
 * composition, because the IME uses that key to cancel the composition.
 *
 * @remarks
 * `onDismiss` is raised through an effect event, so the press always reaches
 * the latest render's callback and its identity never re-registers the layer.
 * A caller passes a fresh closure each render safely, and needs no shadow of
 * its own.
 *
 * The render that opens the layer takes its place in the stack. A parent and a
 * child that open in the same commit therefore stack parent below child, as
 * they render, although the child's effect registers first.
 */
export function useEscapeLayer({
	open,
	enabled = true,
	layered = true,
	onDismiss,
}: EscapeLayerOptions): void {
	const dismiss = useEffectEvent(onDismiss)

	// The open order, taken in the render that opens the layer. React renders a
	// parent before its child, but runs the child's effect first.
	const [order, setOrder] = useState<number | null>(null)

	if (open && order === null) setOrder(nextDismissOrder())
	else if (!open && order !== null) setOrder(null)

	useEffect(() => {
		if (!open || !enabled || order === null) return

		const layer = {}

		const unregister = layered ? registerDismissLayer(layer, order) : undefined

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape' || event.defaultPrevented) return

			// An IME uses Escape to cancel a composition, so the key belongs to the textbox.
			if (isComposing(event)) return

			if (layered && !isTopDismissLayer(layer)) return

			dismiss(event)
		}

		const unsubscribe = subscribeDocumentEvent('keydown', onKeyDown)

		return () => {
			unsubscribe()

			unregister?.()
		}
	}, [open, enabled, layered, order])
}
