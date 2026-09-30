import { useDevWarning } from '../../hooks/use-dev-warning'
import type { GridEditableConfig } from './grid-editing-types'

/** The commit policy of a grid-owned session, {@link GridEditableConfig.commitOn}. @internal */
export type CommitOn = NonNullable<GridEditableConfig['commitOn']>

/**
 * The warning for `scope: 'cell'` without the grid-owned session that it
 * narrows. The pair is inert rather than wrong, because the row's editors
 * mount as under row scope. @internal
 */
const CELL_SCOPE_WITHOUT_SESSION_WARNING =
	"Grid: `editable.scope: 'cell'` narrows a session the grid owns, but `editable.session` is 'manual', where the consumer names a row and never a cell. The row's editors all mount, as under scope 'row' — set `session: 'managed'` to scope a session to one cell."

/**
 * The warning for `cell` or `defaultCell` outside the cell-scoped, grid-owned
 * session that it binds. The binding is inert there. @internal
 */
const ACTIVE_CELL_WITHOUT_SCOPE_WARNING =
	"Grid: `editable.cell` and `editable.defaultCell` bind the cell of a cell-scoped session, and this grid has none. The binding has no effect — set `session: 'managed'` and `scope: 'cell'` to bind the cell."

/**
 * The warning for a `commitOn` that asks for more than `'explicit'` without the
 * grid-owned session that it commits. The consumer owns every exit there. @internal
 */
const COMMIT_ON_WITHOUT_SESSION_WARNING =
	"Grid: `editable.commitOn` commits a session that the grid owns, but `editable.session` is 'manual', where you own every exit. The setting has no effect — set `session: 'managed'` to commit a session on leave."

/**
 * The commit policy that applies, from the policy the config asks for. The
 * commit on leave needs a session that the grid owns. Under `'manual'` the
 * consumer owns every exit, so the policy reads as `'explicit'`, and a policy
 * that asks for more warns in development. @internal
 */
export function useCommitOn(requested: CommitOn | undefined, managed: boolean): CommitOn {
	const asked = requested ?? 'explicit'

	useDevWarning(asked !== 'explicit' && !managed, COMMIT_ON_WITHOUT_SESSION_WARNING)

	return managed ? asked : 'explicit'
}

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
