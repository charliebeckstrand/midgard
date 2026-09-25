import { createKeyedStore } from '../../../../utilities'

/**
 * The settled width of each column, as a store that a cell subscribes to for
 * its own column only.
 *
 * @remarks
 * A column resize moves the width of a cell through the `<colgroup>` alone, so
 * no cell renders again. A cell that shows a truncation reveal must then read
 * its overflow again. The grid publishes the settled widths after each commit.
 * The store then calls only the listeners of the columns whose width changed. A
 * resize therefore reaches the cells of the resized column, and no row renders
 * again. A width is `undefined` while a drag is in flight, so the listeners run
 * when the drag settles, not on each frame of it.
 *
 * The store also holds whether a drag is in flight. A cell reads that flag when
 * it measures, and only a cell that shows a reveal subscribes to it. The start
 * and the end of a drag therefore do not render each cell again.
 *
 * @internal
 */
export type GridSettleStore = {
	/** The settled width of a column, or `undefined` in a drag or for a column with none. */
	get: (columnId: string) => number | undefined
	/** Calls `listener` each time the settled width of `columnId` changes. */
	subscribe: (columnId: string, listener: () => void) => () => void
	/** Whether a column drag-resize is in flight. */
	resizing: () => boolean
	/** Calls `listener` each time a drag-resize starts or ends. */
	subscribeResizing: (listener: () => void) => () => void
	/**
	 * Takes the settled widths and the drag state of a commit. It calls the
	 * listeners of the drag state first, then the listeners of each changed
	 * column, so a measure reads the new drag state.
	 */
	publish: (widths: ReadonlyMap<string, number | undefined>, resizing: boolean) => void
}

/** A new, empty {@link GridSettleStore}. @internal */
export function createSettleStore(): GridSettleStore {
	const widths = createKeyedStore<string, number | undefined>(() => undefined)

	let dragging = false

	const resizingListeners = new Set<() => void>()

	return {
		get: widths.get,
		subscribe: widths.subscribe,
		resizing: () => dragging,
		subscribeResizing: (listener) => {
			resizingListeners.add(listener)

			return () => {
				resizingListeners.delete(listener)
			}
		},
		publish: (next, resizing) => {
			const wasResizing = dragging

			dragging = resizing

			if (wasResizing !== resizing) for (const listener of [...resizingListeners]) listener()

			widths.publish((columnId) => next.get(columnId))
		},
	}
}
