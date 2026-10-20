'use client'

import { loadListReorder } from '../../components/list/use-list-reorder'
import { useLazyModule } from '../../hooks/use-lazy-module'
import { createLazyModule } from '../../utilities/lazy-module'
import { noop } from '../../utilities/noop'
import type { GridDataDialogsProps } from './grid-data-dialogs-body'

/**
 * The module of the dialogs. It carries the managers, their drag and drop, and
 * the dialog surface, so a grid that opens no dialog does not load it.
 *
 * The load also gets the reorder parts of `List`, in parallel. The lists
 * of the managers then render the `Reorder` group in their first render. Without
 * this, each list gets the parts after it mounts, in a second round trip, and
 * React then mounts its rows again.
 *
 * @internal
 */
const dialogs = createLazyModule(() =>
	Promise.all([import('./grid-data-dialogs-body'), loadListReorder()]).then(([body]) => body),
)

/**
 * Loads the module of the dialogs. Tests call it before a case that opens a
 * dialog. @internal
 */
export const loadGridDataDialogs = dialogs.load

/**
 * Starts the load of the module of the dialogs, and gives no error when it
 * fails. A trigger calls it on a hover or a focus, so the load is in flight
 * before the press. @internal
 */
export function preloadDataDialogs(): void {
	dialogs.load().catch(noop)
}

/**
 * The dialogs of {@link GridData}. A request to open one loads the module of
 * the dialogs, and the dialog then mounts open, so it opens in one step. After
 * the load the module stays mounted, so a closing dialog plays its exit.
 *
 * @remarks If the load fails, each requested dialog closes, so its trigger can
 * try again. The error goes on to the error reporting of the app.
 * @internal
 */
export function GridDataDialogs(props: GridDataDialogsProps) {
	const { columnManager, rowManager, widthConfirm } = props

	const requested = !!columnManager?.open || rowManager.open || !!widthConfirm?.open

	const body = useLazyModule(dialogs, requested, () => {
		columnManager?.onOpenChange(false)

		rowManager.setOpen(false)

		widthConfirm?.onOpenChange(false)
	})

	return body ? <body.GridDataDialogsBody {...props} /> : null
}
