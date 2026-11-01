import { useDevWarning } from '../../hooks/use-dev-warning'
import type { GridEditableConfig } from './grid-editing-types'

/**
 * The warning for a `commitOn` that asks for more than `'explicit'` without the
 * grid-owned session that it commits. The consumer owns every exit there. @internal
 */
const COMMIT_ON_WITHOUT_SESSION_WARNING =
	"Grid: `editable.commitOn` commits a session that the grid owns, but `editable.session` is 'manual', where you own every exit. The setting has no effect. Set `session: 'managed'` to commit a session on leave."

/** The commit policy of a grid-owned session, {@link GridEditableConfig.commitOn}. @internal */
export type CommitOn = NonNullable<GridEditableConfig['commitOn']>

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
