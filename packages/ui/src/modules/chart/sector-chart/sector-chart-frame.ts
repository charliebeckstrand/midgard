import { cn } from '../../../core'
import type { FrameSizing } from '../../../hooks'
import type { ChartColorSlot } from '../../../recipes/kata/chart'
import { formatPercent } from '../../../utilities'
import type { SlotPaint } from '../engine/chart-color/paint'
import { type ChartAspectRatio, chartFrameSizing, frameFills } from '../engine/chart-layout'
import type { ChartLegendItem } from '../engine/chart-legend/legend'
import { legendAside, legendVisible, type ResolvedLegend } from '../engine/chart-legend/schema'
import type { ChartReadout } from '../engine/types'
import type { SectorLabels } from './sector-chart'

/** Defaults both label switches off. @internal */
export function resolveSectorLabels(labels: SectorLabels | undefined): Required<SectorLabels> {
	return { segment: labels?.segment ?? false, callouts: labels?.callouts ?? false }
}

/**
 * The public `onCategoryClick` resolved to the marks' index-based contract —
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
 * The inline position that centres a donut's overlay on the ring's hole rather
 * than the plot box: callouts shift the pie centre off `frameWidth / 2` to
 * balance the two label columns, so the content follows `center` into the hole.
 * Falls back to the box centre before the frame is measured.
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
 * The ratio a default pie / donut takes inside the fullscreen dialog. The
 * dialog panel is sized for a 16/9 chart — the same ratio the cartesian charts
 * default to — so a pie left at its square content fit fills the panel's width
 * and overruns its height cap; there it adopts the panel's ratio instead. An
 * explicit `aspectRatio` still wins. See {@link ChartContextMenu}.
 *
 * @internal
 */
const FULLSCREEN_ASPECT_RATIO: ChartAspectRatio = '16/9'

/**
 * The aspect a pie frame resolves its sizing through: the caller's explicit
 * `aspectRatio` when set, else the {@link FULLSCREEN_ASPECT_RATIO} while the
 * chart is the fullscreen dialog's re-mounted copy, else free-form so the frame
 * fits the pie's own content. Kept off {@link SectorChart}'s own branch count.
 *
 * @internal
 */
export function sectorAspectRatio(
	aspectRatio: ChartAspectRatio | undefined,
	fullscreen: boolean,
): ChartAspectRatio | undefined {
	return aspectRatio ?? (fullscreen ? FULLSCREEN_ASPECT_RATIO : undefined)
}

/**
 * The pie frame's sizing policy: an explicit `height` or `aspectRatio` always
 * wins, resolved the same way every cartesian chart does. Left at both
 * defaults, the frame instead fits its height to the pie's own footprint —
 * twice the width-bound radius plus the vertical margin — so a wide callout
 * label never leaves an empty band the aspect ratio didn't need. `radius`
 * refines that footprint once a real width lands, to a callout-labelled
 * pie's tight, asymmetric fit rather than the flat `hMargin` every chart
 * frame otherwise falls back to.
 *
 * @internal
 */
export function sectorFrameSizing(
	height: number | undefined,
	aspectRatio: ChartAspectRatio | undefined,
	hMargin: number,
	vMargin: number,
	radius?: (width: number) => number,
): FrameSizing {
	if (height !== undefined || aspectRatio !== undefined) {
		return chartFrameSizing(height, aspectRatio ?? 1)
	}

	return { mode: 'content', hMargin, vMargin, radius }
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
	/** The legend shows — for two or more slices, or where the prop forces it. */
	hasLegend: boolean
	/** A stacked (top / bottom) legend bands inside the aspect box, sharing the pie's ratio. */
	stackedLegend: boolean
}

/**
 * Folds a stacked legend into the pie's aspect box: a live ratio with a top /
 * bottom legend hands the ratio to the figure wrapper and measures the pie's
 * remaining height, so a pie and its legend band fill a fixed-aspect box
 * together. A side legend instead keeps the ratio on the pie box and bands
 * beside it at its own width, so the pie never squeezes to fit the panel. The
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

/** The values behind the slices for the tooltip and table; `null` with no rows. @internal */
export function sectorReadout(
	labels: string[],
	paints: SlotPaint[],
	valueLabel: string,
	values: (number | null)[],
	format: (value: number) => string,
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
				values: values.map((entry) => (entry === null ? '—' : format(entry))),
			},
		],
	}
}

/**
 * The legend entries, one per row of data. A side panel's entries also carry
 * the slice's live share — re-shared over the surviving whole as slices
 * toggle, an em-dash while a slice is off or takes no slice.
 *
 * @internal
 */
export function sectorLegendItems(
	labels: string[],
	paints: SlotPaint[],
	colors: ChartColorSlot[],
	sliceValues: (number | null)[],
	panel: boolean,
): ChartLegendItem[] {
	const total = sliceValues.reduce<number>(
		(sum, entry) => sum + (entry != null && entry > 0 ? entry : 0),
		0,
	)

	return labels.map((entry, index) => {
		const value = sliceValues[index]

		const share = value != null && value > 0 && total > 0 ? formatPercent(value / total) : '—'

		return {
			index,
			label: entry,
			swatchClass: paints[index]?.text.join(' ') ?? '',
			swatch: 'rect' as const,
			color: colors[index],
			detail: panel ? share : undefined,
		}
	})
}
