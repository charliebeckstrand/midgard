'use client'

import { type RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'

type ViewportSize = { width: number; height: number }

/**
 * Tracks the content-box size of `ref.current` (`clientWidth`/`Height` minus padding).
 *
 * Re-measures synchronously when `invalidationKey` changes, before paint;
 * e.g. a rotation flip changes the viewport's aspect ratio.
 */
export function usePdfViewerViewportSize(
	ref: RefObject<HTMLElement | null>,
	invalidationKey: unknown,
): ViewportSize | null {
	const [size, setSize] = useState<ViewportSize | null>(null)

	const lastInvalidationKeyRef = useRef(invalidationKey)

	// `measure` is the same operation whether triggered by ResizeObserver or by
	// an invalidation-key change.
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

	// Caller-driven invalidation: re-measure after commit, before paint.
	// `measure` reads layout via getComputedStyle / clientWidth; this runs
	// in useLayoutEffect. The lastInvalidationKey ref skips the redundant
	// remeasure on mount.
	useLayoutEffect(() => {
		if (lastInvalidationKeyRef.current === invalidationKey) return

		lastInvalidationKeyRef.current = invalidationKey

		measure()
	}, [invalidationKey, measure])

	return size
}
