import { describe, expect, it } from 'vitest'
import {
	applyColumnReorder,
	columnDragStyle,
	restrictToFirstScrollableAncestor,
	restrictToHorizontalAxis,
} from '../../modules/grid/grid-reorder'

/** dnd-kit's modifier args are broad; the modifier only reads `transform`. */
type ModifierArgs = Parameters<typeof restrictToHorizontalAxis>[0]

describe('applyColumnReorder', () => {
	it('repermutes only the reorderable slots, holding the rest in place', () => {
		const order = ['select', 'name', 'age', 'status', 'actions']

		const reorderable = new Set<string | number>(['name', 'age', 'status'])

		// New order of the reorderable subset: status, name, age.
		const next = applyColumnReorder(order, ['status', 'name', 'age'], (id) => reorderable.has(id))

		expect(next).toEqual(['select', 'status', 'name', 'age', 'actions'])
	})

	it('returns the order unchanged when nothing is reorderable', () => {
		const order = ['select', 'actions']

		expect(applyColumnReorder(order, [], () => false)).toEqual(['select', 'actions'])
	})

	it('applies the full reordering when every id is reorderable', () => {
		const order = ['a', 'b', 'c']

		expect(applyColumnReorder(order, ['c', 'a', 'b'], () => true)).toEqual(['c', 'a', 'b'])
	})

	it('holds a hidden reorderable id in place between visible ones', () => {
		const order = ['name', 'hidden', 'age']

		// "hidden" is excluded from the reorderable set, so a swap of the two
		// visible columns leaves it pinned to its middle slot.
		const next = applyColumnReorder(order, ['age', 'name'], (id) => id !== 'hidden')

		expect(next).toEqual(['age', 'hidden', 'name'])
	})
})

describe('columnDragStyle', () => {
	it('translates horizontally without the scale that would stretch cell content', () => {
		const style = columnDragStyle(
			{ x: 12, y: 0, scaleX: 2, scaleY: 0.5 },
			'transform 200ms ease',
			'120px',
		)

		expect(style.transform).toContain('translate3d')

		expect(style.transform).toContain('12px')

		// The scale dnd-kit packs into `transform` (the stretch) is dropped.
		expect(style.transform).not.toContain('scale')

		expect(style.transition).toBe('transform 200ms ease')

		expect(style.width).toBe('120px')
	})

	it('emits no transform when idle and omits width when unset', () => {
		const style = columnDragStyle(null, undefined)

		expect(style.transform).toBeUndefined()

		expect(style.width).toBeUndefined()
	})
})

describe('restrictToHorizontalAxis', () => {
	it('zeroes the vertical component so a column drag stays on the x-axis', () => {
		const args = {
			transform: { x: 24, y: 80, scaleX: 1, scaleY: 1 },
		} as unknown as ModifierArgs

		expect(restrictToHorizontalAxis(args)).toEqual({ x: 24, y: 0, scaleX: 1, scaleY: 1 })
	})
})

describe('restrictToFirstScrollableAncestor', () => {
	const clientRect = (left: number, right: number, top = 0, bottom = 40) => ({
		left,
		right,
		top,
		bottom,
		width: right - left,
		height: bottom - top,
	})

	it('clamps a rightward drag so the column stops at the container edge', () => {
		const args = {
			transform: { x: 1000, y: 0, scaleX: 1, scaleY: 1 },
			draggingNodeRect: clientRect(100, 200),
			scrollableAncestorRects: [clientRect(0, 300)],
		} as unknown as ModifierArgs

		// The cell's right edge (200) + x is clamped to the container's right (300).
		expect(restrictToFirstScrollableAncestor(args).x).toBe(100)
	})

	it('leaves an in-bounds drag unchanged', () => {
		const args = {
			transform: { x: 20, y: 0, scaleX: 1, scaleY: 1 },
			draggingNodeRect: clientRect(100, 200),
			scrollableAncestorRects: [clientRect(0, 300)],
		} as unknown as ModifierArgs

		expect(restrictToFirstScrollableAncestor(args).x).toBe(20)
	})

	it('passes the transform through when there is no scrollable ancestor', () => {
		const transform = { x: 1000, y: 0, scaleX: 1, scaleY: 1 }

		const args = {
			transform,
			draggingNodeRect: clientRect(100, 200),
			scrollableAncestorRects: [],
		} as unknown as ModifierArgs

		expect(restrictToFirstScrollableAncestor(args)).toEqual(transform)
	})
})
