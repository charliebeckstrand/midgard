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

/**
 * Downloads the rows as a workbook. The serializer and its zip library load on
 * the first Excel export, because a grid that never exports to Excel does not
 * need them. The workbook is then written over many tasks. The export
 * therefore returns a promise, and the grid shows its "Exporting" overlay
 * until the download starts.
 *
 * @internal
 */
async function exportExcel<T>(context: GridExportContext<T>): Promise<void> {
	const excel = await import('./excel')

	excel.downloadExcel('grid.xlsx', await excel.rowsToXlsxInSteps(context.columns, context.rows))
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
