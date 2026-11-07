import { describe, expect, it } from 'vitest'
import { createGroup, QueryBuilder, type QueryField, type QueryGroup } from '../../modules/query'
import { allBySlot, renderUI } from '../helpers'

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
