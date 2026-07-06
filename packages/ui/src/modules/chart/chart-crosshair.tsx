'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import { clamp } from '../../utilities'
import type { PlotRect } from './chart-layout'
import {
	bandCoord,
	bandExtent,
	type ChartOrientation,
	project,
	valueCoord,
	valueExtent,
} from './chart-orientation'
import type { Crosshair, ResolvedCrosshair } from './chart-schema'
import { nearestValue } from './chart-snap'
import { useChartHover } from './context'

/** Props for {@link ChartCrosshair}. @internal */
export type ChartCrosshairProps = {
	plot: PlotRect
	/** The resolved rules to draw and whether they snap. */
	crosshair: ResolvedCrosshair
	/** Band-axis center per category — the band rule's snap target. */
	bandPositions: number[]
	/** Per category, the visible series' value-axis positions — the value rule's snap targets. */
	valuePoints: number[][]
	/**
	 * Which way the value axis runs — it swaps each rule's screen direction.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
}

/**
 * Resolve the `crosshair` prop to the concrete rules a chart draws. `true` and
 * an object both start from both rules on; `x` and `y` subtract from that base,
 * so an object drops a rule only where it sets one `false`. Returns `null` when
 * nothing would draw — the prop is absent or `false`, or both rules are off —
 * so a chart gates the overlay on one truthy check.
 *
 * @internal
 */
export function resolveCrosshair(
	crosshair: boolean | Crosshair | undefined,
): ResolvedCrosshair | null {
	if (!crosshair) return null

	const rules =
		crosshair === true
			? { x: true, y: true, snap: false }
			: { x: crosshair.x ?? true, y: crosshair.y ?? true, snap: crosshair.snap ?? false }

	return rules.x || rules.y ? rules : null
}

/**
 * Whether a resolved crosshair snaps to the nearest point — so the tooltip reads
 * off the marks too, and a click there pins the snapped band rather than
 * dismissing. `null` (no crosshair) never snaps.
 *
 * @internal
 */
export function crosshairSnaps(crosshair: ResolvedCrosshair | null): boolean {
	return crosshair?.snap ?? false
}

/**
 * The hover crosshair: an `x` rule across the value axis and a `y` rule down the
 * category axis, drawing whichever rules the resolved crosshair leaves on. Each
 * rule is projected through the orientation, so a horizontal chart transposes
 * both — the value rule runs vertically, the category rule horizontally.
 * Without `snap` a rule tracks the pointer exactly; with it the pair meets the
 * nearest data point — the value rule at that point's value, the category rule
 * at its band center. Both clamp to the plot rect and dash alike. Reads only the
 * hover context, so it re-renders alone — never the marks.
 *
 * @internal
 */
export function ChartCrosshair({
	plot,
	crosshair,
	bandPositions,
	valuePoints,
	orientation = 'vertical',
}: ChartCrosshairProps) {
	const { index, point } = useChartHover()

	if (index === null || point === null) return null

	const rule = {
		strokeWidth: 1,
		strokeDasharray: '4 4',
		shapeRendering: 'crispEdges' as const,
		className: cn(k.axis),
	}

	const rawValue = crosshair.snap
		? nearestValue(valuePoints[index], valueCoord(orientation, point))
		: valueCoord(orientation, point)

	const rawBand = crosshair.snap ? bandPositions[index] : bandCoord(orientation, point)

	const [valueNear, valueFar] = valueExtent(orientation, plot)

	const [bandStart, bandEnd] = bandExtent(orientation, plot)

	const value =
		rawValue === null
			? null
			: clamp(rawValue, Math.min(valueNear, valueFar), Math.max(valueNear, valueFar))

	const band =
		rawBand === undefined
			? null
			: clamp(rawBand, Math.min(bandStart, bandEnd), Math.max(bandStart, bandEnd))

	// The value rule holds its value and spans the band axis; the band rule holds
	// its band and spans the value axis. `project` puts each pair of ends on screen.
	const valueRule =
		value === null
			? null
			: { from: project(orientation, value, bandStart), to: project(orientation, value, bandEnd) }

	const bandRule =
		band === null
			? null
			: { from: project(orientation, valueNear, band), to: project(orientation, valueFar, band) }

	return (
		<g data-slot="chart-crosshair">
			{crosshair.x && valueRule && (
				<line
					data-slot="chart-crosshair-x"
					x1={valueRule.from.x}
					y1={valueRule.from.y}
					x2={valueRule.to.x}
					y2={valueRule.to.y}
					{...rule}
				/>
			)}

			{crosshair.y && bandRule && (
				<line
					data-slot="chart-crosshair-y"
					x1={bandRule.from.x}
					y1={bandRule.from.y}
					x2={bandRule.to.x}
					y2={bandRule.to.y}
					{...rule}
				/>
			)}
		</g>
	)
}
