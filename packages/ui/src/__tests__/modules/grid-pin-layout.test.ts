import type { Table } from '@tanstack/react-table'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { frozenLayout, sameFrozenLayout } from '../../modules/grid/engine/grid-pin/layout'
import type { FrozenOffsets } from '../../modules/grid/engine/grid-pin/measure'
import { buildColumnPinning } from '../../modules/grid/engine/grid-table/views'
import { useFrozenLayout } from '../../modules/grid/grid-table-views'

/** One frozen column as the engine reports it: its id and its offset from its edge. */
type Pin = { id: string; offset: number }

/**
 * A table stub over the two frozen sections the layout reads. The boundary is not
 * stubbed: it falls out of each column's place in its section, which is the
 * derivation under test.
 */
function makeTable(left: Pin[], right: Pin[] = []): Table<{ id: number }> {
	const column = (pin: Pin) => ({
		id: pin.id,
		getStart: () => pin.offset,
		getAfter: () => pin.offset,
	})

	return {
		getLeftVisibleLeafColumns: () => left.map(column),
		getRightVisibleLeafColumns: () => right.map(column),
	} as unknown as Table<{ id: number }>
}

/**
 * The frozen layout the pinned chrome draws from. It is a snapshot, not a live
 * reader: rows, cells, and headers all hold on `memo`, so a pin joining the group
 * or a drag moving a width reaches them only through this value's identity.
 */
describe('frozen column layout', () => {
	// Name and Email freeze left, Status holds the right edge.
	const stacked = makeTable(
		[
			{ id: 'name', offset: 0 },
			{ id: 'email', offset: 160 },
		],
		[{ id: 'status', offset: 0 }],
	)

	it("resolves both of the engine's frozen sections, in edge order", () => {
		// The boundary lands on each group's innermost column: the last of the left
		// section, the first of the right one.
		expect([...frozenLayout(stacked, null)]).toEqual([
			['name', { side: 'left', offset: 0, boundary: false }],
			['email', { side: 'left', offset: 160, boundary: true }],
			['status', { side: 'right', offset: 0, boundary: true }],
		])
	})

	it('takes a measured offset over the engine sum, column by column', () => {
		// The auto-layout case: the header measurement covers the left stack, and the
		// engine's own sum stands for the column it has no entry for.
		const measured: FrozenOffsets = {
			left: new Map([
				['name', 0],
				['email', 214],
			]),
			right: new Map(),
		}

		const layout = frozenLayout(stacked, measured)

		expect(layout.get('email')?.offset).toBe(214)

		expect(layout.get('status')?.offset).toBe(0)
	})

	it('reads two resolutions equal only when every frozen column lands identically', () => {
		const layout = frozenLayout(stacked, null)

		expect(sameFrozenLayout(layout, frozenLayout(stacked, null))).toBe(true)

		// A drag on a column ahead of the stack moves the ones behind it.
		const dragged = makeTable(
			[
				{ id: 'name', offset: 0 },
				{ id: 'email', offset: 250 },
			],
			[{ id: 'status', offset: 0 }],
		)

		expect(sameFrozenLayout(layout, frozenLayout(dragged, null))).toBe(false)

		// An unpin puts the boundary — and the edge rule with it — on another column.
		const repinned = makeTable([{ id: 'name', offset: 0 }], [{ id: 'status', offset: 0 }])

		expect(sameFrozenLayout(layout, frozenLayout(repinned, null))).toBe(false)
	})
})

/**
 * The hook that carries the layout across `memo` boundaries: it must hold its
 * reference while the frozen columns are where they were — a drag on a scrolling
 * column must not re-render every row — and yield a fresh one the moment one of
 * them moves.
 */
describe('useFrozenLayout', () => {
	const oneFrozen = makeTable([{ id: 'name', offset: 0 }])

	it('holds its reference while the frozen columns are unchanged', () => {
		const { result, rerender } = renderHook(({ table }) => useFrozenLayout(true, table, null), {
			initialProps: { table: oneFrozen },
		})

		const first = result.current

		// A re-render for another reason — a scrolling column's drag frame, say —
		// resolves the same layout and must not churn the rows.
		rerender({ table: makeTable([{ id: 'name', offset: 0 }]) })

		expect(result.current).toBe(first)
	})

	it('yields a fresh layout when a column joins the group and takes the boundary', () => {
		const { result, rerender } = renderHook(({ table }) => useFrozenLayout(true, table, null), {
			initialProps: { table: oneFrozen },
		})

		const first = result.current

		rerender({
			table: makeTable([
				{ id: 'name', offset: 0 },
				{ id: 'email', offset: 160 },
			]),
		})

		expect(result.current).not.toBe(first)

		const pinning = buildColumnPinning(result.current)

		// The rule follows the boundary onto the joining column, off the one it displaced.
		expect(pinning.column('email')).toEqual({ side: 'left', offset: 160, boundary: true })

		expect(pinning.column('name')?.boundary).toBe(false)
	})

	it('resolves nothing for a grid with no frozen column', () => {
		const { result } = renderHook(() => useFrozenLayout(false, oneFrozen, null))

		expect(result.current.size).toBe(0)

		expect(buildColumnPinning(result.current).column('name')).toBeUndefined()
	})
})
