'use client'

import { useMemo } from 'react'
import { once } from '../../../utilities/once'
import { rawColor, textClass } from '../engine/chart-color/paint'
import { scatterReadoutValues } from '../engine/chart-geometry/scatter'
import type { ChartReadout } from '../engine/types'
import type { ScatterMeta } from './scatter-chart-layout'

/**
 * The size measure of a series as the readout names it, for example
 * `weight: 4`, or `null` for a series that reads no size.
 *
 * @internal
 */
export function sizeLabel(
	meta: ScatterMeta,
	formatSize: (value: number) => string,
): ((size: number) => string) | null {
	const name = meta.sizeName

	return name === null ? null : (size) => `${name}: ${formatSize(size)}`
}

/** The readout behind the discs: unique x columns crossed with each series' points. @internal */
function scatterReadout(
	visible: ScatterMeta[],
	uniqueXs: number[],
	format: (value: number) => string,
	formatX: (value: number) => string,
	formatSize: (value: number) => string,
): ChartReadout | null {
	if (visible.length === 0 || uniqueXs.length === 0) return null

	return {
		categories: uniqueXs.map(formatX),
		rows: visible.map((meta) => ({
			index: meta.index,
			label: meta.label,
			swatchClass: textClass(meta.paint) ?? '',
			swatchColor: rawColor(meta.paint),
			swatch: 'rect',
			values: scatterReadoutValues(meta.points, uniqueXs, format, sizeLabel(meta, formatSize)),
		})),
	}
}

/**
 * The readout as a cached thunk, or `null` when there's nothing to read. At ten
 * thousand points the readout formats every unique-x column through `Intl`,
 * which costs more than drawing the discs. The mount render therefore only
 * decides one exists. The first consumer (the hover tooltip, the deferred
 * table) materializes it off that path.
 *
 * @internal
 */
function buildReadout(
	visible: ScatterMeta[],
	uniqueXs: number[],
	format: (value: number) => string,
	formatX: (value: number) => string,
	formatSize: (value: number) => string,
): (() => ChartReadout | null) | null {
	if (visible.length === 0 || uniqueXs.length === 0) return null

	return once(() => scatterReadout(visible, uniqueXs, format, formatX, formatSize))
}

/**
 * The readout thunk, memoized on the visible metas, the x values, and the three
 * formats. The chart body holds the metas and the x values while the rows and
 * the series stay the same, so a parent render keeps the thunk. A new thunk
 * would format each cell of the hidden table again, and the deferred table
 * would render the frame again.
 *
 * @internal
 */
export function useScatterChartReadout(
	visible: ScatterMeta[],
	uniqueXs: number[],
	format: (value: number) => string,
	formatX: (value: number) => string,
	formatSize: (value: number) => string,
): (() => ChartReadout | null) | null {
	return useMemo(
		() => buildReadout(visible, uniqueXs, format, formatX, formatSize),
		[visible, uniqueXs, format, formatX, formatSize],
	)
}
