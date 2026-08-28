/**
 * What the board does with a drop.
 *
 * `Kanban` emits an insert: a card dragged from Monday to Tuesday leaves Tuesday
 * holding two meals and Monday holding none. That is right for a board of
 * backlogs and wrong for a week, where the two days are trading places rather
 * than one growing at the other's expense.
 *
 * So the board reads the emission rather than trusting it. This module diffs the
 * columns before and after, works out which card the reader moved and what was
 * already in the slot they moved it to, and answers with the days to write.
 *
 * It is pure, and it answers in the shape the store takes, so the board hands it
 * straight on.
 */

import type { DayEntries } from '../types'

/** One card on the board: a planned meal, by its own id and the recipe it names. */
export type PlanCard = {
	id: string
	recipeId: string
}

/** One day column of the board. The `id` is the day, `YYYY-MM-DD`. */
export type DayColumn = {
	id: string
	items: PlanCard[]
}

/** A column's cards as entries. */
function entriesOf(items: readonly PlanCard[]): DayEntries['entries'] {
	return items.map((item) => ({ id: item.id, recipeId: item.recipeId }))
}

/** Two orders of the same cards, compared by id. */
function sameOrder(left: readonly PlanCard[], right: readonly PlanCard[]): boolean {
	return left.length === right.length && left.every((item, at) => item.id === right[at]?.id)
}

/** Which day each card sat in before the drop. */
function daysBefore(prev: readonly DayColumn[]): Map<string, string> {
	const days = new Map<string, string>()

	for (const column of prev) for (const item of column.items) days.set(item.id, column.id)

	return days
}

/** The card the reader moved between columns, and where it landed. */
function movedCard(
	prev: readonly DayColumn[],
	next: readonly DayColumn[],
): { id: string; from: string; to: string; at: number } | null {
	const before = daysBefore(prev)

	for (const column of next) {
		for (const [at, item] of column.items.entries()) {
			const from = before.get(item.id)

			if (from !== undefined && from !== column.id) {
				return { id: item.id, from, to: column.id, at }
			}
		}
	}

	return null
}

/** A column by day, from either side of the drop. */
function columnOf(columns: readonly DayColumn[], day: string): DayColumn | undefined {
	return columns.find((column) => column.id === day)
}

/**
 * The days to write after a drop, or nothing where the drop changed nothing.
 *
 * Three outcomes, and which one applies is decided by what was already sitting in
 * the slot the card landed in:
 *
 * - **Reorder** — the card stayed in its day. That day is written in its new
 *   order.
 * - **Insert** — the card crossed into a slot nothing occupied: the end of a
 *   day, or an empty one. Both days are written as the board has them.
 * - **Swap** — the card crossed onto an occupied slot. The two trade places: the
 *   card takes the slot, and what was in it takes the card's own place in the day
 *   it came from.
 *
 * A swap is the answer a week wants and an insert is the answer a backlog wants,
 * which is why it is read from the slot rather than set as a mode. Dropping on a
 * meal trades with it; dropping below one adds to that day.
 *
 * @param prev The columns as they were before the drop.
 * @param next The columns as `Kanban` emitted them.
 * @returns One entry per day that changed, ready for the store. Empty where
 *   nothing moved.
 */
export function resolveMove(prev: readonly DayColumn[], next: readonly DayColumn[]): DayEntries[] {
	const moved = movedCard(prev, next)

	if (moved === null) {
		// Nothing crossed a day, so every column that reads differently is a
		// reorder within itself. Usually one; never more, but written as a filter
		// rather than a find so it cannot silently drop the second.
		return next
			.filter((column) => {
				const before = columnOf(prev, column.id)

				return before !== undefined && !sameOrder(before.items, column.items)
			})
			.map((column) => ({ day: column.id, entries: entriesOf(column.items) }))
	}

	const target = columnOf(prev, moved.to)

	const source = columnOf(prev, moved.from)

	const targetNext = columnOf(next, moved.to)

	const sourceNext = columnOf(next, moved.from)

	if (target === undefined || source === undefined || targetNext === undefined) return []

	const displaced = target.items[moved.at]

	// Nothing was in the slot, so the move is what the board already shows. The
	// source can be absent from `next` only if the board stopped drawing that day
	// mid-drag, which it does not; the fallback keeps it legible rather than
	// asserting it away.
	if (displaced === undefined) {
		return [
			{ day: moved.from, entries: entriesOf(sourceNext?.items ?? []) },
			{ day: moved.to, entries: entriesOf(targetNext.items) },
		]
	}

	// The slot the moved card came out of, which is where its partner goes. Read
	// from `prev`, because `next` has already closed the gap.
	const vacated = source.items.findIndex((item) => item.id === moved.id)

	const back = (sourceNext?.items ?? []).filter((item) => item.id !== displaced.id)

	back.splice(Math.max(0, vacated), 0, displaced)

	return [
		{ day: moved.from, entries: entriesOf(back) },
		{
			day: moved.to,
			entries: entriesOf(targetNext.items.filter((item) => item.id !== displaced.id)),
		},
	]
}
