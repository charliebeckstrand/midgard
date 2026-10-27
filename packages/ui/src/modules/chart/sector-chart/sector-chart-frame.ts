import { cn } from '../../../core'
import type { FrameColumn, FrameSizing } from '../../../hooks'
import type { ChartColorSlot } from '../../../recipes/kata/chart'
import type { SlotPaint } from '../engine/chart-color/paint'
import { type ChartAspectRatio, chartFrameSizing, frameFills } from '../engine/chart-frame/sizing'
import type { ChartLegendItem } from '../engine/chart-legend/legend'
import { legendAside, legendVisible, type ResolvedLegend } from '../engine/chart-legend/schema'
import { readoutCell } from '../engine/chart-series'
import type { ChartReadout } from '../engine/types'
import type { SectorLabels } from './sector-chart'

/** Defaults both label switches off. @internal */
export function resolveLabels(labels: SectorLabels | undefined): Required<SectorLabels> {
	return { segment: labels?.segment ?? false, callouts: labels?.callouts ?? false }
}

/**
 * The public `onCategoryClick` resolved to the marks' index-based contract:
 * a slice's data index names it through the data-aligned label list.
 *
 * @internal
 */
export function sliceActivation(
	onCategoryClick: ((category: string, index: number) => void) | undefined,
	sliceLabels: string[],
): ((index: number) => void) | undefined {
	return onCategoryClick && ((index) => onCategoryClick(sliceLabels[index] ?? '', index))
}

/**
 * The inline position that centers a donut's overlay on the ring's hole rather
 * than the plot box. Callouts shift the pie center off `frameWidth / 2` to
 * balance the two label columns, so the content follows `center` into the hole.
 * Falls back to the box center before the frame is measured.
 *
 * @internal
 */
export function donutCenterStyle(
	center: { x: number; y: number },
	frameWidth: number,
	frameHeight: number,
): { left: string; top: string } {
	return {
		left: frameWidth > 0 ? `${(center.x / frameWidth) * 100}%` : '50%',
		top: frameHeight > 0 ? `${(center.y / frameHeight) * 100}%` : '50%',
	}
}

/**
 * The pie frame's sizing policy: an explicit `height` or `aspectRatio` always
 * wins, resolved the same way every cartesian chart does. Left at both
 * defaults, the frame instead fits its height to the pie's own footprint:
 * twice the width-bound radius plus the vertical margin. The callout labels
 * take a `column` on each side, so they never leave an empty band the aspect
 * ratio didn't need. The box holds that height through CSS from the width
 * alone, so the pie draws inside it: the tight callout fit can widen the pie
 * only as far as the box allows.
 *
 * @internal
 */
export function sectorFrameSizing(
	height: number | undefined,
	aspectRatio: ChartAspectRatio | undefined,
	hMargin: number,
	vMargin: number,
	column?: FrameColumn,
): FrameSizing {
	if (height !== undefined || aspectRatio !== undefined) {
		return chartFrameSizing(height, aspectRatio ?? 1)
	}

	return { mode: 'content', hMargin, vMargin, ...(column && { column }) }
}

/** The resolved pie frame: the plot's sizing plus the figure and legend layout. @internal */
type SectorFrame = {
	sizing: FrameSizing
	/** The whole-chart aspect the figure carries; `undefined` when the plot box reserves its own. */
	frameAspect?: number
	/** The plot grows into its region's height rather than reserving one. */
	fill: boolean
	/** The legend is a side panel, so it lays out beside the pie. */
	aside: boolean
	/** The legend shows for two or more slices, or where the prop forces it. */
	hasLegend: boolean
	/** A stacked (top / bottom) legend bands inside the aspect box, sharing the pie's ratio. */
	stackedLegend: boolean
}

/**
 * Folds a stacked legend into the pie's aspect box. A live ratio with a top /
 * bottom legend hands the ratio to the figure wrapper and measures the pie's
 * remaining height. A pie and its legend band thus fill a fixed-aspect box
 * together. A side legend instead keeps the ratio on the pie box and bands
 * beside it at its own width. The pie then never squeezes to fit the panel. The
 * `content` fit (the default) and a `fixed` height band the legend beside the
 * plot as before, reserving nothing extra.
 *
 * @internal
 */
export function sectorFrame(
	sizing: FrameSizing,
	legend: ResolvedLegend['value'],
	dataLength: number,
): SectorFrame {
	const hasLegend = legendVisible(legend, dataLength)

	const aside = legendAside(legend)

	// Only a stacked legend shares the pie's aspect box; a side legend leaves the
	// ratio on the pie box and bands beside it, the same as a legend-free pie.
	const shareAspect = sizing.mode === 'aspect' && hasLegend && !aside

	const frameSizing: FrameSizing = shareAspect
		? { mode: 'aspect-fill', ratio: sizing.ratio }
		: sizing

	return {
		sizing: frameSizing,
		frameAspect: shareAspect ? sizing.ratio : undefined,
		fill: frameFills(frameSizing),
		aside,
		hasLegend,
		// Only a stacked band shares the aspect box the chrome reserve applies to; a
		// side legend bands beside the pie at its own width.
		stackedLegend: hasLegend && !aside,
	}
}

/**
 * The held selection narrowed to the rows that draw a slice, or `null` with no
 * selection.
 *
 * @internal
 */
export function drawnSelection(
	selected: ReadonlySet<number> | null,
	drawn: ReadonlySet<number>,
): ReadonlySet<number> | null {
	return selected && new Set([...selected].filter((index) => drawn.has(index)))
}

/**
 * Each row's `0..1` share of the positive whole, indexed like `values`, or
 * `null` for a row that takes no slice (a missing, non-positive, or toggled-off
 * value). The callouts, the legend panel, and the readout all read it, so they
 * agree on each percent.
 *
 * @internal
 */
export function sliceShares(values: (number | null)[]): (number | null)[] {
	const total = values.reduce<number>(
		(sum, value) => sum + (value != null && value > 0 ? value : 0),
		0,
	)

	return values.map((value) => (value != null && value > 0 && total > 0 ? value / total : null))
}

/**
 * The values behind the slices for the tooltip and table; `null` with no rows.
 * A slice's cell trails its value with its share, for example `30 (50%)`, so the
 * share reads with no segment label or callout. A row with no slice reads its
 * value alone.
 *
 * @internal
 */
export function sectorReadout(
	labels: string[],
	paints: SlotPaint[],
	valueLabel: string,
	values: (number | null)[],
	shares: (number | null)[],
	format: { value: (value: number) => string; percent: (share: number) => string },
): ChartReadout | null {
	if (labels.length === 0) return null

	return {
		categories: labels,
		rows: [
			{
				label: valueLabel,
				swatchClass: '',
				swatchClasses: paints.map((paint) => cn(paint.text)),
				swatch: 'rect',
				values: values.map((value, index) => {
					const cell = readoutCell(value, format.value)

					const share = shares[index]

					return share == null ? cell : `${cell} (${format.percent(share)})`
				}),
			},
		],
	}
}

/**
 * The legend entries, one per row of data. A side panel's entries also carry
 * the slice's live share, re-shared over the surviving whole as slices toggle.
 * The share reads as an em-dash while a slice is off or takes no slice.
 *
 * @internal
 */
export function sectorLegendItems(
	labels: string[],
	paints: SlotPaint[],
	colors: ChartColorSlot[],
	shares: (number | null)[],
	panel: boolean,
	percent: (share: number) => string,
): ChartLegendItem[] {
	return labels.map((label, index) => {
		const value = shares[index]

		const share = value == null ? '—' : percent(value)

		return {
			index,
			label,
			swatchClass: cn(paints[index]?.text),
			swatch: 'rect' as const,
			color: colors[index],
			detail: panel ? share : undefined,
		}
	})
}
