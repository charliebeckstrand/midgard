import { describe, expect, it } from 'vitest'
import type { LayoutCell } from '../../modules/dashboard/dashboard-layout'
import { reorderPreview } from '../../modules/dashboard/dashboard-reorder'

/** A cell literal with the noise defaulted away. */
function cell(id: string, x: number, y: number, w: number, h: number, pinned = false): LayoutCell {
	return { id, x, y, w, h, static: pinned }
}

/** A two-up row of 12-wides over a three-up row of 8-wides. */
function board(): LayoutCell[] {
	return [
		cell('a', 0, 0, 12, 27),
		cell('b', 12, 0, 12, 27),
		cell('c', 0, 27, 8, 18),
		cell('d', 8, 27, 8, 18),
		cell('e', 16, 27, 8, 18),
	]
}

const at = (cells: readonly LayoutCell[] | undefined, id: string) =>
	cells?.find((candidate) => candidate.id === id)

describe('reorderPreview', () => {
	it('shifts the row open when it mostly covers an equal-span neighbour', () => {
		const preview = reorderPreview(board(), 'c', 6, 27)

		expect(preview).toMatchObject({ swapWith: 'd', shift: true })

		// c takes d's slot; d rolls back into c's. One step is a straight trade.
		expect(at(preview?.cells, 'c')).toMatchObject({ x: 8, y: 27 })

		expect(at(preview?.cells, 'd')).toMatchObject({ x: 0, y: 27 })

		// The far tile and the other row hold still.
		for (const id of ['a', 'b', 'e']) {
			expect(at(preview?.cells, id)).toMatchObject(at(board(), id) ?? {})
		}
	})

	it('ripples the run over when the drag reaches past the neighbour', () => {
		// e dragged across the three-up row onto c: c and d both shift right one
		// slot to open c's, rather than e and c trading and leaving d stranded.
		const preview = reorderPreview(board(), 'e', 0, 27)

		expect(preview).toMatchObject({ swapWith: 'c', shift: true })

		expect(at(preview?.cells, 'e')).toMatchObject({ x: 0, y: 27 })

		expect(at(preview?.cells, 'c')).toMatchObject({ x: 8, y: 27 })

		expect(at(preview?.cells, 'd')).toMatchObject({ x: 16, y: 27 })
	})

	it('swaps rather than shifts when the partner is on another row', () => {
		const twoRows = [cell('a', 0, 0, 8, 18), cell('b', 8, 0, 8, 18), cell('c', 0, 18, 8, 18)]

		// a dragged down onto c: different rows, so they trade places and b holds.
		const preview = reorderPreview(twoRows, 'a', 0, 18)

		expect(preview).toMatchObject({ swapWith: 'c', shift: false })

		expect(at(preview?.cells, 'a')).toMatchObject({ x: 0, y: 18 })

		expect(at(preview?.cells, 'c')).toMatchObject({ x: 0, y: 0 })

		expect(at(preview?.cells, 'b')).toMatchObject({ x: 8, y: 0 })
	})

	it('swaps the two-up row too, between its equal 12-wides', () => {
		expect(reorderPreview(board(), 'a', 12, 0)).toMatchObject({ swapWith: 'b', shift: true })
	})

	it('engages right at the halfway mark, and stays blocked under it', () => {
		// Two columns into d is a quarter of the cell — under the line, blocked.
		expect(reorderPreview(board(), 'c', 2, 27)).toBeNull()

		// Exactly half engages rather than blocking, so the reserved slot never
		// flickers home as a drag crosses the boundary between two equal tiles.
		expect(reorderPreview(board(), 'c', 4, 27)).toMatchObject({ swapWith: 'd', shift: true })
	})

	it('blocks a two-up tile dragged into a three-up row — sizes never trade', () => {
		expect(reorderPreview(board(), 'a', 0, 27)).toBeNull()

		expect(reorderPreview(board(), 'a', 6, 27)).toBeNull()
	})

	it('blocks a three-up tile dragged into the two-up row the same way', () => {
		expect(reorderPreview(board(), 'c', 0, 0)).toBeNull()

		expect(reorderPreview(board(), 'c', 10, 0)).toBeNull()
	})

	it('blocks open space — a drag never moves a tile off its neighbours', () => {
		// Over the empty back half of a sparse row: nothing to trade with.
		const sparse = [cell('a', 0, 0, 8, 18), cell('b', 8, 0, 8, 18)]

		expect(reorderPreview(sparse, 'a', 16, 0)).toBeNull()
	})

	it('answers its own origin with the unchanged board — a self-swap is a no-op', () => {
		const snapshot = board()

		const preview = reorderPreview(snapshot, 'c', 0, 27)

		expect(preview).toBeNull()
	})

	it('never trades with a static, whatever the overlap', () => {
		const pinned = [cell('a', 0, 0, 8, 18), cell('s', 8, 0, 8, 18, true)]

		expect(reorderPreview(pinned, 'a', 8, 0)).toBeNull()
	})

	it('never drags a static, and answers a missing id with null', () => {
		expect(reorderPreview([cell('s', 0, 0, 8, 18, true)], 's', 8, 0)).toBeNull()

		expect(reorderPreview(board(), 'ghost', 0, 0)).toBeNull()
	})
})
