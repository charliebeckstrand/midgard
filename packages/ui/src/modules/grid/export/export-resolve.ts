import { BUILTIN_EXPORT_LABEL, BUILTIN_EXPORTERS, DEFAULT_EXPORT_TYPES } from './export-registry'
import type { GridExportAction, GridExportContext, GridExportEntry, GridExportType } from './types'

/** Whether `type` names one of the shipped exporters (has a built-in and a default label). @internal */
function isBuiltinType(type: GridExportType): type is keyof typeof BUILTIN_EXPORTERS {
	return type in BUILTIN_EXPORTERS
}

/**
 * Builds one action for `type`, or `null` when it names neither a built-in type
 * nor an `onExport` — logging a dev-only warning in that case, since a
 * right-click menu or toolbar button is the wrong place to surface a config
 * mistake.
 *
 * @internal
 */
function buildAction<T>(
	type: GridExportType,
	onExport: ((context: GridExportContext<T>) => void) | undefined,
	getContext: () => GridExportContext<T>,
): GridExportAction | null {
	const builtin = isBuiltinType(type) ? BUILTIN_EXPORTERS[type] : undefined

	const exporter = onExport ?? builtin

	if (!exporter) {
		if (process.env.NODE_ENV !== 'production') {
			console.warn(`Grid: export type "${type}" has no built-in exporter and no onExport.`)
		}

		return null
	}

	const label = isBuiltinType(type) ? BUILTIN_EXPORT_LABEL[type] : `Export to ${type}`

	return { type, label, run: () => exporter(getContext()) }
}

/**
 * Resolves one entry to its action(s): a bare string names a single built-in,
 * while an object contributes one action per type key it carries — so an entry
 * overriding several types at once resolves them all rather than dropping every
 * key but the first.
 *
 * @internal
 */
function resolveEntry<T>(
	entry: GridExportEntry<T>,
	getContext: () => GridExportContext<T>,
): GridExportAction[] {
	if (typeof entry === 'string') {
		const action = buildAction(entry, undefined, getContext)

		return action ? [action] : []
	}

	return (Object.keys(entry) as GridExportType[]).flatMap((type) => {
		const action = buildAction(type, entry[type]?.onExport, getContext)

		return action ? [action] : []
	})
}

/**
 * Normalizes the `exportable` prop — `false`/`undefined` (off), `true` (the
 * default `csv` + `excel` + `print` set), or an explicit {@link GridExportEntry}
 * array — into one ready-to-run action per entry, in order. Each action's `run`
 * calls the entry's `onExport` override when given, else the built-in exporter
 * for a shipped type; an entry naming neither (an unknown type with no
 * `onExport`) is dropped (see {@link resolveAction}).
 *
 * @typeParam T - Shape of a single row.
 * @param exportable - The grid's `exportable` prop.
 * @param getContext - Builds the {@link GridExportContext} lazily, so it only
 * runs when an action actually fires.
 * @internal
 */
export function resolveExportActions<T>(
	exportable: boolean | GridExportEntry<T>[] | undefined,
	getContext: () => GridExportContext<T>,
): GridExportAction[] {
	if (!exportable) return []

	const entries = exportable === true ? DEFAULT_EXPORT_TYPES : exportable

	return entries.flatMap((entry) => resolveEntry(entry, getContext))
}
