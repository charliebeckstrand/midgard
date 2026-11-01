import { useDevWarning } from '../../hooks/use-dev-warning'
import type { GridEditableConfig } from './grid-editing-types'

/**
 * The warning for `scope: 'cell'` without the grid-owned session that it
 * narrows. The pair is inert rather than wrong, because the row's editors
 * mount as under row scope. @internal
 */
const CELL_SCOPE_WITHOUT_SESSION_WARNING =
	"Grid: `editable.scope: 'cell'` narrows a session the grid owns, but `editable.session` is 'manual', where the consumer names a row and never a cell. The row's editors all mount, as under scope 'row'. Set `session: 'managed'` to scope a session to one cell."

/**
 * The warning for `cell` or `defaultCell` outside the cell-scoped, grid-owned
 * session that it binds. The binding is inert there. @internal
 */
const ACTIVE_CELL_WITHOUT_SCOPE_WARNING =
	"Grid: `editable.cell` and `editable.defaultCell` bind the cell of a cell-scoped session, and this grid has none. The binding has no effect. Set `session: 'managed'` and `scope: 'cell'` to bind the cell."

/** The development warning for a consumer's cell that is not editable. @internal */
export const UNEDITABLE_CELL_WARNING =
	'Grid: `editable.cell` names a cell that is not editable. Its row is unknown, or its column is `readOnly` or has no `field` or `editCell`. The cell reads as null and mounts no editor.'

/**
 * Warns in development for each editing setting that the config makes inert:
 * `scope: 'cell'` without a grid-owned session, and `cell` or `defaultCell`
 * without a cell-scoped session. @internal
 */
export function useGridEditingWarnings(args: {
	enabled: boolean
	config: GridEditableConfig | undefined
	managed: boolean
	scopeRequested: boolean
	cellScoped: boolean
}): void {
	const { enabled, config, managed, scopeRequested, cellScoped } = args

	useDevWarning(scopeRequested && !managed, CELL_SCOPE_WITHOUT_SESSION_WARNING)

	useDevWarning(
		enabled && (config?.cell !== undefined || config?.defaultCell !== undefined) && !cellScoped,
		ACTIVE_CELL_WITHOUT_SCOPE_WARNING,
	)
}
