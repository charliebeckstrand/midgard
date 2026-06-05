'use client'

import { type RefObject, useEffect, useRef } from 'react'
import { subscribeDocumentEvent } from './document-listener'

type DismissableOptions<T extends HTMLElement = HTMLDivElement> = {
	open: boolean
	onDismiss: () => void
	/** Escape key closes. @default true */
	escape?: boolean
	/** Pointer down outside the container closes. @default true */
	outsidePointer?: boolean
	/** External ref for the outside-pointer boundary. If omitted, attach the returned ref. */
	containerRef?: RefObject<T | null>
}

/** Dismiss behavior for overlays — Escape and click-outside. Use `useScrollLock` for body-scroll locking. */
export function useDismissable<T extends HTMLElement = HTMLDivElement>({
	open,
	onDismiss,
	escape: escapeEnabled = true,
	outsidePointer = true,
	containerRef: externalRef,
}: DismissableOptions<T>): RefObject<T | null> {
	const internalRef = useRef<T | null>(null)

	const ref = externalRef ?? internalRef

	const onDismissRef = useRef(onDismiss)

	onDismissRef.current = onDismiss

	useEffect(() => {
		if (!open) return

		const cleanups: Array<() => void> = []

		if (escapeEnabled) {
			const onKeyDown = (e: KeyboardEvent) => {
				if (e.key === 'Escape') onDismissRef.current()
			}

			cleanups.push(subscribeDocumentEvent('keydown', onKeyDown))
		}

		if (outsidePointer) {
			const onPointerDown = (e: PointerEvent) => {
				const el = ref.current

				if (el && !el.contains(e.target as Node)) onDismissRef.current()
			}

			cleanups.push(subscribeDocumentEvent('pointerdown', onPointerDown))
		}

		return () => {
			for (const cleanup of cleanups) cleanup()
		}
	}, [open, escapeEnabled, outsidePointer, ref])

	return ref
}
