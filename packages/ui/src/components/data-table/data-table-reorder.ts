/**
 * Splices a reordered subset of column ids back into the full column order,
 * holding every id the `isReorderable` predicate rejects (selection, actions,
 * pinned, or hidden columns) in its existing slot.
 *
 * Shared by the column-manager list and the header drag handles so both commit
 * identical orderings: each walks the full `order` and, wherever a slot is
 * reorderable, draws the next id from `reorderedIds` in sequence.
 *
 * @param order - Full column order: every column id, in display order.
 * @param reorderedIds - The reorderable ids in their new relative order; its
 * length must equal the number of reorderable slots in `order`.
 * @param isReorderable - Marks which ids participate in the reorder.
 * @returns The next full order with reorderable slots repermuted and every other
 * id held in place.
 * @internal
 */
export function applyColumnReorder(
	order: (string | number)[],
	reorderedIds: (string | number)[],
	isReorderable: (id: string | number) => boolean,
): (string | number)[] {
	const next: (string | number)[] = []

	let idx = 0

	for (const id of order) {
		if (isReorderable(id)) {
			next.push(reorderedIds[idx] as string | number)

			idx++
		} else {
			next.push(id)
		}
	}

	return next
}
