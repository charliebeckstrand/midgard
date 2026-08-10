'use client'

import type { ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import type { AccessibleName } from '../../types'
import { legendAside } from '../chart/engine/chart-legend/schema'
import { ChartPlotBox } from '../chart/engine/chart-plot-box'
import { useMapZoomView } from './context'
import type { MapLegendPlacement } from './engine/types'
import { MapHoverProvider } from './map-hover-provider'
import { MapZoomProvider } from './map-zoom-provider'
import { type MapKeyboardOptions, useMapKeyboard } from './use-map-keyboard'
import type { MapFrameShape } from './use-map-shape'
import type { MapZoomOptions } from './use-map-zoom'

/** Props for {@link MapFrame}: the assembled parts laid out around the plot. @internal */
type MapFrameProps = {
	legendNode: ReactNode
	legendPlacement: MapLegendPlacement
	plotRegion: ReactNode
	/** The plot region element; the hover provider re-resolves settled scroll pointers within it. */
	plotRef: RefObject<HTMLDivElement | null>
	/** The frame's outer box; its measured width drives the range bar's tier-aware placement. */
	containerRef: RefObject<HTMLDivElement | null>
	/** What the view transform needs; the provider mounts around the plot alone. */
	zoom: MapZoomOptions
	/** Whether the tooltip is on; gates the hover provider's scroll listener. */
	tooltip: boolean
	/** Whether a region's category is matched and shown; the hover provider's pointed-emphasis gate. */
	regionActive: (index: number) => boolean
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
			// A free-form fill frame grabs its container's height (`h-full`) so the
			// plot region has a real height to grow into; every other mode reserves
			// height from the plot's own width and needs none.
			className={cn(
				'flex flex-col gap-4',
				width === undefined && 'w-full',
				fill && 'h-full',
				className,
			)}
			style={width === undefined ? undefined : { width }}
		>
			<MapHoverProvider enabled={tooltip} plotRef={plotRef} regionActive={regionActive}>
				{aside ? (
					// The panel and plot sit side by side from lg; below it they stack
					// with the panel always under the map, so a left panel reverses
					// the row instead of moving in the DOM.
					<div
						className={cn(
							'flex flex-col gap-4 items-center',
							legendPlacement === 'left' ? 'flex-row-reverse' : 'flex-row',
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
 * this element renders inside — {@link MapPlat} sits above the provider and
 * could not reach it.
 *
 * @internal
 */
export function MapPlotRegion({
	shape,
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

	return (
		<div
			ref={shape.ref}
			data-slot="map-plot"
			role="img"
			{...name}
			{...keyboard}
			{...(zoom?.surface ?? {})}
			// A side legend takes the width remainder (`min-w-0 flex-1`); a free-form
			// `fill` map instead grows into the height its region already holds — a
			// `flex-1 min-h-0` child of the `h-full` frame — so the box measures a real
			// height rather than the zero its own reserve would feed back.
			className={cn(
				'relative',
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
				zoom && (zoom.modifier === null ? 'touch-none' : '[touch-action:pan-x_pan-y]'),
				aside && 'min-w-0',
				(aside || shape.fill) && 'flex-1',
				shape.fill && 'min-h-0',
			)}
		>
			{/* PlotBox reserves the box height from its own width — steady before the
			    width is measured and across animation replays — takes a fixed height, or
			    (under `fill`) fills the height its region already holds. */}
			<ChartPlotBox reserve={shape.reserve} height={shape.boxHeight} fill={shape.fill}>
				{children}
			</ChartPlotBox>

			{tooltip}
		</div>
	)
}
