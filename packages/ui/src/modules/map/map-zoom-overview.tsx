'use client'

import { type PointerEvent, useRef } from 'react'
import { cn } from '../../core/cn'
import { useDragCursorHold } from '../../hooks/use-drag-cursor'
import { k } from '../../recipes/kata/map'
import { holdTextSelection } from '../../utilities/hold-text-selection'
import { isPrimaryPress } from '../../utilities/primary-press'
import { useMapZoomView } from './context'
import { MAP_ZOOM_FIT } from './engine/map-constants'
import { clientToFrame, type MapClientBox } from './engine/map-projection/frame'
import {
	type MapTransform,
	type MapViewFrame,
	transformAttribute,
} from './engine/map-zoom/transform'
import type { MapZoom } from './use-map-zoom'

/** Props for {@link MapZoomOverview}: the geography to draw, and the corner to sit in. @internal */
type MapZoomOverviewProps = {
	/** The canonical region paths of the plat, as the region layer takes them. */
	paths: readonly (string | null)[]
	/** The transform that carries the canonical paths onto the drawn frame, or `null` where they sit in it. */
	frame: MapTransform | null
	/** The drawn frame, which the inset shows whole. */
	view: MapViewFrame
	/** The bottom corner the inset sits in: the side of the zoom buttons. */
	side: 'left' | 'right'
}

/**
 * The overview inset of a zoomed map: a thumbnail of the whole geography, with
 * a frame on the part that the view shows. A press on the thumbnail centers
 * the view on the ground under it, and a drag keeps the view under the
 * pointer. It is a single-pointer path to all of the ground of a zoomed map,
 * which WCAG 2.2 SC 2.5.7 requires beside the drag, and it tells the reader
 * where the view is.
 *
 * It shows only while the view is zoomed in. At the fit the whole map is in
 * view, so there is nothing to show and nowhere to go.
 *
 * @remarks The inset is for the pointer alone, so it is `aria-hidden` and takes
 * no focus. The keyboard already pans with the arrow keys, and each step speaks
 * where it lands. It sits in the `role="img"` plot, in a bottom corner: the
 * legend and the zoom buttons are outside the plot, so it covers neither.
 *
 * @internal
 */
export function MapZoomOverview(props: MapZoomOverviewProps) {
	const zoom = useMapZoomView()

	if (zoom === null || zoom.transform.k <= MAP_ZOOM_FIT) return null

	return <MapZoomOverviewInset {...props} zoom={zoom} />
}

/**
 * The inset itself, mounted only while the view is zoomed in. The plat mounts
 * no thumbnail at the fit, so the server and the first paint carry none.
 *
 * @internal
 */
function MapZoomOverviewInset({
	paths,
	frame,
	view,
	side,
	zoom,
}: MapZoomOverviewProps & { zoom: MapZoom }) {
	const svgRef = useRef<SVGSVGElement>(null)

	// The box of the thumbnail, read once when a press lands. The press moves
	// the view and not the inset, so the box holds for the whole drag, and a
	// move does not force a layout after the transform it just wrote.
	const box = useRef<MapClientBox | null>(null)

	// A press drags the view, so it holds the closed hand on the page, as a pan
	// on the plot does.
	const cursorHold = useDragCursorHold()

	const { transform } = zoom

	// The part of the fitted frame that the view shows.
	const shown = {
		x: -transform.x / transform.k,
		y: -transform.y / transform.k,
		width: view.width / transform.k,
		height: view.height / transform.k,
	}

	function aim(event: PointerEvent<HTMLElement>) {
		const at =
			box.current &&
			clientToFrame({ x: event.clientX, y: event.clientY }, box.current, view.width, view.height)

		if (at) zoom.cursor.center(at)
	}

	// Each handler stops the event at the inset. The plot under it is the pan
	// surface and the touch tap, and neither must see a press that aims the view.
	function onPointerDown(event: PointerEvent<HTMLElement>) {
		event.stopPropagation()

		if (!isPrimaryPress(event) || svgRef.current === null) return

		holdTextSelection(event)

		event.currentTarget.setPointerCapture(event.pointerId)

		box.current = svgRef.current.getBoundingClientRect()

		cursorHold.start()

		aim(event)
	}

	function onPointerMove(event: PointerEvent<HTMLElement>) {
		event.stopPropagation()

		if (box.current !== null && event.currentTarget.hasPointerCapture(event.pointerId)) aim(event)
	}

	function onPointerEnd(event: PointerEvent<HTMLElement>) {
		event.stopPropagation()

		box.current = null

		cursorHold.end()
	}

	return (
		<div
			data-slot="map-zoom-overview"
			aria-hidden="true"
			className={cn(k.overview.base, k.overview[side])}
			style={{ aspectRatio: `${view.width} / ${view.height}` }}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerEnd}
			onPointerCancel={onPointerEnd}
			onLostPointerCapture={onPointerEnd}
			onClick={(event) => event.stopPropagation()}
		>
			<svg
				ref={svgRef}
				aria-hidden="true"
				className="block size-full"
				viewBox={`0 0 ${view.width} ${view.height}`}
			>
				<path
					d={landPath(paths)}
					transform={frame === null ? undefined : transformAttribute(frame)}
					className={cn(k.overview.land)}
				/>

				{/* The frame less the view, under the even-odd rule: the ground outside
				    the view washes out, and the view stays at full strength. */}
				<path
					d={`M0 0H${view.width}V${view.height}H0Z M${shown.x} ${shown.y}h${shown.width}v${shown.height}h${-shown.width}Z`}
					fillRule="evenodd"
					className={cn(k.overview.scrim)}
				/>

				<rect
					x={shown.x}
					y={shown.y}
					width={shown.width}
					height={shown.height}
					strokeWidth={1.5}
					vectorEffect="non-scaling-stroke"
					className={cn(k.overview.view)}
				/>
			</svg>
		</div>
	)
}

/** The silhouettes already joined, by the path array of the plat: one string for each geography. */
const LAND = new WeakMap<readonly (string | null)[], string>()

/**
 * Every region path joined into one, so the thumbnail is one element however
 * many regions the map has. The array of the plat holds its identity across
 * renders, so each geography joins once.
 *
 * @internal
 */
function landPath(paths: readonly (string | null)[]): string {
	const held = LAND.get(paths)

	if (held !== undefined) return held

	const joined = paths.filter((d) => d !== null).join('')

	LAND.set(paths, joined)

	return joined
}
