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
 * @internal
 */
export type GridSettleStore = {
	/** The settled width of a column, or `undefined` in a drag or for a column with none. */
	get: (columnId: string) => number | undefined
	/** Calls `listener` each time the settled width of `columnId` changes. */
	subscribe: (columnId: string, listener: () => void) => () => void
	/** Takes the settled widths of a commit, and calls the listeners of each changed column. */
	publish: (widths: ReadonlyMap<string, number | undefined>) => void
}

/** A new, empty {@link GridSettleStore}. @internal */
export function createSettleStore(): GridSettleStore {
	let current: ReadonlyMap<string, number | undefined> = new Map()

	const listeners = new Map<string, Set<() => void>>()

	return {
		get: (columnId) => current.get(columnId),
		subscribe: (columnId, listener) => {
			let set = listeners.get(columnId)

			if (!set) {
				set = new Set()

				listeners.set(columnId, set)
			}

			set.add(listener)

			return () => {
				set.delete(listener)

				if (set.size === 0) listeners.delete(columnId)
			}
		},
		publish: (widths) => {
			const previous = current

			current = widths

			for (const [columnId, set] of listeners) {
				if (Object.is(previous.get(columnId), widths.get(columnId))) continue

				for (const listener of [...set]) listener()
			}
		},
	}
}
