'use client'

import { type RefObject, useEffect, useRef } from 'react'
import { subscribeDocumentEvent } from '../utilities/document-listener'
import { useEscapeLayer } from './use-escape-layer'

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

/** Dismiss behavior for overlays: Escape and click-outside. Use `useScrollLock` for body-scroll locking. */
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

	useEscapeLayer({
		open,
		enabled: escapeEnabled,
		onDismiss: () => onDismissRef.current(),
	})

	useEffect(() => {
		if (!open || !outsidePointer) return

		const onPointerDown = (e: PointerEvent) => {
			const el = ref.current

			if (el && !el.contains(e.target as Node)) onDismissRef.current()
		}

		return subscribeDocumentEvent('pointerdown', onPointerDown)
	}, [open, outsidePointer, ref])

	return ref
}
