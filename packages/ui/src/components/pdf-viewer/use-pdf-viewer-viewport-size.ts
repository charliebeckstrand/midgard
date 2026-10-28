'use client'

import { type RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { measureContentBox, observeResizeBeforePaint } from '../../utilities'

type ViewportSize = { width: number; height: number }

/** Whether two readings lay the page out alike. */
const sameSize = (a: ViewportSize, b: ViewportSize) => a.width === b.width && a.height === b.height

/**
 * Tracks the content-box size of `ref.current` (`clientWidth`/`Height` minus padding).
 *
 * @returns The current `{ width, height }`, or `null` before the first measure.
 * @remarks Each reading commits before the paint: a resize through
 * `observeResizeBeforePaint`, and a change of `invalidationKey` (for example a
 * rotation flip, which changes the aspect ratio of the viewport) in a layout
 * effect.
 * @internal
 */
export function usePdfViewerViewportSize(
	ref: RefObject<HTMLElement | null>,
	invalidationKey: unknown,
): ViewportSize | null {
	const [size, setSize] = useState<ViewportSize | null>(null)

	const prevInvalidationKeyRef = useRef(invalidationKey)

	// The size that the viewer shows, so the observer compares a reading with it.
	const shown = useRef<ViewportSize | null>(null)

	// Keeps the prior object when the content box is unchanged: a ResizeObserver
	// callback on an unrelated reflow would otherwise re-render the viewer and
	// recompute scale and the shared context off an identical measurement.
	const commit = useCallback((next: ViewportSize) => {
		if (shown.current && sameSize(shown.current, next)) return

		shown.current = next

		setSize(next)
	}, [])

	const measure = useCallback(() => {
		const el = ref.current

		if (el) commit(measureContentBox(el))
	}, [ref, commit])

	// The fitted page takes its size from this reading. Thus a resize commits before the
	// paint, and the frame that narrows the viewport shows the page at the new width. A
	// rail that slides open beside the viewport resizes it on each frame of the slide.
	useLayoutEffect(() => {
		const el = ref.current

		if (!el) return

		measure()

		return observeResizeBeforePaint(el, () => {
			const next = measureContentBox(el)

			return shown.current && sameSize(shown.current, next) ? undefined : () => commit(next)
		})
	}, [ref, measure, commit])

	// Caller-driven invalidation: re-measure after commit, before paint, since
	// `measure` reads layout via getComputedStyle / clientWidth. The
	// prevInvalidationKey ref skips the redundant remeasure on mount.
	useLayoutEffect(() => {
		if (prevInvalidationKeyRef.current === invalidationKey) return

		prevInvalidationKeyRef.current = invalidationKey

		measure()
	}, [invalidationKey, measure])

	return size
}
