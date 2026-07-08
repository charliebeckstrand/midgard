import { downloadCsv, rowsToCsv } from './export-csv'
import { downloadExcel, rowsToXlsx } from './export-excel'
import { printRows } from './export-print'
import type { GridExportContext, GridExportType } from './types'

/** The default `exportable` set for the boolean shorthand (`exportable={true}`). @internal */
export const DEFAULT_EXPORT_TYPES: GridExportType[] = ['csv', 'excel', 'print']

/** Menu/toolbar label for each built-in export type. @internal */
export const BUILTIN_EXPORT_LABEL: Record<'csv' | 'excel' | 'print', string> = {
	csv: 'Export to CSV',
	excel: 'Export to Excel',
	print: 'Print',
}

/**
 * The built-in exporter for each shipped {@link GridExportType}: `csv` and
 * `excel` trigger a client-side download, `print` opens the browser print
 * dialog over the same rows. Adding a shipped type is one entry here (plus its
 * own file alongside `csv.ts` / `excel.ts` / `print.ts`) — nothing else in the
 * module changes; a consumer-defined type instead supplies its own
 * `onExport` (see {@link GridExportTypeConfig}), bypassing this registry
 * entirely.
 *
 * @internal
 */
export const BUILTIN_EXPORTERS: Record<
	'csv' | 'excel' | 'print',
	<T>(context: GridExportContext<T>) => void
> = {
	csv: (context) => downloadCsv('grid.csv', rowsToCsv(context.columns, context.rows)),
	excel: (context) => downloadExcel('grid.xlsx', rowsToXlsx(context.columns, context.rows)),
	print: (context) => printRows(context.columns, context.rows),
}
