'use client'

import {
	autoUpdate,
	flip,
	offset,
	shift,
	useClientPoint,
	useFloating,
	useInteractions,
} from '@floating-ui/react'
import { type RefObject, useMemo } from 'react'
import { Swatch, type SwatchProps } from '../../components/swatch'
import { TooltipContent } from '../../components/tooltip'
import { TooltipContext } from '../../components/tooltip/context'
import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import { bandCoord, type ChartOrientation, project, valueCoord } from './chart-orientation'
import { type ChartSnap, nearestValue } from './chart-snap'
import { useChartHover } from './context'
import type { ChartReadout, ChartReadoutSource } from './types'

/** Props for {@link ChartTooltip}. @internal */
export type ChartTooltipProps = {
	/**
	 * The plot region element. Its viewport rect maps the hover's frame
	 * coordinates to the client point floating-ui anchors to — the SVG fills the
	 * region one-to-one, so the rect origin plus a frame point is that point.
	 */
	plotRef: RefObject<HTMLDivElement | null>
	/**
	 * The values behind the marks as a cached thunk — materialized here only
	 * while a hover is live, so an idle chart never pays the cell formatting.
	 */
	readout: ChartReadoutSource
	/**
	 * Snap targets when the crosshair snaps. Present, the tooltip rides the
	 * snapped intersection wherever the pointer is in the plot; absent, it
	 * tracks the pointer and shows only over a mark.
	 */
	snap?: ChartSnap
	/**
	 * Which way the chart faces, so the snapped anchor projects onto the right axes.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
	/**
	 * The series indices, in the order the rows should read — the marks' own
	 * visible top-to-bottom order, so a stacked column reads its top segment first
	 * and overlapping lines read in their drawn value order. Omitted, the rows keep
	 * the readout's series order. The readout itself is untouched, so the
	 * visually-hidden table still reads in series order.
	 */
	order?: number[]
	/**
	 * The emphasised series' index, when one is — the keyboard cursor reading a
	 * dataset, or a legend entry. Its row stays at full strength while every other
	 * row dims, mirroring the marks; `null` (the default) reads every row equally.
	 */
	emphasis?: number | null
}

/** The readout's rows in the caller's display order, or as they are without one. @internal */
function readoutRows(readout: ChartReadout | null, order: number[] | undefined) {
	if (readout === null) return []

	if (!order) return readout.rows

	return order.flatMap((series) => {
		const row = readout.rows.find((candidate) => candidate.index === series)

		return row ? [row] : []
	})
}

/** The gap in px floating-ui keeps between the anchor point and the readout. @internal */
const TRACK_OFFSET = 12

/** Maps a mark shape to its {@link Swatch} shape. */
const SWATCH_SHAPE = { rect: 'square', line: 'line' } as const satisfies Record<
	'rect' | 'line',
	NonNullable<SwatchProps['shape']>
>

/**
 * The hover readout: one tooltip listing every series at the pointed category,
 * values leading their labels. The panel is the real Tooltip component's —
 * `TooltipContent` driven through `TooltipContext` with the chart's own
 * floating state, anchored to the point through `useClientPoint` — so the chart
 * readout wears exactly the Tooltip chrome, motion, and glass adoption, and
 * `flip` / `shift` keep it inside the frame at the edges.
 *
 * Snapped, it rides the nearest point — the band center crossed with the value
 * nearest the pointer, the line it sits closest to — and reads there wherever
 * the pointer is in the plot; `placement: 'top'` centers it over that point so
 * the snapped category is unmistakable. Off the snap it tracks the pointer and
 * shows only over a mark.
 *
 * With a series emphasised — the keyboard cursor reading one dataset — that
 * series' row stays lit while the rest dim to a quarter opacity, the same recede
 * the marks take, so the readout foregrounds the row the cursor is on.
 *
 * @remarks A pointer enhancement, `aria-hidden` by design: the same values ship
 * in the visually-hidden table, so nothing is gated behind hover.
 * @internal
 */
export function ChartTooltip({
	plotRef,
	readout: source,
	snap,
	orientation = 'vertical',
	order,
	emphasis = null,
}: ChartTooltipProps) {
	const { index, point, onData } = useChartHover()

	// Materialized only while a hover is live: the thunk caches, so the first
	// pointed frame pays the build once and every later move reads it back.
	const readout = index === null ? null : source()

	// The rows read in the marks' visible order when the chart supplies one — a
	// stacked column top-first, overlapping lines in value order — looked up by
	// series index off the readout, which itself stays in series order for the
	// hidden data table. No order given, the rows keep that series order.
	const rows = readoutRows(readout, order)

	// Snapped, the anchor is the intersection — the band center crossed with the
	// value nearest the pointer, projected onto the screen through the orientation;
	// otherwise it is the pointer itself.
	const anchor =
		index !== null && point !== null
			? snap
				? project(
						orientation,
						nearestValue(snap.valuePoints[index], valueCoord(orientation, point)) ??
							valueCoord(orientation, point),
						snap.bandPositions[index] ?? bandCoord(orientation, point),
					)
				: point
			: null

	// A snapping crosshair carries the tooltip to the nearest point, so it reads
	// anywhere in the plot; otherwise it waits for the pointer to sit on a mark.
	const open = anchor !== null && (snap != null || onData)

	// Frame coordinates map to the viewport by the plot region's own rect: the
	// SVG fills it one-to-one, so the origin plus the frame point is the client
	// point the floating readout anchors to.
	const rect = plotRef.current?.getBoundingClientRect()

	const clientX = anchor && rect ? rect.left + anchor.x : null

	const clientY = anchor && rect ? rect.top + anchor.y : null

	const { refs, floatingStyles, context } = useFloating({
		open,
		placement: 'top',
		middleware: [offset(TRACK_OFFSET), flip(), shift({ padding: 8 })],
		whileElementsMounted: autoUpdate,
	})

	const clientPoint = useClientPoint(context, { x: clientX, y: clientY })

	const { getReferenceProps, getFloatingProps } = useInteractions([clientPoint])

	const value = useMemo(
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

	return (
		<TooltipContext value={value}>
			<TooltipContent size="sm">
				{index !== null && readout !== null && (
					<div aria-hidden="true">
						<div className={cn(k.label, 'mb-1 whitespace-nowrap')}>{readout.categories[index]}</div>

						<div className="space-y-0.5">
							{rows.map((row) => (
								<div
									key={row.label}
									data-slot="chart-tooltip-row"
									className={cn(
										'flex items-center gap-1.5 whitespace-nowrap transition-opacity',
										// A cursor on one dataset dims the rest, the same recede the marks take.
										emphasis !== null && row.index !== emphasis && 'opacity-25',
									)}
								>
									<Swatch
										shape={SWATCH_SHAPE[row.swatch]}
										size="sm"
										color={row.swatchClasses?.[index] ?? row.swatchClass}
										style={row.swatchColor ? { color: row.swatchColor } : undefined}
									/>

									<span className={cn(k.value)}>{row.values[index]}</span>

									<span className={cn(k.label)}>{row.label}</span>
								</div>
							))}
						</div>
					</div>
				)}
			</TooltipContent>
		</TooltipContext>
	)
}
