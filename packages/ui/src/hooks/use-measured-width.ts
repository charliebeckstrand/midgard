'use client'

import { type RefObject, startTransition, useRef, useState } from 'react'
import { useResizeObserver } from './use-resize-observer'

/** What {@link useMeasuredWidth} resolves: the box to attach, and the width to lay out by. @internal */
export type MeasuredWidth = {
	/** Attach to the element whose width is read — the container, never the plot. */
	ref: RefObject<HTMLDivElement | null>
	/** The explicit width when one was given, else the observed one; `0` until the first measure. */
	width: number
}

/**
 * The container width a colour-scaled plot places its range bar by, shared by
 * the map's plat and the heatmap.
 *
 * Measured off the container rather than off the plot, which is the whole
 * reason it exists: a bar placed beside the plot shrinks the plot, so keying
 * the placement to the plot's own width feeds the move back on itself and
 * oscillates. `usePlotFrame` measures the plot box and deliberately answers a
 * different question, so neither caller can reach this through it.
 *
 * An explicit `width` wins outright and never observes, so a fixed-width chart
 * reads deterministically under SSR and in tests.
 *
 * @remarks The write lands as a transition — the priority the plot's own refit
 * rides — so a resize burst coalesces rather than an urgent write preempting
 * the refit and stranding it at an intermediate frame, which would fatten the
 * strokes it was about to sharpen.
 *
 * @internal
 */
export function useMeasuredWidth(width: number | undefined): MeasuredWidth {
	const ref = useRef<HTMLDivElement>(null)

	const [measured, setMeasured] = useState(0)

	// Passed as a fresh closure deliberately: `useResizeObserver` raises the
	// callback through an effect event and subscribes on `ref` alone, so
	// memoising it would buy nothing — and it reads the live `width` for the
	// same reason.
	useResizeObserver(ref, () => {
		// An explicit width answers outright, so a fixed-width plot commits no
		// state for a measurement `width ?? measured` would only discard.
		if (width !== undefined) return

		const el = ref.current

		if (!el) return

		const next = Math.round(el.clientWidth)

		startTransition(() => setMeasured(next))
	})

	return { ref, width: width ?? measured }
}
