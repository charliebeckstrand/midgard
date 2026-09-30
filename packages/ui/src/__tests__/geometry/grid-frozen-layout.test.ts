// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { sameFrozenLayout } from '../../modules/grid/engine/grid-pin/layout'
import type { FrozenOffsets } from '../../modules/grid/engine/grid-pin/measure'
import { layoutOf, type Pin } from '../helpers/grid-frozen-layout'

/**
 * The frozen layout the pinned chrome draws from. It is a snapshot, not a live
 * reader: rows, cells, and headers all hold on `memo`, so a pin joining the group
 * or a drag moving a width reaches them only through this value's identity.
 */
describe('frozen column layout', () => {
	// Name and Email freeze left, Status holds the right edge.
	const left: Pin[] = [
		['name', 160],
		['email', 200],
	]

	const right: Pin[] = [['status', 120]]

	it('resolves both frozen sections, in edge order', () => {
		// The boundary lands on each group's innermost column: the last of the left
		// section, the first of the right one.
		expect([...layoutOf(left, right)]).toEqual([
			['name', { side: 'left', offset: 0, boundary: false }],
			['email', { side: 'left', offset: 160, boundary: true }],
			['status', { side: 'right', offset: 0, boundary: true }],
		])
	})

	it('sticks each right column at the summed width of the columns after it', () => {
		const layout = layoutOf(
			[],
			[
				['status', 120],
				['total', 90],
			],
		)

		expect(layout.get('status')).toEqual({ side: 'right', offset: 90, boundary: true })

		expect(layout.get('total')).toEqual({ side: 'right', offset: 0, boundary: false })
	})

	it('takes a measured offset over the summed widths, column by column', () => {
		// The auto-layout case: the header measurement covers the left stack, and the
		// summed widths stand for the column it has no entry for.
		const measured: FrozenOffsets = {
			left: new Map([
				['name', 0],
				['email', 214],
			]),
			right: new Map(),
		}

		const layout = layoutOf(left, right, measured)

		expect(layout.get('email')?.offset).toBe(214)

		expect(layout.get('status')?.offset).toBe(0)
	})

	it('reads two resolutions equal only when every frozen column lands identically', () => {
		const layout = layoutOf(left, right)

		expect(sameFrozenLayout(layout, layoutOf(left, right))).toBe(true)

		// A drag on a column ahead of the stack moves the ones behind it.
		const dragged = layoutOf(
			[
				['name', 250],
				['email', 200],
			],
			right,
		)

		expect(sameFrozenLayout(layout, dragged)).toBe(false)

		// An unpin puts the boundary — and the edge rule with it — on another column.
		expect(sameFrozenLayout(layout, layoutOf([['name', 160]], right))).toBe(false)
	})
})
