/**
 * The cartesian orientation and the single coordinate transpose every oriented
 * chart part reads. A cartesian chart has one continuous **value** axis and one
 * categorical **band** axis; orientation is only which screen axis each maps to.
 * Vertical keeps the value axis on y (bars grow up) and the band on x;
 * horizontal transposes both (bars grow right, categories run down the side).
 *
 * Every oriented position — a bar corner, a gridline, a tick, a crosshair rule,
 * a tooltip anchor — is expressed in (value, band) space and projected through
 * {@link project}, so the transpose lives here and nothing else branches on the
 * orientation. Framework- and style-free, so the mapping is unit-testable in
 * isolation and reused by the pure geometry cores and the React parts alike.
 */

import type { PlotRect } from './chart-layout'

/**
 * Which screen axis a cartesian chart's value axis runs along: `'vertical'`
 * puts value on y and categories on x (the default), `'horizontal'` transposes
 * them.
 */
export type ChartOrientation = 'vertical' | 'horizontal'

/** A point in `viewBox` user units, structurally shared with the frame's anchors. @internal */
export type Vec = { x: number; y: number }

/**
 * Projects a value-axis position crossed with a band-axis position into a frame
 * point. `valuePos` is a {@link LinearScale.map} output, `bandPos` a
 * {@link BandScale} output; vertical reads value as y and band as x, horizontal
 * swaps them.
 *
 * @internal
 */
export function project(orientation: ChartOrientation, valuePos: number, bandPos: number): Vec {
	return orientation === 'vertical' ? { x: bandPos, y: valuePos } : { x: valuePos, y: bandPos }
}

/** The component of `point` along the value axis — y when vertical, x when horizontal. @internal */
export function valueCoord(orientation: ChartOrientation, point: Vec): number {
	return orientation === 'vertical' ? point.y : point.x
}

/** The component of `point` along the band axis — x when vertical, y when horizontal. @internal */
export function bandCoord(orientation: ChartOrientation, point: Vec): number {
	return orientation === 'vertical' ? point.x : point.y
}

/** The plot's `[near, far]` screen extent along the value axis — the range a value scale maps into. @internal */
export function valueExtent(orientation: ChartOrientation, plot: PlotRect): [number, number] {
	return orientation === 'vertical' ? [plot.y + plot.height, plot.y] : [plot.x, plot.x + plot.width]
}

/** The plot's `[start, end]` screen extent along the band axis — the range a band scale spans. @internal */
export function bandExtent(orientation: ChartOrientation, plot: PlotRect): [number, number] {
	return orientation === 'vertical' ? [plot.x, plot.x + plot.width] : [plot.y, plot.y + plot.height]
}
