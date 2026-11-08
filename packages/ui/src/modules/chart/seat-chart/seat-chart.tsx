'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../../core/cn'
import { useStableValue } from '../../../hooks/use-stable-value'
import { defineMessages } from '../../../primitives/intl/intl-messages'
import { useIntl } from '../../../primitives/intl/use-intl'
import { useLocale } from '../../../providers/locale/context'
import { type ChartColorSlot, k } from '../../../recipes/kata/chart'
import type { AccessibleName } from '../../../types/accessible-name'
import { percentFormat, readoutFormat } from '../../../utilities/format-number'
import { once } from '../../../utilities/once'
import { MARK_GAP, TICK_TARGET } from '../engine/chart-constants'
import { ChartFrame } from '../engine/chart-frame/frame'
import { chartAspectRatio, chartFrameSizing } from '../engine/chart-frame/sizing'
import {
	majorityAngle,
	majorityLine,
	nearestSeat,
	seatFit,
	seatGroups,
	seatHole,
	seatLayout,
	seatRows,
} from '../engine/chart-geometry/seat'
import { ChartHitArea } from '../engine/chart-hit-area'
import { ChartLegend } from '../engine/chart-legend/legend'
import { resolveLegend } from '../engine/chart-legend/schema'
import { readoutCell } from '../engine/chart-series'
import { headerLineCount } from '../engine/chart-tier'
import { resolveTooltip } from '../engine/chart-tooltip'
import { type ChartMarkRef, useChartFullscreen } from '../engine/context'
import type { ChartBaseProps, ChartReadout } from '../engine/types'
import { useChartFrameSizing } from '../engine/use-chart-frame-sizing'
import { sectorFrame, sectorLegendItems } from '../sector-chart/sector-chart-frame'
import { SeatChartHole } from './seat-chart-hole'
import { SeatChartMarks } from './seat-chart-marks'

/** One group of seats in a {@link SeatChart}, such as the seats of one party. */
export type SeatChartGroup = {
	/** The number of seats in the group. */
	seats: number
	/** The palette slot of the seats. */
	color: ChartColorSlot
	/** The name of the group, unique in its chart: the legend, the tooltip, and the data table read it. */
	label: string
	/**
	 * Draws the seats as rings, not discs, such as seats that are not called
	 * yet. The legend key of the group is a frame, not a fill.
	 *
	 * @defaultValue false
	 */
	hollow?: boolean
}

/**
 * Props for {@link SeatChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`): the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type SeatChartProps = AccessibleName &
	Omit<
		ChartBaseProps<never>,
		'data' | 'animate' | 'texture' | 'onHiddenChange' | 'aria-label' | 'aria-labelledby'
	> & {
		/**
		 * The groups of seats, in order from the start of the hemicycle. The chamber
		 * holds the sum of their seats.
		 */
		groups: SeatChartGroup[]
		/**
		 * The seats for a majority. A tick above the outer arc marks the
		 * angle between the last seat of the majority and the next seat. Omit it
		 * for a chamber with no majority to read, such as the governors.
		 */
		majority?: number
		/**
		 * The number of arcs. Omit it to take the number that keeps the seats about
		 * as far apart along an arc as from one arc to the next: 4 for 50 seats, 5
		 * for 100, and 10 for 435.
		 */
		rows?: number
		/**
		 * Content in the hole of the hemicycle, above its base: a total, a stat. Content
		 * too large for the hole scales down to fit it.
		 */
		children?: ReactNode
	}

const messages = defineMessages<{ seats: Record<never, never> }>({
	seats: {
		id: 'ui.chart.seats',
		defaultMessage: 'Seats',
		description:
			'The name of the value of each group in a seat chart, such as the seats of a party.',
	},
})

/** The ratio of the width to the height of a seat chart by default: the hemicycle with its margins. @internal */
const SEAT_ASPECT_RATIO = 2

/** The legend of a seat chart hides no group. @internal */
const NO_GROUPS: ReadonlySet<number> = new Set()

/** The legend of a seat chart is a key, so a toggle does nothing. @internal */
function ignoreToggle(_index: number): void {}

/** How far from a seat the pointer still names it, in seat radii. @internal */
const SEAT_REACH = 2.5

/** Whether two lists of groups draw the same chart, so a new array with the same groups keeps the readout. @internal */
function sameGroups(a: readonly SeatChartGroup[], b: readonly SeatChartGroup[]): boolean {
	return (
		a.length === b.length &&
		a.every((group, index) => {
			const other = b[index]

			return (
				other !== undefined &&
				group.seats === other.seats &&
				group.color === other.color &&
				group.label === other.label &&
				group.hollow === other.hollow
			)
		})
	)
}

/** The seats of a group as a whole count of zero or more. @internal */
function seatCount(group: SeatChartGroup): number {
	return Number.isFinite(group.seats) ? Math.max(0, Math.floor(group.seats)) : 0
}

/**
 * A seat chart: the seats of a chamber as dots on the concentric arcs of a
 * hemicycle, as a parliament draws its floor. The groups take the seats in
 * order from the start of the hemicycle, so each group reads as one block.
 * A hollow group draws rings, such as seats that are not called yet, and its
 * legend key is a frame. A tick marks the `majority`, and `children`
 * render in the hole, as in a {@link DonutChart}. Content too large for the
 * hole scales down, so it never covers a seat.
 *
 * The chart reuses the frame of the Chart module: the legend names each group,
 * the tooltip reads the group under the pointer, and a visually-hidden data
 * table lists the seats of each group. The legend is a key, with no switches,
 * because a group that leaves would move every seat of the chamber. The plot is
 * one tab stop, and the arrow keys walk the groups. The context menu offers the
 * fullscreen view, the data, and the downloads.
 *
 * @example
 * ```tsx
 * <SeatChart
 *   aria-label="House seats"
 *   groups={[
 *     { seats: 214, color: 'blue', label: 'Democrats' },
 *     { seats: 18, color: 'zinc', label: 'Not called', hollow: true },
 *     { seats: 203, color: 'red', label: 'Republicans' },
 *   ]}
 *   majority={218}
 * >
 *   <Stat label="to win" value="218" />
 * </SeatChart>
 * ```
 */
export function SeatChart(props: SeatChartProps) {
	const {
		groups,
		majority,
		rows,
		width,
		height,
		aspectRatio,
		legend,
		tooltip,
		formatValue,
		className,
		children,
		...name
	} = props

	const intl = useIntl()

	const { locale } = useLocale()

	const format = formatValue ?? readoutFormat(locale)

	const percent = percentFormat(locale)

	const resolvedLegend = resolveLegend(legend)

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	const stableGroups = useStableValue(groups, sameGroups)

	const counts = useMemo(() => stableGroups.map(seatCount), [stableGroups])

	const total = counts.reduce((sum, count) => sum + count, 0)

	const layout = useMemo(() => seatLayout(total, rows ?? seatRows(total)), [total, rows])

	const owners = useMemo(() => seatGroups(counts, total), [counts, total])

	const sizing = chartFrameSizing(
		height,
		chartAspectRatio(aspectRatio, SEAT_ASPECT_RATIO, useChartFullscreen()),
	)

	const {
		sizing: frameSizing,
		frameAspect,
		fill: fillFrame,
		aside,
		hasLegend,
		stackedLegend,
	} = sectorFrame(sizing, resolvedLegend.value, stableGroups.length)

	const {
		ref,
		width: frameWidth,
		height: frameHeight,
		reserve,
		policy,
	} = useChartFrameSizing({
		width,
		sizing: frameSizing,
		aside,
		aspect: frameAspect,
		chrome: { headerLines: headerLineCount(props.title, props.subtitle), legend: stackedLegend },
		tickTarget: TICK_TARGET,
	})

	const labels = stableGroups.map((group) => group.label)

	const colors = stableGroups.map((group) => group.color)

	const paints = colors.map((color) => k.series[color])

	const angle = majorityAngle(layout.seats, majority)

	const line = angle === null ? null : majorityLine(angle, layout)

	const fit = seatFit(frameWidth, frameHeight, MARK_GAP, layout.dot, line !== null)

	const toFrame = (x: number, y: number) => ({
		x: fit.cx + x * fit.scale,
		y: fit.cy + y * fit.scale,
	})

	// The readout lists the seats of each group, built on first read.
	const seatsLabel = intl.formatMessage(messages.seats)

	const readout = useMemo(
		() =>
			stableGroups.length > 0
				? once(
						(): ChartReadout => ({
							categories: stableGroups.map((group) => group.label),
							rows: [
								{
									label: seatsLabel,
									swatchClass: '',
									swatchClasses: stableGroups.map((group) => cn(k.series[group.color].text)),
									swatch: 'rect',
									values: stableGroups.map((group) => readoutCell(seatCount(group), format)),
								},
							],
						}),
					)
				: null,
		[stableGroups, seatsLabel, format],
	)

	const shares = counts.map((count) => (total > 0 && count > 0 ? count / total : null))

	// A hollow group draws rings, so its legend key is a frame, not a fill.
	const legendItems = hasLegend
		? sectorLegendItems(labels, paints, colors, shares, aside, percent).map((item) => ({
				...item,
				hollow: stableGroups[item.index]?.hollow === true,
			}))
		: null

	// The pointer names the group of the nearest seat, within a reach of a few
	// seat radii, so a point between two seats still reads one of them.
	const groupAt = useCallback(
		(x: number, y: number): number | null => {
			if (fit.scale <= 0) return null

			const seat = nearestSeat(
				layout.seats,
				(x - fit.cx) / fit.scale,
				(y - fit.cy) / fit.scale,
				layout.dot * SEAT_REACH,
			)

			const group = seat === null ? -1 : (owners[seat] ?? -1)

			return group < 0 ? null : group
		},
		[fit.cx, fit.cy, fit.scale, layout, owners],
	)

	const markAt = useCallback(
		(x: number, y: number): ChartMarkRef | null => {
			const group = groupAt(x, y)

			return group === null ? null : { series: group, datum: null }
		},
		[groupAt],
	)

	// One keyboard stop for each group, at its middle seat.
	const middles = counts.map((count, group) => {
		const first = owners.indexOf(group)

		const seat = count > 0 && first >= 0 ? layout.seats[first + Math.floor(count / 2)] : undefined

		return seat ? [toFrame(seat.x, seat.y)] : []
	})

	const empty = new Set(counts.flatMap((count, group) => (count > 0 ? [] : [group])))

	return (
		<ChartFrame
			{...name}
			fullscreen={<SeatChart {...props} />}
			ref={ref}
			width={frameWidth}
			fixedWidth={width}
			height={frameHeight}
			reserve={reserve}
			fill={fillFrame}
			aspect={frameAspect}
			tier={policy.tier}
			legend={
				legendItems && (
					<ChartLegend
						items={legendItems}
						hidden={NO_GROUPS}
						onToggle={ignoreToggle}
						panel={aside}
						maxRows={policy.legendRows}
						inert
					/>
				)
			}
			legendPlacement={resolvedLegend.placement}
			readout={readout}
			hidden={empty}
			seriesCount={stableGroups.length}
			emphasizeMarks
			tooltip={showTooltip}
			focus={{
				points: middles,
				series: middles.map((stops, group) => (stops.length > 0 ? [group] : [])),
				categoryArrows: true,
			}}
			keyboardEmphasis
			className={className}
			overlay={
				children ? (
					<SeatChartHole
						left={frameWidth > 0 ? `${(fit.cx / frameWidth) * 100}%` : '50%'}
						top={frameHeight > 0 ? `${(fit.cy / frameHeight) * 100}%` : '100%'}
						radius={seatHole(layout) * fit.scale}
					>
						{children}
					</SeatChartHole>
				) : undefined
			}
		>
			<SeatChartMarks
				seats={layout.seats}
				owners={owners}
				groups={stableGroups}
				dot={layout.dot}
				fit={fit}
			/>

			{line && (
				<line
					data-slot="chart-majority"
					x1={fit.cx + line.x1 * fit.scale}
					y1={fit.cy + line.y1 * fit.scale}
					x2={fit.cx + line.x2 * fit.scale}
					y2={fit.cy + line.y2 * fit.scale}
					strokeWidth={1.5}
					strokeLinecap="round"
					className={cn(k.majority)}
					pointerEvents="none"
				/>
			)}

			{showTooltip && total > 0 && (
				<ChartHitArea
					plot={{ x: 0, y: 0, width: frameWidth, height: frameHeight }}
					resolve={groupAt}
					markAt={markAt}
					trigger={trigger}
				/>
			)}
		</ChartFrame>
	)
}
