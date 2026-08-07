/**
 * The map's legend resolution, kept off {@link MapPlat} so the component stays
 * a thin assembly: whether the legend shows, where it sits, whether the binned
 * switchboard or the continuous range bar paints it, and what entries it holds.
 * Pure — every input arrives resolved, so the rules are testable without a
 * frame.
 */

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import type { ChartRangeLegendConfig } from '../chart/engine/chart-legend/range'
import { resolveRangeLegend } from '../chart/engine/chart-legend/range'
import { categoryLegendId, type MapCategoryMeta } from './map-categories'
import type { MapLegendItem } from './map-legend'
import type { MapRangeLegendProps } from './map-range-legend'
import type { MapLegendPlacement } from './types'
import type { MapOverlayEntry } from './use-map-legend-registry'

/**
 * The map's `legend` prop: the switchboard's boolean / placement, the `'range'`
 * discriminator that swaps in the continuous scale bar, or the object form
 * `{ type: 'range', placement }` naming that bar's placement — the same shape a
 * chart's range legend takes, so the choropleth and heatmap read alike.
 *
 * @internal
 */
export type MapLegendInput = boolean | MapLegendPlacement | 'range' | ChartRangeLegendConfig

/** Whether a `legend` prop asks for the continuous range bar rather than the binned switchboard. @internal */
function isRangeLegend(legend: MapLegendInput | undefined): boolean {
	if (legend === 'range') return true

	// The only object form is the range config, so any object asks for the bar.
	return typeof legend === 'object'
}

/**
 * Whether the legend's box mounts: explicitly asked for, or able to appear —
 * two or more categories, a registered overlay, or overlay children whose
 * entries will register from the client. Deciding off the children keeps the
 * box mounted ahead of late registrations, so they never shift the frame.
 *
 * @internal
 */
function legendCanShow(
	legend: MapLegendInput | undefined,
	categoryCount: number,
	entryCount: number,
	children: ReactNode,
): boolean {
	if (legend !== undefined) return legend !== false

	return categoryCount > 1 || entryCount > 0 || children != null
}

/**
 * The switchboard legend's placement: the numeric (choropleth) mode reads on the
 * right by default, categorical maps keep the centered bottom row, and an
 * explicit placement always wins. The range bar resolves its own placement
 * through {@link resolveRangeLegend}, so this only serves the switchboard.
 *
 * @internal
 */
function resolveLegendPlacement(
	legend: MapLegendInput | undefined,
	numeric: boolean,
): MapLegendPlacement {
	if (typeof legend === 'string' && legend !== 'range') return legend

	return numeric ? 'right' : 'bottom'
}

/** The scale the range bar reads, kept together so {@link planMapLegend} can gate on all of it at once. @internal */
type MapRangeScale = {
	colorRange: string[] | undefined
	valueExtent: [number, number] | null
	valueFormat: ((value: number) => string) | undefined
	valueName: string | undefined
	/** Each region's raw value — the bar's hover arrow marks the pointed one. */
	regionNumbers: (number | null)[]
	onFocus: (id: string | null) => void
}

/** What the map draws for its legend: whether it shows, where it sits, and the range bar's props in range mode. @internal */
type MapLegendPlan = {
	show: boolean
	placement: MapLegendPlacement
	/** The continuous scale bar's props, or `null` for the binned switchboard. */
	range: MapRangeLegendProps | null
}

/**
 * Resolves the map's legend against its measured box: the binned switchboard
 * keeps its own can-show and placement rules, while the range bar (numeric mode,
 * `'range'` or the object form) resolves placement, orientation, and visibility
 * through the shared {@link resolveRangeLegend} — sheds at the spark tier, drops
 * a side placement to a horizontal row in a box too narrow for a rail — so the
 * choropleth's bar behaves exactly as the heatmap's does.
 *
 * @internal
 */
export function planMapLegend(
	legend: MapLegendInput | undefined,
	numeric: boolean,
	box: { width: number; height: number },
	switchboard: { categoryCount: number; entryCount: number; children: ReactNode },
	scale: MapRangeScale,
): MapLegendPlan {
	if (!(numeric && isRangeLegend(legend))) {
		return {
			show: legendCanShow(
				legend,
				switchboard.categoryCount,
				switchboard.entryCount,
				switchboard.children,
			),
			placement: resolveLegendPlacement(legend, numeric),
			range: null,
		}
	}

	const resolved = resolveRangeLegend(
		typeof legend === 'object' ? legend : undefined,
		box.width,
		box.height,
	)

	// The direct value checks (not a precomputed boolean) narrow `colorRange` and
	// `valueExtent` inside the branch, so the range props type without an assertion.
	const range: MapRangeLegendProps | null =
		resolved.show && scale.colorRange !== undefined && scale.valueExtent !== null
			? {
					colorRange: scale.colorRange,
					domain: scale.valueExtent,
					format: scale.valueFormat ?? ((value) => String(value)),
					label: scale.valueName,
					bins: switchboard.categoryCount,
					regionNumbers: scale.regionNumbers,
					onFocus: scale.onFocus,
					orientation: resolved.orientation,
				}
			: null

	return { show: range !== null, placement: resolved.placement, range }
}

/**
 * The legend entries: the region categories, then every registered overlay.
 * A numeric choropleth lists its bins largest-first (descending), matching the
 * range bar's high-at-top scale; the bin ids stay bound to their value order.
 *
 * @internal
 */
export function legendItems(
	categories: MapCategoryMeta[],
	entries: MapOverlayEntry[],
	colors: ReadonlyMap<string, MapSeriesColor>,
	descending: boolean,
): MapLegendItem[] {
	const categoryItems = categories.map((meta) => ({
		id: categoryLegendId(meta.value),
		label: meta.label,
		// A categorical slot carries a currentColor class; a numeric bin an inline value.
		...(meta.paint.kind === 'value'
			? { swatchColor: meta.paint.color }
			: { swatchClass: cn(meta.paint.text) }),
		swatch: 'rect' as const,
	}))

	if (descending) categoryItems.reverse()

	const entryItems = entries.map((entry) => ({
		id: entry.id,
		label: entry.label,
		swatchClass: cn(k.series[colors.get(entry.id) ?? 'blue'].text),
		swatch: entry.swatch,
		detail: entry.detail,
	}))

	return [...categoryItems, ...entryItems]
}
