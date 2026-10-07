import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	createGroup,
	QueryBuilder,
	type QueryField,
	type QueryGroup,
	type QueryNode,
	type QueryRule,
} from '../../../modules/query'
import { allBySlot, getSlot, renderUI, screen } from '../../helpers'
import { drag } from '../helpers/drag'

/**
 * The pointer drag of the query builder over Motion's `Reorder`. Rides the real
 * browser and the real Motion, because the claim needs a real pointer drag and
 * real layout measures.
 */
describe('QueryBuilder pointer reorder (real browser)', () => {
	const fields: QueryField[] = [{ name: 'name', label: 'Name', type: 'text' }]

	const rule = (id: string, combinator: 'and' | 'or' = 'and'): QueryRule => ({
		id,
		type: 'rule',
		combinator,
		field: 'name',
		operator: 'contains',
		value: id,
	})

	const flat = () => createGroup('and', [rule('a'), rule('b', 'or'), rule('c')])

	/** A nested group `g` with two rules, then two rules of the root. */
	const nested = (): QueryGroup =>
		createGroup('and', [
			{ ...createGroup('or', [rule('x'), rule('y')]), id: 'g' },
			rule('b', 'or'),
			rule('c'),
		])

	function Harness({
		initial,
		onValueChange,
	}: {
		initial: () => QueryGroup
		onValueChange: (value: QueryGroup) => void
	}) {
		const [query, setQuery] = useState(initial)

		return (
			<QueryBuilder
				fields={fields}
				value={query}
				onValueChange={(next) => {
					onValueChange(next)

					setQuery(next)
				}}
				reorder
			/>
		)
	}

	const ids = (nodes: QueryNode[]) => nodes.map((node) => node.id)

	/** The node ids of the root group, in the order of the DOM. */
	const rootOrder = (container: HTMLElement) => {
		const list = getSlot(container, 'query-sortable-list')

		return [...list.children].flatMap((child) =>
			child instanceof HTMLElement && child.dataset.slot === 'query-sortable'
				? [child.dataset.nodeId]
				: [],
		)
	}

	const sortable = (container: HTMLElement, id: string) =>
		container.querySelector<HTMLElement>(`[data-slot="query-sortable"][data-node-id="${id}"]`)

	/** Presses `grip` and moves the pointer down by `distance`, in twelve steps. */
	const dragDown = (grip: HTMLElement, distance: number) => {
		const box = grip.getBoundingClientRect()

		const from = { x: box.left + box.width / 2, y: box.top + box.height / 2 }

		const path = Array.from({ length: 12 }, (_, i) => ({
			x: from.x,
			y: from.y + ((i + 1) * distance) / 12,
		}))

		return drag(grip, from, path)
	}

	const grip = (name: string) => screen.getByRole('button', { name: `Reorder ${name}` })

	it('moves the nodes during the drag and commits the move once, on the drop', async () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<Harness initial={flat} onValueChange={onValueChange} />)

		const first = sortable(container, 'a')

		const second = sortable(container, 'b')

		if (!first || !second) throw new Error('expected nodes')

		const held = await dragDown(
			grip('Name contains a'),
			second.getBoundingClientRect().height * 1.5,
		)

		await expect.poll(() => first.hasAttribute('data-dragging')).toBe(true)

		await expect.poll(() => rootOrder(container)).toEqual(['b', 'a', 'c'])

		// The separators fade while the nodes move between them.
		expect(getSlot(container, 'query-sortable-list')).toHaveAttribute('data-sorting')

		expect(onValueChange).not.toHaveBeenCalled()

		await held.release()

		await expect.poll(() => onValueChange.mock.calls.length).toBe(1)

		const next: QueryGroup = onValueChange.mock.calls[0]?.[0]

		expect(ids(next.children)).toEqual(['b', 'a', 'c'])

		// The combinators keep their positions: OR still joins positions 1 and 2.
		expect(next.children.map((child) => child.combinator)).toEqual(['and', 'or', 'and'])

		await expect.poll(() => first.hasAttribute('data-dragging')).toBe(false)

		expect(screen.getByText('Dropped Name contains a, position 2 of 3.')).toBeInTheDocument()
	})

	it('puts the nodes back and commits nothing when Escape cancels the drag', async () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<Harness initial={flat} onValueChange={onValueChange} />)

		const second = sortable(container, 'b')

		if (!second) throw new Error('expected nodes')

		const held = await dragDown(
			grip('Name contains a'),
			second.getBoundingClientRect().height * 1.5,
		)

		await expect.poll(() => rootOrder(container)).toEqual(['b', 'a', 'c'])

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

		await expect.poll(() => rootOrder(container)).toEqual(['a', 'b', 'c'])

		await held.release()

		expect(onValueChange).not.toHaveBeenCalled()

		await expect
			.poll(() => screen.queryByText('Returned Name contains a to position 1 of 3.'))
			.toBeInTheDocument()
	})

	// The open risk of the move: a nested group is a `Reorder.Group` of its own
	// inside an item of its parent. Its items take layout animations, and they
	// must ride the transform of the parent item, not lag behind it.
	it('carries a nested group with its rules as one node', async () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<Harness initial={nested} onValueChange={onValueChange} />)

		const group = sortable(container, 'g')

		const inner = sortable(container, 'x')

		const next = sortable(container, 'b')

		if (!group || !inner || !next) throw new Error('expected nodes')

		const offset = () => inner.getBoundingClientRect().top - group.getBoundingClientRect().top

		const rest = offset()

		const start = group.getBoundingClientRect().top

		const held = await dragDown(grip('condition group'), next.getBoundingClientRect().height * 1.5)

		await expect.poll(() => rootOrder(container)).toEqual(['b', 'g', 'c'])

		// The group moved, and its rule moved with it.
		expect(group.getBoundingClientRect().top).toBeGreaterThan(start)

		await expect.poll(offset).toBeCloseTo(rest, 0)

		await held.release()

		await expect.poll(() => onValueChange.mock.calls.length).toBe(1)

		expect(ids(onValueChange.mock.calls[0]?.[0].children)).toEqual(['b', 'g', 'c'])

		// The layout animation of the drop settles with the rule still in place
		// inside its group.
		await expect.poll(offset).toBeCloseTo(rest, 0)

		expect(allBySlot(group, 'query-sortable').map((node) => node.dataset.nodeId)).toEqual([
			'x',
			'y',
		])
	})

	it('moves a rule only among its siblings in a nested group', async () => {
		const onValueChange = vi.fn()

		const { container } = renderUI(<Harness initial={nested} onValueChange={onValueChange} />)

		const second = sortable(container, 'y')

		if (!second) throw new Error('expected nodes')

		const held = await dragDown(
			grip('Name contains x'),
			second.getBoundingClientRect().height * 1.5,
		)

		await held.release()

		await expect.poll(() => onValueChange.mock.calls.length).toBe(1)

		const value: QueryGroup = onValueChange.mock.calls[0]?.[0]

		expect(ids(value.children)).toEqual(['g', 'b', 'c'])

		expect(ids((value.children[0] as QueryGroup).children)).toEqual(['y', 'x'])
	})
})
