'use client'

import { useLazyModule } from '../../hooks/use-lazy-module'
import { createLazyModule } from '../../utilities/lazy-module'
import type { GridDataDialogsProps } from './grid-data-dialogs-body'

/**
 * The module of the dialogs. It carries the managers, their drag and drop, and
 * the dialog surface, so a grid that opens no dialog does not load it.
 *
 * @internal
 */
const dialogs = createLazyModule(() => import('./grid-data-dialogs-body'))

/**
 * Loads the module of the dialogs. Tests call it before a case that opens a
 * dialog. @internal
 */
export const loadGridDataDialogs = dialogs.load

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
