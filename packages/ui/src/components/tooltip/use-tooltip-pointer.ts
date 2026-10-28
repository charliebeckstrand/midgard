'use client'

import { type Placement, useClientPoint, useInteractions } from '@floating-ui/react'
import { type RefObject, useLayoutEffect, useMemo } from 'react'
import { useFloatingPanel } from '../../hooks'
import type { TooltipContextValue } from './context'

/** Options for {@link useTooltipPointer}. @internal */
export type TooltipPointerOptions = {
	/** Whether the readout shows; the caller derives it from its own hover state. */
	open: boolean
	/**
	 * Coordinates to anchor at, or `null` while nothing is pointed. Without
	 * {@link originRef}, they are client coordinates. With it, they are in the
	 * padding box of the origin, in its CSS pixels before an ancestor scale or
	 * zoom. The padding box starts inside the border, as `offsetX` does.
	 */
	point: { x: number; y: number } | null
	/**
	 * An element that `point` is relative to. The client point is then read off the
	 * element's box when the panel positions, not during render. A caller that
	 * holds its point in its own frame therefore needs no layout read of its own.
	 * The point scales with the element, so it holds under an ancestor scale or
	 * zoom. Omitted, `point` is in client coordinates. `axis` does not apply with it.
	 */
	originRef?: RefObject<Element | null>
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
	 * Constrain pointer tracking to one axis (floating-ui `useClientPoint`). For
	 * example, `'x'` suits a horizontal sweep whose vertical anchor is pinned to
	 * a snapped value.
	 * @defaultValue 'both'
	 */
	axis?: 'x' | 'y' | 'both'
	/**
	 * Reposition strategy while open, forwarded to {@link useFloatingPanel}.
	 * `'auto'` keeps `autoUpdate`, the parity default. `'point'` drops it, and
	 * the panel keeps its document position until `point` changes. The anchor is
	 * a fixed client point, so `autoUpdate` cannot follow content that scrolls
	 * under it. A readout pinned in place therefore takes `'point'` too, and
	 * scrolls with its content.
	 * @defaultValue 'auto'
	 */
	track?: 'auto' | 'point'
}

/**
 * The layout box of `origin`, in its own CSS pixels. It gives the size of the
 * box that `getBoundingClientRect` draws, and the offset of its padding box. An
 * HTML element measures its border box, which holds the border and a
 * scrollbar. A non-root SVG element has no CSS box, so it measures its bounding
 * box in user units. Another element measures its client box.
 *
 * @internal
 */
function measureBox(origin: Element) {
	if (origin instanceof HTMLElement) {
		return {
			width: origin.offsetWidth,
			height: origin.offsetHeight,
			left: origin.clientLeft,
			top: origin.clientTop,
		}
	}

	if (origin.clientWidth === 0 && origin instanceof SVGGraphicsElement && 'getBBox' in origin) {
		const { width, height } = origin.getBBox()

		return { width, height, left: 0, top: 0 }
	}

	return {
		width: origin.clientWidth,
		height: origin.clientHeight,
		left: origin.clientLeft,
		top: origin.clientTop,
	}
}

/**
 * The client point of a point in the padding box of `origin`. An ancestor scale
 * or zoom draws the origin at a size apart from its layout size, so the point
 * scales by the ratio of the two. An origin with no layout size (jsdom) maps by
 * the offset alone.
 *
 * @internal
 */
function toClientPoint(origin: Element | null, x: number, y: number) {
	if (!origin) return { left: x, top: y }

	const box = origin.getBoundingClientRect()

	const layout = measureBox(origin)

	const scaleX = layout.width > 0 ? box.width / layout.width : 1

	const scaleY = layout.height > 0 ? box.height / layout.height : 1

	return {
		left: box.left + (layout.left + x) * scaleX,
		top: box.top + (layout.top + y) * scaleY,
	}
}

/**
 * Floating and pointer-anchoring state for a point-following tooltip, returned
 * as the {@link TooltipContextValue} a `<TooltipContent>` reads. The chart, map,
 * and heatmap readouts share this. Each supplies a client `point` and an `open`
 * flag off its own hover pipeline. The tooltip then rides the pointer through
 * `useClientPoint`, while wearing the standard Tooltip chrome.
 *
 * @remarks Rides {@link useFloatingPanel}'s base (memoized offset/flip/shift
 * chain). Composes only `useClientPoint` (no role, dismiss, or overlay-signal),
 * so nothing stamps `role="tooltip"`/`aria-describedby`; the readout is a pointer
 * enhancement the consumer marks `aria-hidden`. `track` defaults to `'auto'`
 * (parity with `autoUpdate`); every current caller opts into `'point'`.
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
	originRef,
}: TooltipPointerOptions): TooltipContextValue {
	const { refs, floatingStyles, context } = useFloatingPanel({
		placement,
		open,
		offset,
		track,
	})

	const x = point?.x ?? null

	const y = point?.y ?? null

	const clientPoint = useClientPoint(context, { enabled: originRef === undefined, x, y, axis })

	const { setPositionReference } = refs

	// The relative form of `useClientPoint`'s own anchor: a virtual element that
	// floating-ui measures when it positions the panel. The origin's box is read
	// there, so a scrolled or resized origin still anchors where it is now.
	useLayoutEffect(() => {
		if (originRef === undefined || x === null || y === null) return

		setPositionReference({
			// The plot that holds the point. An overlay over the plot then covers
			// the readout too (`useFloatingPanel`).
			contextElement: originRef.current ?? undefined,
			getBoundingClientRect() {
				const { left, top } = toClientPoint(originRef.current, x, y)

				return { x: left, y: top, width: 0, height: 0, top, left, right: left, bottom: top }
			},
		})
	}, [originRef, x, y, setPositionReference])

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
