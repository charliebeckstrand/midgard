'use client'

import { type RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'

type ViewportSize = { width: number; height: number }

/**
 * Tracks the content-box size of `ref.current` (`clientWidth`/`Height` minus padding).
 *
 * @returns The current `{ width, height }`, or `null` before the first measure.
 * @remarks Re-measures synchronously when `invalidationKey` changes, before
 * paint; e.g. a rotation flip changes the viewport's aspect ratio.
 * @internal
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

		const width = el.clientWidth - padX
		const height = el.clientHeight - padY

		// Keep the prior object when the content box is unchanged: a ResizeObserver
		// callback on an unrelated reflow would otherwise re-render the viewer and
		// recompute scale and the shared context off an identical measurement.
		setSize((prev) =>
			prev && prev.width === width && prev.height === height ? prev : { width, height },
		)
	}, [ref])

	useLayoutEffect(() => {
		const el = ref.current

		if (!el) return

		measure()

		const observer = new ResizeObserver(measure)

		observer.observe(el)

		return () => observer.disconnect()
	}, [ref, measure])

	// Caller-driven invalidation: re-measure after commit, before paint, since
	// `measure` reads layout via getComputedStyle / clientWidth. The
	// lastInvalidationKey ref skips the redundant remeasure on mount.
	useLayoutEffect(() => {
		if (lastInvalidationKeyRef.current === invalidationKey) return

		lastInvalidationKeyRef.current = invalidationKey

		measure()
	}, [invalidationKey, measure])

	return size
}
