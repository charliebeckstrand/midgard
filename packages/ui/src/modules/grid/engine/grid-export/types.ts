import type { ReactNode } from 'react'
import type { GridColumn, GridToolSurfaces } from '../../types'

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
 * export. The rows are the selected rows when a {@link GridDataProps.selection}
 * is active, else the grid's filtered/sorted set (all pages) — unless
 * {@link GridDataProps.exportRows} supplies its own set, which then wins
 * outright (see there for the server-pagination case).
 *
 * @typeParam T - Shape of a single row.
 */
export type GridExportContext<T> = {
	columns: GridColumn<T>[]
	rows: T[]
}

/**
 * A consumer-supplied source for the rows to export, overriding the grid's own
 * filtered/sorted set. Returns the full list synchronously, or a promise of it
 * for a server round-trip — the sole hook the export pipeline awaits before
 * handing the rows to any exporter.
 *
 * @typeParam T - Shape of a single row.
 * @see {@link GridDataProps.exportRows}
 */
export type GridExportRows<T> = () => T[] | Promise<T[]>

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
 * The object form of {@link GridDataProps.exportable}: the types to offer, plus
 * the surfaces that offer them. Reach for it to split the two apart — an
 * "Export" toolbar dropdown with no menu items, or the reverse; the array and
 * boolean forms take the {@link GridToolSurfaces} defaults.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridExportConfig<T> = GridToolSurfaces & {
	/**
	 * The export types to offer, in order — the same entry list the array form
	 * takes.
	 * @defaultValue `['csv', 'excel']`
	 */
	types?: GridExportEntry<T>[]
}

/**
 * Every form {@link GridDataProps.exportable} accepts: `false` to disable
 * export, `true` for the full built-in set, an entry array to pick the types, or
 * a {@link GridExportConfig} to pick the types *and* the surfaces they appear
 * on.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridExportable<T> = boolean | GridExportEntry<T>[] | GridExportConfig<T>

/**
 * A resolved, ready-to-run export action — one per configured
 * {@link GridExportEntry}, in order. Backs the export items the toolbar and
 * context-menu builders render, and is handed to a `contextMenu.column` /
 * `contextMenu.cell` builder as {@link GridColumnMenuContext.exportActions} /
 * {@link GridCellMenuContext.exportActions}.
 *
 * `run` returns nothing for a synchronous export, or the in-flight promise
 * when the rows come from an async {@link GridDataProps.exportRows} round-trip
 * — settling once the export has fired (or its fetch failed), so a caller can
 * reflect the pending state.
 *
 * Inside a grid it already is reflected: the grid counts its own in-flight
 * exports around every action, whichever surface ran it, and shows an
 * "Exporting" overlay for the wait (the toolbar trigger, when there is one,
 * swaps its download icon for a spinner from the same count). A builder handed
 * these actions can call `run` and leave the feedback to the grid; only an
 * out-of-grid caller — see {@link useGridExportActions}, which reports the same
 * state as `pending` — has to render its own.
 */
export type GridExportAction = {
	type: GridExportType
	label: ReactNode
	run: () => void | Promise<void>
}
