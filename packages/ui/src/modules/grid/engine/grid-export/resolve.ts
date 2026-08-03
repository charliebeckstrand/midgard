import type { GridToolSurfaces } from '../../types'
import { DEFAULT_SURFACES, resolveToolSurfaces, SURFACES_OFF } from '../grid-tools'
import {
	BUILTIN_EXPORT_LABEL,
	BUILTIN_EXPORTERS,
	DEFAULT_EXPORT_TYPES,
	DEFAULT_EXPORTABLE,
} from './registry'
import type {
	GridExportAction,
	GridExportable,
	GridExportContext,
	GridExportEntry,
	GridExportType,
} from './types'

/**
 * The entries `exportable` names: none when off, the full built-in set for the
 * `true` shorthand, the array itself, or a config's `types` — which falls back
 * to the same CSV + Excel set an omitted prop takes, so adding a surface switch
 * never quietly adds print.
 *
 * @internal
 */
function resolveEntries<T>(exportable: GridExportable<T> | undefined): GridExportEntry<T>[] {
	if (!exportable) return []

	if (exportable === true) return DEFAULT_EXPORT_TYPES

	if (Array.isArray(exportable)) return exportable

	return exportable.types ?? DEFAULT_EXPORTABLE
}

/**
 * The surfaces `exportable` offers its actions on: none when off, the tool
 * {@link DEFAULT_SURFACES} for the boolean and array forms, and only the config
 * form naming its own. Reads the union exactly as {@link resolveEntries} does,
 * so a fifth form is taught to both the same way.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function resolveExportSurfaces<T>(
	exportable: GridExportable<T> | undefined,
): Required<GridToolSurfaces> {
	if (!exportable) return SURFACES_OFF

	if (exportable === true || Array.isArray(exportable)) return DEFAULT_SURFACES

	return resolveToolSurfaces(exportable)
}

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
	getContext: () => GridExportContext<T> | Promise<GridExportContext<T>>,
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

	return {
		type,
		label,
		run: () => {
			const context = getContext()

			// A synchronous context (the grid's own rows) runs the exporter inline,
			// preserving the click-time download; a promised one (an
			// {@link GridDataProps.exportRows} server round-trip) defers it until
			// the rows land, surfacing a failed fetch as a dev-only warning rather
			// than an unhandled rejection. The chain is returned so a caller can
			// track the in-flight export (see {@link GridExportAction.run}).
			if (context instanceof Promise) {
				return context.then(exporter).catch((error) => {
					if (process.env.NODE_ENV !== 'production') {
						console.error(`Grid: export type "${type}" failed to resolve its rows.`, error)
					}
				})
			}

			return exporter(context)
		},
	}
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
	getContext: () => GridExportContext<T> | Promise<GridExportContext<T>>,
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
 * default `csv` + `excel` + `print` set), an explicit {@link GridExportEntry}
 * array, or a {@link GridExportConfig} naming its own `types` — into one
 * ready-to-run action per entry, in order. Each action's `run` calls the entry's
 * `onExport` override when given, else the built-in exporter for a shipped type;
 * an entry naming neither (an unknown type with no `onExport`) is dropped (see
 * {@link resolveAction}). Which surfaces offer these actions is a separate
 * question — see {@link resolveExportSurfaces}.
 *
 * @typeParam T - Shape of a single row.
 * @param exportable - The grid's `exportable` prop.
 * @param getContext - Builds the {@link GridExportContext} lazily, so it only
 * runs when an action actually fires.
 * @internal
 */
export function resolveExportActions<T>(
	exportable: GridExportable<T> | undefined,
	getContext: () => GridExportContext<T> | Promise<GridExportContext<T>>,
): GridExportAction[] {
	return resolveEntries(exportable).flatMap((entry) => resolveEntry(entry, getContext))
}
