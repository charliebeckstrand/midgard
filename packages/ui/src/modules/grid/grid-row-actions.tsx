'use client'

import type { ReactNode } from 'react'
import { useGridEditingSessionOrNull } from './grid-editing-context'
import type { GridRowActionsContext } from './grid-editing-types'

/** Does nothing, for a grid with no editing to end. @internal */
function noop(): void {}

/**
 * Renders a row's {@link GridColumn.actions} slot with its editing context.
 *
 * @remarks The slot renders in every grid, editable or not, so it reads the
 * session optionally and reports `editing: false` where there is none — an
 * actions column then needs no guard against a binding it may not have. `save`
 * and `discard` are the same exit the grid's own keys take, which is what keeps
 * a consumer's control and an editor's Enter ending a row the same way.
 *
 * @internal
 */
export function GridRowActions<T>({
	render,
	row,
	rowKey,
}: {
	render: (row: T, context: GridRowActionsContext) => ReactNode
	row: T
	rowKey: string | number
}) {
	const session = useGridEditingSessionOrNull()

	const context: GridRowActionsContext = session
		? {
				editing: session.editableRows.has(rowKey),
				save: () => session.endSession(rowKey, 'save'),
				discard: () => session.endSession(rowKey, 'discard'),
			}
		: { editing: false, save: noop, discard: noop }

	return render(row, context)
}
