import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { createGroup, QueryBuilder, type QueryField, type QueryGroup } from '../../modules/query'
import { ControlLockContext } from '../../primitives/control/context'
import { allBySlot, expectAnnouncement, renderUI, screen, setupUser } from '../helpers'

const fields: QueryField[] = [{ name: 'title', label: 'Title', type: 'text' }]

const rule = (id: string) =>
	({ id, type: 'rule', field: 'title', operator: 'contains', value: id }) as const

function tree(ids: string[]): QueryGroup {
	return { ...createGroup('and', ids.map(rule)), id: 'root' }
}

describe('QueryBuilder reorder', () => {
	it('keeps the first rule mounted as its group grows to two rules and back', () => {
		const { container, rerender } = renderUI(
			<QueryBuilder fields={fields} value={tree(['r1'])} reorder />,
		)

		const [first] = allBySlot(container, 'query-rule')

		expect(allBySlot(container, 'query-reorder-handle')).toHaveLength(0)

		rerender(<QueryBuilder fields={fields} value={tree(['r1', 'r2'])} reorder />)

		expect(allBySlot(container, 'query-rule')[0]).toBe(first)

		expect(allBySlot(container, 'query-reorder-handle')).toHaveLength(2)

		// The grip is a native `<button>`, so it needs no `role`.
		for (const handle of allBySlot(container, 'query-reorder-handle')) {
			expect(handle).not.toHaveAttribute('role')
		}

		rerender(<QueryBuilder fields={fields} value={tree(['r1'])} reorder />)

		expect(allBySlot(container, 'query-rule')[0]).toBe(first)

		expect(allBySlot(container, 'query-reorder-handle')).toHaveLength(0)
	})

	// A nested group's sole node can leave the group, so it shows a grip. The
	// root's sole node has no other group to go to, and under `requireRule` a
	// group keeps its last node.
	it('shows a grip on the sole node of a nested group, unless requireRule keeps it', () => {
		const value: QueryGroup = {
			...createGroup('and', [{ ...createGroup('and', [rule('x')]), id: 'g' }]),
			id: 'root',
		}

		const { container, rerender } = renderUI(<QueryBuilder fields={fields} value={value} reorder />)

		const handles = () =>
			allBySlot(container, 'query-reorder-handle').map((handle) =>
				handle.getAttribute('aria-label'),
			)

		expect(handles()).toEqual(['Reorder Title contains x'])

		rerender(<QueryBuilder fields={fields} value={value} reorder requireRule />)

		expect(handles()).toEqual([])
	})
})

describe('QueryBuilder move menu', () => {
	// r1, then the group g (x, y), then r2.
	const nested = (): QueryGroup => ({
		...createGroup('and', [
			rule('r1'),
			{ ...createGroup('or', [rule('x'), rule('y')]), id: 'g' },
			rule('r2'),
		]),
		id: 'root',
	})

	function Harness({
		value,
		onValueChange,
	}: {
		value: QueryGroup
		onValueChange?: (next: QueryGroup) => void
	}) {
		const [query, setQuery] = useState(value)

		return (
			<QueryBuilder
				fields={fields}
				value={query}
				onValueChange={(next) => {
					setQuery(next)

					onValueChange?.(next)
				}}
				reorder
			/>
		)
	}

	const ids = (group: QueryGroup) => group.children.map((child) => child.id)

	async function openMenu(name: string) {
		const user = setupUser()

		await user.click(screen.getByRole('button', { name: `Move ${name}` }))

		return user
	}

	const labels = () => screen.getAllByRole('menuitem').map((item) => item.textContent)

	it('gives each node with a grip a move button named after the node', () => {
		const { container } = renderUI(<Harness value={tree(['r1', 'r2'])} />)

		expect(
			allBySlot(container, 'query-move-menu').map((button) => button.getAttribute('aria-label')),
		).toEqual(['Move Title contains r1', 'Move Title contains r2'])
	})

	it('shows no move button where the node shows no grip', () => {
		const { container } = renderUI(<Harness value={tree(['r1'])} />)

		expect(allBySlot(container, 'query-move-menu')).toHaveLength(0)
	})

	it('offers the moves in the group, and the move into the group below', async () => {
		renderUI(<Harness value={nested()} />)

		await openMenu('Title contains r1')

		expect(labels()).toEqual(['Move down', 'Move to bottom', 'Move into group below'])
	})

	it('offers the move into the group above', async () => {
		renderUI(<Harness value={nested()} />)

		await openMenu('Title contains r2')

		expect(labels()).toEqual(['Move up', 'Move to top', 'Move into group above'])
	})

	it('offers the move out of a nested group', async () => {
		renderUI(<Harness value={nested()} />)

		await openMenu('Title contains x')

		expect(labels()).toEqual(['Move down', 'Move to bottom', 'Move out of group'])
	})

	it('moves a node one place in its group, and announces it', async () => {
		const onValueChange = vi.fn()

		renderUI(<Harness value={tree(['r1', 'r2', 'r3'])} onValueChange={onValueChange} />)

		const user = await openMenu('Title contains r1')

		await user.click(screen.getByRole('menuitem', { name: 'Move down' }))

		expect(ids(onValueChange.mock.lastCall?.[0])).toEqual(['r2', 'r1', 'r3'])

		await expectAnnouncement('Title contains r1 moved to position 2 of 3', 'assertive')
	})

	it('moves a node into the group below, as its first node', async () => {
		const onValueChange = vi.fn()

		renderUI(<Harness value={nested()} onValueChange={onValueChange} />)

		const user = await openMenu('Title contains r1')

		await user.click(screen.getByRole('menuitem', { name: 'Move into group below' }))

		const next: QueryGroup = onValueChange.mock.lastCall?.[0]

		expect(ids(next)).toEqual(['g', 'r2'])

		expect(ids(next.children[0] as QueryGroup)).toEqual(['r1', 'x', 'y'])
	})

	it('moves a node out of its group, to the place after the group', async () => {
		const onValueChange = vi.fn()

		renderUI(<Harness value={nested()} onValueChange={onValueChange} />)

		const user = await openMenu('Title contains y')

		await user.click(screen.getByRole('menuitem', { name: 'Move out of group' }))

		const next: QueryGroup = onValueChange.mock.lastCall?.[0]

		expect(ids(next)).toEqual(['r1', 'g', 'y', 'r2'])
	})

	it('moves no node from a menu that stays open while a lock arrives', async () => {
		const onValueChange = vi.fn()

		const value = tree(['r1', 'r2'])

		const { rerender } = renderUI(
			<ControlLockContext value={false}>
				<Harness value={value} onValueChange={onValueChange} />
			</ControlLockContext>,
		)

		const user = await openMenu('Title contains r1')

		rerender(
			<ControlLockContext value>
				<Harness value={value} onValueChange={onValueChange} />
			</ControlLockContext>,
		)

		await user.click(screen.getByRole('menuitem', { name: 'Move down' }))

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('moves no node out of its group from a menu that stays open while a lock arrives', async () => {
		const onValueChange = vi.fn()

		const value = nested()

		const { rerender } = renderUI(
			<ControlLockContext value={false}>
				<Harness value={value} onValueChange={onValueChange} />
			</ControlLockContext>,
		)

		const user = await openMenu('Title contains y')

		rerender(
			<ControlLockContext value>
				<Harness value={value} onValueChange={onValueChange} />
			</ControlLockContext>,
		)

		await user.click(screen.getByRole('menuitem', { name: 'Move out of group' }))

		expect(onValueChange).not.toHaveBeenCalled()
	})
})
