import { downloadCsv } from '../../../../utilities/export-output'
import { rowsToCsv } from './csv'
import { printRows } from './print'
import type { GridExportContext, GridExportType } from './types'

/** The default `exportable` set for the boolean shorthand (`exportable={true}`). @internal */
export const DEFAULT_EXPORT_TYPES: GridExportType[] = ['csv', 'excel', 'print']

/**
 * The `exportable` set applied when the prop is omitted: CSV and Excel download,
 * on by default. Print stays opt-in — reach it with `exportable={true}` (the
 * full {@link DEFAULT_EXPORT_TYPES} set) or an explicit entry array. A stable
 * module-level constant so the omitted-prop default keeps a fixed identity
 * across renders.
 *
 * @internal
 */
export const DEFAULT_EXPORTABLE: GridExportType[] = ['csv', 'excel']

/** Menu/toolbar label for each built-in export type. @internal */
export const BUILTIN_EXPORT_LABEL: Record<'csv' | 'excel' | 'print', string> = {
	csv: 'Export to CSV',
	excel: 'Export to Excel',
	print: 'Print',
}

/** The Excel serializer, held after its first load. @internal */
let excelModule: typeof import('./excel') | undefined

/**
 * Downloads the rows as a workbook. The serializer and its zip library load on
 * the first Excel export, because a grid that never exports to Excel does not
 * need them. The first export therefore returns a promise, and the grid shows
 * its "Exporting" overlay while the code loads. Later exports run synchronously.
 *
 * @internal
 */
function exportExcel<T>(context: GridExportContext<T>): void | Promise<void> {
	const run = (excel: typeof import('./excel')) =>
		excel.downloadExcel('grid.xlsx', excel.rowsToXlsx(context.columns, context.rows))

	if (excelModule) return run(excelModule)

	return import('./excel').then((excel) => {
		excelModule = excel

		run(excel)
	})
}

/**
 * The built-in exporter for each shipped {@link GridExportType}: `csv` and
 * `excel` trigger a client-side download, `print` opens the browser print
 * dialog over the same rows. Adding a shipped type is one entry here (plus its
 * own file alongside `csv.ts` / `excel.ts` / `print.ts`), and nothing else in
 * the module changes. A consumer-defined type instead supplies its own
 * `onExport` (see {@link GridExportTypeConfig}), bypassing this registry
 * entirely.
 *
 * @internal
 */
export const BUILTIN_EXPORTERS: Record<
	'csv' | 'excel' | 'print',
	<T>(context: GridExportContext<T>) => void | Promise<void>
> = {
	csv: (context) => downloadCsv('grid.csv', rowsToCsv(context.columns, context.rows)),
	excel: exportExcel,
	print: (context) => printRows(context.columns, context.rows),
}
