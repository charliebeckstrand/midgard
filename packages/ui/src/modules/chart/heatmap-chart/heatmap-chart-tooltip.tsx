'use client'

import { type RefObject, useMemo } from 'react'
import { TooltipPointer } from '../../../components/tooltip/tooltip-pointer'
import { ChartReadoutCard, ChartReadoutRow, ReadoutSwatch } from '../engine/chart-readout-card'
import { readoutCell } from '../engine/chart-series'
import { useChartHover } from '../engine/context'
import { NO_DATA_TEXT } from './heatmap-chart-cells'

/** Props for {@link HeatmapChartTooltip}: the plot it anchors in, and the labels and values a cell reads. @internal */
type HeatmapChartTooltipProps = {
	/** The plot region. The hover point is in its frame, as the shared tooltip reads it. */
	plotRef: RefObject<HTMLDivElement | null>
	columns: string[]
	rows: string[]
	values: (number | null)[][]
	format: (value: number) => string
	fills: (string | null)[]
}

/**
 * The hover readout: one cell's row and column labels and its value, in the
 * real Tooltip chrome through {@link TooltipPointer}. It anchors at the pointer,
 * or at the cell center under the keyboard cursor. The frame mounts it in place
 * of the shared tooltip. A pointer enhancement, `aria-hidden` by design: the
 * same values ship in the visually-hidden table.
 *
 * @internal
 */
export function HeatmapChartTooltip({
	plotRef,
	columns,
	rows,
	values,
	format,
	fills,
}: HeatmapChartTooltipProps) {
	const { index, point } = useChartHover()

	const cols = columns.length

	// A pinned cell keeps its index when the grid shrinks under it. An index past
	// the grid reads nothing, so the tooltip closes.
	const cell = index !== null && index < rows.length * cols ? index : null

	const open = cell !== null && point !== null

	// The card holds across the moves inside one cell, so a move repositions the
	// panel and renders no row.
	const card = useMemo(() => {
		if (cell === null) return null

		const row = Math.floor(cell / cols)

		const col = cell % cols

		const fill = fills[cell] ?? null

		return (
			<ChartReadoutCard title={columns[col]}>
				<ChartReadoutRow
					swatch={
						<ReadoutSwatch
							shape="rect"
							className={fill === null ? NO_DATA_TEXT : undefined}
							color={fill ?? undefined}
						/>
					}
					value={readoutCell(values[row]?.[col], format)}
					label={rows[row]}
				/>
			</ChartReadoutCard>
		)
	}, [cell, cols, columns, rows, values, format, fills])

	// `track="point"` under both triggers, as the shared tooltip sets it. A pin
	// anchors to the point of this render, so `autoUpdate` would re-place it at
	// that viewport point on a window scroll, off its cell. Without `autoUpdate`,
	// the pin keeps its document position and scrolls with the cell.
	return (
		<TooltipPointer open={open} point={point} originRef={plotRef} track="point" size="sm">
			{card}
		</TooltipPointer>
	)
}
