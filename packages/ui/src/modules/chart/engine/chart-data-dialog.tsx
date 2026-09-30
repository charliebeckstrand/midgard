'use client'

import { useRef } from 'react'
import { Button } from '../../../components/button'
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogFooter,
	DialogTitle,
} from '../../../components/dialog'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../../../components/table'
import { rangeKeys } from '../../../utilities'
import type { ChartReadoutSource } from './types'

/** Props for {@link ChartDataDialog}. @internal */
export type ChartDataDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The values behind the marks. The dialog reads them only while it is open. */
	readout: ChartReadoutSource
	/** The chart title, which names the dialog. */
	title?: string
}

/**
 * A dialog that shows the values of a chart as a table: one row for each
 * category, and one column for each series. It is the "View data" action of
 * the chart menu. On a touch screen it is the way to read exact values, because
 * a tooltip under a finger is hard to read.
 *
 * The table has the same cells as the visually hidden table of the chart, and
 * it reads the same cached readout. The dialog builds the table only while it
 * is open.
 *
 * @internal
 */
export function ChartDataDialog({ open, onOpenChange, readout, title }: ChartDataDialogProps) {
	const closeRef = useRef<HTMLButtonElement>(null)

	return (
		<Dialog open={open} onOpenChange={onOpenChange} initialFocus={closeRef}>
			<DialogTitle>{title ?? 'Chart data'}</DialogTitle>

			<DialogBody>{open && <ChartDataTable readout={readout} />}</DialogBody>

			<DialogFooter>
				<DialogClose>
					<Button type="button" ref={closeRef}>
						Close
					</Button>
				</DialogClose>
			</DialogFooter>
		</Dialog>
	)
}

/** The table of {@link ChartDataDialog}. @internal */
function ChartDataTable({ readout: source }: { readout: ChartReadoutSource }) {
	const readout = source()

	if (readout === null) return null

	return (
		<Table size="sm" striped>
			<TableHead>
				<TableRow>
					<TableHeader />

					{readout.rows.map((row, index) => (
						<TableHeader key={row.index ?? index} className="text-end">
							{row.label}
						</TableHeader>
					))}
				</TableRow>
			</TableHead>

			<TableBody>
				{rangeKeys(readout.categories.length, 'category').map((key, index) => (
					<TableRow key={key}>
						<TableHeader scope="row">{readout.categories[index]}</TableHeader>

						{readout.rows.map((row, column) => (
							<TableCell key={row.index ?? column} className="text-end tabular-nums">
								{row.values[index]}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
