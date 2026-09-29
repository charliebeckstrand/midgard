'use client'

import { useMemo } from 'react'
import { useStableValue } from '../../../hooks/use-stable-value'
import { once } from '../../../utilities'
import { rawColor, textClass } from '../engine/chart-color/paint'
import { scatterReadoutValues } from '../engine/chart-geometry/scatter'
import type { ChartReadout, ScatterChartSeries } from '../engine/types'
import type { ScatterMeta } from './scatter-chart-layout'

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
			values: scatterReadoutValues(
				meta.points,
				uniqueXs,
				format,
				meta.sizeName === null ? null : (size) => `${meta.sizeName}: ${formatSize(size)}`,
			),
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
function scatterReadoutThunk(
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
 * The readout thunk, memoized on the content its cells read: the rows, each
 * visible series' fields, name, and color, and the three formats. A parent render
 * hands new metas with the same content. A new thunk would reformat every cell
 * of the hidden table, and the deferred table would render the frame again.
 *
 * The metas and the x values are held while the rows and the key of the visible
 * series stay the same, so the memo lists what it reads.
 *
 * @internal
 */
export function useScatterChartReadout<T>(
	data: T[],
	series: ScatterChartSeries<T>[],
	visible: ScatterMeta[],
	uniqueXs: number[],
	format: (value: number) => string,
	formatX: (value: number) => string,
	formatSize: (value: number) => string,
): (() => ChartReadout | null) | null {
	const key = visible
		.map((meta) => {
			const entry = series[meta.index]

			return [
				meta.index,
				meta.label,
				meta.sizeName,
				entry?.xKey,
				entry?.yKey,
				entry?.sizeKey,
				entry?.color,
			].join('\u0001')
		})
		.join('\u0000')

	const held = useStableValue(
		{ data, key, visible, uniqueXs },
		(previous, next) => previous.data === next.data && previous.key === next.key,
	)

	return useMemo(
		() => scatterReadoutThunk(held.visible, held.uniqueXs, format, formatX, formatSize),
		[held, format, formatX, formatSize],
	)
}
