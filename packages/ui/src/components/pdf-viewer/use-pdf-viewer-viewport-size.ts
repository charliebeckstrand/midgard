'use client'

import { type RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'

export type ViewportSize = { width: number; height: number }

/**
 * Tracks the content-box size of `ref.current` (`clientWidth`/`Height` minus padding).
 *
 * Re-measures synchronously when `invalidationKey` changes, so callers can force a
 * measurement before paint — e.g. on rotation flip, where the viewport's aspect
 * ratio changes and we want `fitScale` calculated against the new dimensions
 * before the browser paints, instead of waiting a frame for `ResizeObserver`.
 */
export function usePdfViewerViewportSize(
	ref: RefObject<HTMLElement | null>,
	invalidationKey: unknown,
): ViewportSize | null {
	const [size, setSize] = useState<ViewportSize | null>(null)

	const lastInvalidationKeyRef = useRef(invalidationKey)

	// `measure` is the same operation whether triggered by ResizeObserver or by
	// an invalidation-key change. Pulling it out of the effects keeps both
	// branches honest and lets each effect declare its real dependencies.
	const measure = useCallback(() => {
		const el = ref.current

		if (!el) return

		const styles = window.getComputedStyle(el)

		const padX = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight)
		const padY = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)

		setSize({
			width: el.clientWidth - padX,
			height: el.clientHeight - padY,
		})
	}, [ref])

	useLayoutEffect(() => {
		const el = ref.current

		if (!el) return

		measure()

		const observer = new ResizeObserver(measure)

		observer.observe(el)

		return () => observer.disconnect()
	}, [ref, measure])

	// Caller-driven invalidation: re-measure during render when the key flips.
	// The setup effect above measures on mount, so this short-circuits when the
	// key matches the initial value.
	if (lastInvalidationKeyRef.current !== invalidationKey) {
		lastInvalidationKeyRef.current = invalidationKey
		measure()
	}

	return size
}
