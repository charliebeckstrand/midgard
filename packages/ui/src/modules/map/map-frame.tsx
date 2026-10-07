'use client'

import type { MouseEvent, ReactNode, Ref, RefObject } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { k as chart } from '../../recipes/kata/chart'
import { k } from '../../recipes/kata/map'
import type { AccessibleName } from '../../types'
import { noop } from '../../utilities'
import { legendAside } from '../chart/engine/chart-legend/schema'
import { ChartPlotBox } from '../chart/engine/chart-plot-box'
import { useMapZoomView } from './context'
import type { MapLegendPlacement } from './engine/types'
import { MapHoverProvider } from './map-hover-provider'
import { MapZoomProvider } from './map-zoom-provider'
import { type MapKeyboardOptions, useMapKeyboard } from './use-map-keyboard'
import type { MapFrameShape } from './use-map-shape'
import { useMapTouchTap } from './use-map-touch-tap'
import type { MapZoomOptions } from './use-map-zoom'

/** Props for {@link MapFrame}: the assembled parts laid out around the plot. @internal */
type MapFrameProps = {
	legendNode: ReactNode
	legendPlacement: MapLegendPlacement
	plotRegion: ReactNode
	/** The plot region element; the hover provider re-resolves settled scroll pointers within it. */
	plotRef: RefObject<HTMLDivElement | null>
	/** The frame's outer box; its measured width drives the range bar's tier-aware placement. */
	containerRef: Ref<HTMLDivElement>
	/** What the view transform needs; the provider mounts around the plot alone. */
	zoom: MapZoomOptions
	/** Whether the tooltip is on; gates the hover provider's scroll listener. */
	tooltip: boolean
	/** Whether a region's category is matched and shown; the hover provider's pointed-emphasis gate. */
	regionActive: (index: number) => boolean
	/** The legend id under emphasis; the hover provider hands it to the marks. */
	emphasis: string | null
	/** Warms the region the pointer settles on; the hover provider holds the dwell. */
	preloadRegion: ((index: number) => void) | undefined
	table: ReactNode
	width: number | undefined
	/** Free-form (`aspectRatio={false}`) sizing: the frame fills its container's height. */
	fill: boolean
	className?: string
}

/** The frame shell: legend and table as plain HTML around the plot, under the hover provider. @internal */
export function MapFrame({
	legendNode,
	legendPlacement,
	plotRegion,
	plotRef,
	containerRef,
	zoom,
	tooltip,
	regionActive,
	emphasis,
	preloadRegion,
	table,
	width,
	fill,
	className,
}: MapFrameProps) {
	const aside = legendAside(legendPlacement)

	// The plot alone sits under the view transform's provider. The legend answers
	// the toggles and the emphasis, never the view, so keeping it outside is what
	// stops a wheel notch from re-planning it.
	const plot = <MapZoomProvider {...zoom}>{plotRegion}</MapZoomProvider>

	return (
		<div
			ref={containerRef}
			data-slot="map"
			// A query container, so a side legend lays out against the map's own width
			// and not the viewport's: a map in a narrow column stacks its legend on a
			// wide screen too. The floor (`min-w-48`, the rail's own width) stops a
			// squeezed container from shrinking the map to a speck.
			// A free-form fill frame grabs its container's height (`h-full`) so the
			// plot region has a real height to grow into; every other mode reserves
			// height from the plot's own width and needs none.
			className={cn(
				'@container flex min-w-48 flex-col',
				k.frame,
				width === undefined && 'w-full',
				fill && 'h-full',
				className,
			)}
			style={width === undefined ? undefined : { width }}
		>
			<MapHoverProvider
				enabled={tooltip}
				plotRef={plotRef}
				regionActive={regionActive}
				emphasis={emphasis}
				preloadRegion={preloadRegion}
			>
				{aside ? (
					// The panel and plot sit side by side once the map's own box reaches
					// `@lg` (32rem). That leaves the plot at least 19rem beside the 12rem
					// rail. Below it they stack with the panel always under the map, so a
					// left panel reverses the row instead of moving in the DOM. The stack
					// stretches its children, because the plot reserves its height from
					// its own width and a centered plot has no width to reserve from.
					<div
						className={cn(
							'flex flex-col @lg:items-center',
							k.frame,
							legendPlacement === 'left' ? '@lg:flex-row-reverse' : '@lg:flex-row',
						)}
					>
						{plot}

						{legendNode}
					</div>
				) : (
					<>
						{legendPlacement === 'top' && legendNode}

						{plot}

						{legendPlacement === 'bottom' && legendNode}
					</>
				)}
			</MapHoverProvider>

			{table}
		</div>
	)
}

/**
 * The focus ring a navigable plot region carries, with the rounded corner the
 * outline follows. Joined once — it takes no dynamic input, and the region it
 * dresses re-renders for every notch of a zoom gesture.
 *
 * @internal
 */
const PLOT_FOCUS = cn('rounded-sm', ...k.focus)

/** Props for {@link MapPlotRegion}: the measured box holding the SVG and the tooltip. @internal */
type MapPlotRegionProps = AccessibleName & {
	shape: MapFrameShape
	aside: boolean
	tooltip: ReactNode
	/** What the keyboard cursor needs; the plat resolves it, this element hosts it. */
	keyboard: Omit<MapKeyboardOptions, 'zoom'>
	children: ReactNode
}

/**
 * The `role="img"` plot box: the aspect-reserved SVG with the tooltip beside it.
 * It owns the keyboard tab stop, because the cursor writes to the hover context
 * this element renders inside. {@link MapPlat} sits above the provider and
 * could not reach it.
 *
 * @internal
 */
export function MapPlotRegion({
	shape: { ref: shapeRef, ...shape },
	aside,
	tooltip,
	keyboard: options,
	children,
	...name
}: MapPlotRegionProps) {
	// Read here rather than passed down: this element is inside the provider and
	// the plat is above it, which is the whole point of holding the view state
	// below the plat.
	const zoom = useMapZoomView()

	const keyboard = useMapKeyboard({ ...options, zoom: zoom?.cursor ?? null })

	// A touch reads nothing and one tap picks nothing. A double tap picks the mark
	// under it, through the keyboard's own pick. See `useMapTouchTap`.
	const touch = useMapTouchTap(options.activate)

	const surface = zoom?.surface

	// The tap runs first and the zoom surface after it, on the same events. A
	// touch click never reaches a region or a mark: the double tap already picked.
	const press = {
		onPointerDown: composeEventHandlers(touch.onPointerDown, surface?.onPointerDown ?? noop),
		onPointerMove: composeEventHandlers(touch.onPointerMove, surface?.onPointerMove ?? noop),
		onPointerUp: composeEventHandlers(touch.onPointerUp, surface?.onPointerUp ?? noop),
		onPointerCancel: composeEventHandlers(touch.onPointerCancel, surface?.onPointerCancel ?? noop),
		onTouchEnd: touch.onTouchEnd,
		onClickCapture: composeEventHandlers<MouseEvent<HTMLElement>>((event) => {
			if (touch.fromTouch()) event.stopPropagation()
		}, surface?.onClickCapture ?? noop),
	}

	return (
		<div
			ref={shapeRef}
			data-slot="map-plot"
			// A touch hold here does not open a context menu.
			data-touch-readout=""
			role="img"
			{...name}
			{...keyboard}
			{...surface}
			{...press}
			// A side legend takes the width remainder (`min-w-0 flex-1`); a free-form
			// `fill` map instead grows into the height its region already holds — a
			// `flex-1 min-h-0` child of the `h-full` frame — so the box measures a real
			// height rather than the zero its own reserve would feed back.
			className={cn(
				'relative',
				// Without these, a long press starts a text selection that spreads across
				// the whole map and the text around it, and iOS shows its callout menu.
				// The double tap to pick does not use selection, so nothing is lost.
				chart.touch.readout,
				// The focus ring only rides a region that can take focus; a rounded
				// corner comes with it, so the outline follows the box it rings.
				// Joined at module scope: nested inline, the whole call is unkeyable
				// and `cn` re-merges it on every wheel notch and tracked pointer move.
				keyboard && PLOT_FOCUS,
				// A zooming plot claims its own touch gestures: one finger pans and two
				// pinch, so neither reaches the page's scroller. A modifier map makes
				// the same bargain touch that it makes the wheel — one finger scrolls
				// the page, two pan and pinch — so it keeps the browser's scrolling and
				// takes only its pinch, which would otherwise zoom the page over the
				// map. Every other map leaves touch alone entirely.
				zoom && (zoom.modifier === null ? 'touch-none' : 'touch-pan-x touch-pan-y'),
				aside && 'min-w-0',
				(aside || shape.fill) && 'flex-1',
				shape.fill && 'min-h-0',
			)}
		>
			{/* PlotBox reserves the box height from its own width, steady before the
			    width is measured and across animation replays. It takes a fixed height
			    instead, or (under `fill`) fills the height its region already holds. */}
			<ChartPlotBox reserve={shape.reserve} height={shape.boxHeight} fill={shape.fill}>
				{children}
			</ChartPlotBox>

			{tooltip}
		</div>
	)
}
