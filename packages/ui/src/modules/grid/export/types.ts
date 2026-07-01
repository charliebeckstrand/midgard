import type { ReactNode } from 'react'
import type { GridColumn } from '../types'

/**
 * An export format's identifier: one of the built-ins shipped in this folder
 * (`csv.ts` / `excel.ts` / `print.ts`) or a consumer-defined string naming a
 * custom exporter (see {@link GridExportTypeConfig.onExport}).
 *
 * @see {@link GridDataProps.exportable}
 */
export type GridExportType = 'csv' | 'excel' | 'print' | (string & {})

/**
 * The data an export type serializes: the visible data columns and the rows to
 * export — the selected rows when a {@link GridDataProps.selection} is active,
 * else the grid's filtered/sorted set (all pages).
 *
 * @typeParam T - Shape of a single row.
 */
export type GridExportContext<T> = {
	columns: GridColumn<T>[]
	rows: T[]
}

/**
 * Per-type override for an entry in {@link GridExportEntry}. `onExport`
 * replaces the built-in exporter for a shipped type (`csv` / `excel` /
 * `print`), and is required for any other type, which has no built-in to fall
 * back to.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridExportTypeConfig<T> = {
	onExport?: (context: GridExportContext<T>) => void
}

/**
 * One entry in the {@link GridDataProps.exportable} array: a bare
 * {@link GridExportType} runs its built-in exporter, or a single-key object
 * overrides (or, for a custom type, supplies) that type's `onExport`.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridExportEntry<T> =
	| GridExportType
	| Partial<Record<GridExportType, GridExportTypeConfig<T>>>

/**
 * A resolved, ready-to-run export action — one per configured
 * {@link GridExportEntry}, in order. Backs the export items the toolbar and
 * context-menu builders render, and is handed to a `contextMenu.column` /
 * `contextMenu.cell` builder as {@link GridColumnMenuContext.exportActions} /
 * {@link GridCellMenuContext.exportActions}.
 */
export type GridExportAction = {
	type: GridExportType
	label: ReactNode
	run: () => void
}
