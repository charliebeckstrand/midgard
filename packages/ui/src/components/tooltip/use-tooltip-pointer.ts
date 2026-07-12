'use client'

import { type Placement, useClientPoint, useInteractions } from '@floating-ui/react'
import { useMemo } from 'react'
import { useFloatingPanel } from '../../hooks'
import type { TooltipContextValue } from './context'

/** Options for {@link useTooltipPointer}. @internal */
export type TooltipPointerOptions = {
	/** Whether the readout shows; the caller derives it from its own hover state. */
	open: boolean
	/** Client coordinates to anchor at, or `null` while nothing is pointed. */
	point: { x: number; y: number } | null
	/**
	 * Preferred side of the anchor point; flips and shifts to stay in the viewport.
	 * @defaultValue 'top'
	 */
	placement?: Placement
	/**
	 * Gap (px) the panel keeps from the anchor point.
	 * @defaultValue 12
	 */
	offset?: number
	/**
	 * Constrain pointer tracking to one axis (floating-ui `useClientPoint`) — e.g.
	 * `'x'` for a horizontal sweep whose vertical anchor is pinned to a snapped value.
	 * @defaultValue 'both'
	 */
	axis?: 'x' | 'y' | 'both'
	/**
	 * Reposition strategy while open, forwarded to {@link useFloatingPanel}.
	 * `'auto'` keeps `autoUpdate` — the parity default a pinned readout needs to
	 * re-anchor across a scroll that fires no pointer event. `'point'` drops it
	 * for a purely pointer-tracked surface that repositions on every move; a perf
	 * lever to flip per-surface only once a benchmark proves it.
	 * @defaultValue 'auto'
	 */
	track?: 'auto' | 'point'
}

/**
 * Floating and pointer-anchoring state for a point-following tooltip, returned
 * as the {@link TooltipContextValue} a `<TooltipContent>` reads. The chart, map,
 * and heatmap readouts share this: each supplies a client `point` and an `open`
 * flag off its own hover pipeline, and the tooltip rides the pointer through
 * `useClientPoint` while wearing the standard Tooltip chrome.
 *
 * @remarks Rides {@link useFloatingPanel}'s base (memoized offset/flip/shift
 * chain). Composes only `useClientPoint` — no role, dismiss, or overlay-signal —
 * so nothing stamps `role="tooltip"`/`aria-describedby`; the readout is a pointer
 * enhancement the consumer marks `aria-hidden`. `track` defaults to `'auto'`
 * (parity with `autoUpdate`); the point-driven `'point'` lever is opt-in.
 * @internal
 * @see {@link useFloatingPanel}
 */
export function useTooltipPointer({
	open,
	point,
	placement = 'top',
	offset = 12,
	axis = 'both',
	track = 'auto',
}: TooltipPointerOptions): TooltipContextValue {
	const { refs, floatingStyles, context } = useFloatingPanel({
		placement,
		open,
		offset,
		track,
	})

	const clientPoint = useClientPoint(context, { x: point?.x ?? null, y: point?.y ?? null, axis })

	const { getReferenceProps, getFloatingProps } = useInteractions([clientPoint])

	return useMemo(
		() => ({
			open,
			interactive: false,
			enabled: true,
			setReference: refs.setReference,
			setFloating: refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
		}),
		[
			open,
			refs.setReference,
			refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
		],
	)
}
