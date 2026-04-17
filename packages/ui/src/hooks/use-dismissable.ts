'use client'

import { type RefObject, useEffect, useRef } from 'react'

export type UseDismissableOptions = {
	open: boolean
	onDismiss: () => void
	/** Escape key closes. @default true */
	escape?: boolean
	/** Pointer down outside the container closes. @default true */
	outsidePointer?: boolean
	/** Locks body scroll while open. Nested locks are reference-counted. @default false */
	scrollLock?: boolean
	/** External ref for the outside-pointer boundary. If omitted, attach the returned ref. */
	containerRef?: RefObject<HTMLElement | null>
}

// Reference-counted so nested overlays don't release the lock prematurely.
let scrollLockCount = 0

let scrollLockPrevious = ''

function acquireScrollLock() {
	if (typeof document === 'undefined') return

	if (scrollLockCount === 0) {
		scrollLockPrevious = document.body.style.overflow

		document.body.style.overflow = 'hidden'
	}

	scrollLockCount++
}

function releaseScrollLock() {
	if (typeof document === 'undefined') return

	scrollLockCount--

	if (scrollLockCount === 0) {
		document.body.style.overflow = scrollLockPrevious
	}
}

/** Dismiss behavior for overlays — Escape, click-outside, optional scroll lock. */
export function useDismissable<T extends HTMLElement = HTMLDivElement>({
	open,
	onDismiss,
	escape: escapeEnabled = true,
	outsidePointer = true,
	scrollLock = false,
	containerRef: externalRef,
}: UseDismissableOptions): RefObject<T | null> {
	const internalRef = useRef<T | null>(null)

	const ref = (externalRef ?? internalRef) as RefObject<T | null>

	const onDismissRef = useRef(onDismiss)

	onDismissRef.current = onDismiss

	useEffect(() => {
		if (!open) return

		const cleanups: Array<() => void> = []

		if (escapeEnabled) {
			const onKeyDown = (e: KeyboardEvent) => {
				if (e.key === 'Escape') onDismissRef.current()
			}

			document.addEventListener('keydown', onKeyDown)

			cleanups.push(() => document.removeEventListener('keydown', onKeyDown))
		}

		if (outsidePointer) {
			const onPointerDown = (e: PointerEvent) => {
				const el = ref.current

				if (el && !el.contains(e.target as Node)) onDismissRef.current()
			}

			document.addEventListener('pointerdown', onPointerDown)

			cleanups.push(() => document.removeEventListener('pointerdown', onPointerDown))
		}

		if (scrollLock) {
			acquireScrollLock()

			cleanups.push(releaseScrollLock)
		}

		return () => {
			for (const cleanup of cleanups) cleanup()
		}
	}, [open, escapeEnabled, outsidePointer, scrollLock, ref])

	return ref
}
