'use client'

import { cn } from '../../../core'
import * as m from '../../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../../recipes/kata/chart'
import type { ChartValueAxisId } from './chart-axes/schema'
import { type ChartPaint, fillClass, rawColor } from './chart-color/paint'
import { type LabelBox, type PlacedValueLabel, resolveValueLabels } from './chart-geometry/label'
import { ChartGeneration } from './chart-marks/layer'
import { POINT_POP, POINT_UNPOP } from './chart-motion'
import type { PlotRect } from './chart-orientation'
import { useChartTier } from './context'

/**
 * Selective value labels for a line-bearing chart: direct labels at the points
 * worth naming, and with `references` beside each reference rule. A reader
 * therefore gets the numbers without the tooltip. All default off; set any. The
 * full readout stays in the tooltip and data table.
 *
 * `endpoints` and `extremes` apply only to a single-series chart. With more than
 * one series the numbers would crowd between the lines with nowhere reliable to
 * sit. They therefore stand down, and the tooltip carries the readout. The
 * chart reserves value-axis room past the data extremes. A label at an edge
 * therefore sits clear of the line, instead of flipping onto it. A
 * `ComboChart` counts only its line and area series, and the room widens the
 * value axis its bars share. A plot too short to afford that room sheds the point labels whole, rather
 * than render them crowded. `references` is unaffected by either rule.
 */
export type ChartValueLabelConfig = {
	/**
	 * Label the first and last point — single-series charts only.
	 * @defaultValue false
	 */
	endpoints?: boolean
	/**
	 * Label the minimum and maximum point — single-series charts only.
	 * @defaultValue false
	 */
	extremes?: boolean
	/**
	 * Draw a standing label beside each reference rule at its far end, inked to
	 * match the rule. It shows the rule's own label when it has one, else the
	 * rule's value. The standing
	 * readout replaces the rule's hover tooltip. With it on, the rules shed their
	 * pointer target and keyboard stop, since the label already reads what the
	 * tooltip would. The labels of close rules stack apart, so no two overlap,
	 * and a point label that meets a reference label drops. Each label has a
	 * halo in the surface color, so it stays legible where a line or a rule
	 * crosses it. The visually-hidden reference list keeps the assistive-tech
	 * parity either way.
	 * @defaultValue false
	 */
	references?: boolean
}

/** The part of a cartesian chart that its point labels read. @internal */
type ValueLabelChart = {
	/** Whether the layout afforded the headroom that the labels asked for. */
	valueLabelRoom: boolean
	plot: PlotRect
	formatAxisValue: (value: number, axis: ChartValueAxisId) => string
}

/**
 * The placed point labels of a line, area, or combo chart. A plot too short to
 * afford the reserved label room sheds the labels whole. The layout decides by
 * the same test that the scale reserved by, so a label never renders against an
 * edge that has no room. Each series formats its labels with the formatter of
 * its own value axis. A dual-axis chart therefore labels a currency series
 * against `y` and a percent against `y2`.
 *
 * @param list The drawn line or area series, aligned with `metas`.
 * @param metas The values and the value axis of each series in `list`.
 * @param gapSkipped Whether the points of each series already drop the null
 * categories. A stacked ribbon's edge carries one point for each category, so
 * it passes `false`.
 * @param obstacles The boxes of the standing reference labels
 * ({@link placeReferenceLabels}). A point label that meets one drops.
 * @internal
 */
export function cartesianValueLabels(
	chart: ValueLabelChart,
	config: ChartValueLabelConfig | undefined,
	list: { paint: ChartPaint; geometry: { points: { x: number; y: number }[] } }[],
	metas: { values: (number | null)[]; axis: ChartValueAxisId }[],
	gapSkipped = true,
	obstacles: LabelBox[] = [],
): PlacedValueLabel[] {
	if (!chart.valueLabelRoom) return []

	return resolveValueLabels(
		config,
		list.map((entry, index) => {
			const meta = metas[index]

			const axis = meta?.axis ?? 'y'

			return {
				fill: fillClass(entry.paint),
				color: rawColor(entry.paint),
				points: entry.geometry.points,
				values: meta?.values ?? [],
				format: (value: number) => chart.formatAxisValue(value, axis),
			}
		}),
		chart.plot,
		gapSkipped,
		obstacles,
	)
}

/** Props for {@link ChartValueLabels}. @internal */
export type ChartValueLabelsProps = {
	labels: PlacedValueLabel[]
	animate: boolean
	/**
	 * The generation signature of the marks ({@link seriesDataKey}). The
	 * data-change fade swaps on it. When it is omitted, the labels never replay on
	 * a data change.
	 */
	dataKey?: string
}

/** The fade of a value label, held at module scope so each render reuses it. @internal */
const LABEL_HIDDEN = { opacity: 0 }

/** @internal */
const LABEL_SHOWN = { opacity: 1 }

/** @internal */
const LABEL_EXIT = { opacity: 0, transition: POINT_UNPOP }

/**
 * The placed value labels, drawn over the marks in the color of each series.
 * They take no pointer: the tooltip and the data table own the readout.
 *
 * At the spark tier, read through {@link ChartTierContext}, the labels stand
 * down with the rest of the chrome, since a sparkline is bare marks. A chart
 * passes its placed labels through and leaves the tier to the frame.
 *
 * Under `animate`, each label fades in once its line has drawn, on the same beat
 * as the point markers. The labels share the {@link ChartGeneration} of the
 * marks, so on a data change they fade out with the outgoing marks before the
 * new labels fade in. Each label keys on its series and its point, not on its
 * position, so a resize moves a label in place and does not mount it again.
 *
 * @internal
 */
export function ChartValueLabels({ labels, animate, dataKey }: ChartValueLabelsProps) {
	const spark = useChartTier() === 'spark'

	if (spark || labels.length === 0) return null

	return (
		<ChartGeneration
			animate={animate}
			dataKey={dataKey}
			slot="chart-value-labels"
			pointerEvents="none"
		>
			{labels.map((label) => {
				const shared = {
					'data-slot': 'chart-value-label',
					x: label.x,
					y: label.y,
					textAnchor: label.anchor,
					dominantBaseline: 'central' as const,
					// A raw color inks through the `fill` attribute; a slot omits it and
					// inks through its class.
					fill: label.color,
					className: cn(k.mark.label, label.fill),
				}

				return animate ? (
					<m.text
						key={label.key}
						{...shared}
						initial={LABEL_HIDDEN}
						animate={LABEL_SHOWN}
						exit={LABEL_EXIT}
						transition={POINT_POP}
					>
						{label.text}
					</m.text>
				) : (
					<text key={label.key} {...shared}>
						{label.text}
					</text>
				)
			})}
		</ChartGeneration>
	)
}
