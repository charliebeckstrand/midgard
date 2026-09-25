'use client'

import { type ReactNode, useCallback, useSyncExternalStore } from 'react'
import { useGridEditingSessionOrNull } from './grid-editing-context'
import type { GridRowActionsContext } from './grid-editing-types'

/** Does nothing, for a grid with no editing to end. @internal */
function noop(): void {}

/** Subscribes to nothing, for a grid with no editing. @internal */
const subscribeNone = () => noop

/**
 * Renders a row's {@link GridColumn.actions} slot with its editing context.
 *
 * @remarks The slot renders in every grid, editable or not, so it reads the
 * session optionally and reports `editing: false` where there is none. An
 * actions column then needs no guard against a binding it can lack. `save`
 * and `discard` are the same exit the grid's own keys take. That is what keeps
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

	const store = session?.activeEditStore

	// The row's own flag, so a row that opens or closes renders its own slot.
	const readEditing = useCallback(() => store?.rows().has(rowKey) ?? false, [store, rowKey])

	const editing = useSyncExternalStore(store?.subscribe ?? subscribeNone, readEditing, readEditing)

	const context: GridRowActionsContext = session
		? {
				editing,
				save: () => session.endSession(rowKey, 'save'),
				discard: () => session.endSession(rowKey, 'discard'),
			}
		: { editing: false, save: noop, discard: noop }

	return render(row, context)
}
