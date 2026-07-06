'use client'

import { type RefObject, useEffect, useRef } from 'react'
import { useTruncation } from '../../hooks/use-truncation'

/**
 * Grid truncation tracking: {@link useTruncation}'s eager overflow measure plus a
 * resize-settle backstop, so a column resize that moves a cell's width through
 * the `<colgroup>` alone re-reads overflow even when the memoized body cell does
 * not re-render on its own.
 *
 * Shared by the data-cell ({@link GridCellContent}) and column-header
 * (`GridHeaderTitle`) truncation surfaces.
 *
 * @param resizeSettleKey - A per-column width snapshot whose change re-measures
 * truncation: the data cell passes the engine width frozen to `undefined` while
 * a drag is in flight, then the settled width once the drag ends or a keyboard
 * nudge lands. A column resize moves the cell's width through the `<colgroup>`
 * alone, and the body cell is memoized, so the commit measure does not re-run on
 * its own; the key's change re-renders the cell (re-running the commit measure)
 * and this hook backs that up with a deferred frame in case the layout settled
 * after the synchronous read. The header omits it — it already re-renders on its
 * own `width` prop.
 * @returns `[ref, truncated]`: attach `ref` to the single-line element; read
 * `truncated` to gate the reveal tooltip.
 * @internal
 */
export function useGridTruncation<E extends HTMLElement>(
	resizeSettleKey?: unknown,
): [RefObject<E | null>, boolean] {
	const [ref, truncated, measure] = useTruncation<E>()

	// Deferred backstop for the settle re-measure: the `resizeSettleKey` change
	// already re-renders the cell (re-running the commit measure in `useTruncation`),
	// but a width that lands a frame late would read stale; re-measure once more on
	// the next frame. No-op where `requestAnimationFrame` is absent (SSR / jsdom),
	// matching the observer's own fallback; the same-value bail keeps it from
	// looping.
	const mounted = useRef(false)

	useEffect(() => {
		// Read here so a `resizeSettleKey` change re-runs this effect (it gates the
		// deferred pass; the frame callback itself doesn't reference it).
		void resizeSettleKey

		// Skip the mount run — the layout effect has just measured, and a fresh rAF
		// per cell on mount is needless work in a wide / virtualized grid.
		if (!mounted.current) {
			mounted.current = true

			return
		}

		if (typeof requestAnimationFrame !== 'function') return

		const frame = requestAnimationFrame(measure)

		return () => cancelAnimationFrame(frame)
	}, [measure, resizeSettleKey])

	return [ref, truncated]
}
