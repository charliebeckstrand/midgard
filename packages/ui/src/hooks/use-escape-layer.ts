'use client'

import { useEffect, useEffectEvent } from 'react'
import { isTopDismissLayer, registerDismissLayer } from '../utilities/dismiss-layers'
import { subscribeDocumentEvent } from '../utilities/document-listener'

type EscapeLayerOptions = {
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
 * are ignored.
 *
 * @remarks
 * `onDismiss` is raised through an effect event, so the press always reaches
 * the latest render's callback and its identity never re-registers the layer.
 * A caller passes a fresh closure each render safely, and needs no shadow of
 * its own.
 */
export function useEscapeLayer({
	open,
	enabled = true,
	layered = true,
	onDismiss,
}: EscapeLayerOptions): void {
	const dismiss = useEffectEvent(onDismiss)

	useEffect(() => {
		if (!open || !enabled) return

		const layer = {}

		const unregister = layered ? registerDismissLayer(layer) : undefined

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape' || event.defaultPrevented) return

			if (layered && !isTopDismissLayer(layer)) return

			dismiss(event)
		}

		const unsubscribe = subscribeDocumentEvent('keydown', onKeyDown)

		return () => {
			unsubscribe()

			unregister?.()
		}
	}, [open, enabled, layered])
}
