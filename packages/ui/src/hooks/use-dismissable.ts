'use client'

import { type RefObject, useEffect, useEffectEvent, useRef } from 'react'
import { subscribeDocumentEvent } from '../utilities/document-listener'
import { pressLandsInSurfaceOpenedWithin } from '../utilities/floating-portal-registry'
import { useEscapeLayer } from './use-escape-layer'

type DismissableOptions<T extends HTMLElement = HTMLDivElement> = {
	open: boolean
	onDismiss: () => void
	/** Escape key closes. @defaultValue true */
	escape?: boolean
	/** Pointer down outside the container closes. @defaultValue true */
	outsidePointer?: boolean
	/** External ref for the outside-pointer boundary. If omitted, attach the returned ref. */
	containerRef?: RefObject<T | null>
}

/**
 * Dismiss behavior for overlays: closes on Escape (routed through the shared
 * dismiss-layer stack via `useEscapeLayer`) and on pointer-down outside the
 * boundary, both gated on `open`. Use `useScrollLock` for body-scroll locking.
 *
 * @remarks Pass a fresh `onDismiss` closure each render if that is convenient;
 * both routes reach the latest one, and neither re-subscribes its listener when
 * the identity changes.
 *
 * A floating surface opened from inside the boundary — a menu in a non-modal
 * sheet's footer, say — portals out of its DOM subtree, so plain containment
 * reads a press in it as outside. Such a press counts as inside (see
 * `pressLandsInSurfaceOpenedWithin`); without that, the boundary closes on
 * pointer-down and unmounts the menu before its click can fire.
 *
 * @returns The container ref defining the outside-pointer boundary. Attach it
 * to the overlay root, or pass your own via `containerRef` and ignore the
 * return.
 */
export function useDismissable<T extends HTMLElement = HTMLDivElement>({
	open,
	onDismiss,
	escape: escapeEnabled = true,
	outsidePointer = true,
	containerRef: externalRef,
}: DismissableOptions<T>): RefObject<T | null> {
	const internalRef = useRef<T | null>(null)

	const ref = externalRef ?? internalRef

	// `useEscapeLayer` raises its own callback through an effect event, so the
	// Escape route needs no shadow here; only this hook's own listener does.
	const dismiss = useEffectEvent(onDismiss)

	useEscapeLayer({
		open,
		enabled: escapeEnabled,
		onDismiss,
	})

	useEffect(() => {
		if (!open || !outsidePointer) return

		const onPointerDown = (event: PointerEvent) => {
			const el = ref.current

			if (!el) return

			const target = event.target

			if (
				target instanceof Node &&
				(el.contains(target) || pressLandsInSurfaceOpenedWithin(el, target))
			)
				return

			dismiss()
		}

		return subscribeDocumentEvent('pointerdown', onPointerDown)
	}, [open, outsidePointer, ref])

	return ref
}
