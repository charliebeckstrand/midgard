import { describe, expect, it, vi } from 'vitest'
import {
	addChild,
	createGroup,
	createRule,
	mapNode,
	QueryBuilder,
	type QueryField,
	type QueryGroupNode,
	removeChild,
} from '../../components/query-builder'
import { bySlot, renderUI, screen } from '../helpers'

const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{ name: 'age', label: 'Age', type: 'number' },
]

describe('QueryBuilder', () => {
	it('renders with data-slot="query-builder"', () => {
		const { container } = renderUI(<QueryBuilder fields={fields} />)

		const el = bySlot(container, 'query-builder')

		expect(el).toBeInTheDocument()
	})

	it('renders the root query group', () => {
		const { container } = renderUI(<QueryBuilder fields={fields} />)

		const group = bySlot(container, 'query-group')

		expect(group).toBeInTheDocument()

		expect(group).toHaveAttribute('data-combinator', 'and')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<QueryBuilder fields={fields} className="custom" />)

		const el = bySlot(container, 'query-builder')

		expect(el?.className).toContain('custom')
	})

	it('renders rules from a provided defaultValue', () => {
		const defaultValue = createGroup('and', [createRule(fields[0]), createRule(fields[1])])

		const { container } = renderUI(<QueryBuilder fields={fields} defaultValue={defaultValue} />)

		expect(container.querySelectorAll('[data-slot="query-rule"]')).toHaveLength(2)
	})

	it('shows the empty-state alert when no rules are present', () => {
		const { container } = renderUI(<QueryBuilder fields={fields} />)

		expect(container.querySelectorAll('[data-slot="query-rule"]')).toHaveLength(0)

		expect(screen.getByText('No rules added')).toBeInTheDocument()
	})

	it('calls onChange when a rule is added', () => {
		const onChange = vi.fn()

		renderUI(<QueryBuilder fields={fields} onChange={onChange} />)

		screen.getByRole('button', { name: 'Add rule' }).click()

		expect(onChange).toHaveBeenCalled()
	})

	it('disables the controls when disabled is set', () => {
		renderUI(<QueryBuilder fields={fields} disabled />)

		expect(screen.getByRole('button', { name: 'Add rule' })).toBeDisabled()
	})
})

describe('query-builder utilities', () => {
	function makeTree() {
		const leafA = createRule(fields[0])
		const leafB = createRule(fields[1])
		const innerGroup = createGroup('or', [leafB])
		const outerGroup = createGroup('and', [leafA, innerGroup])

		return { tree: outerGroup, leafA, leafB, innerGroup }
	}

	describe('mapNode', () => {
		it('returns the same tree reference when id is not found', () => {
			const { tree } = makeTree()

			const next = mapNode(tree, '__absent__', (n) => ({ ...n }))

			expect(next).toBe(tree)
		})

		it('preserves sibling references when updating one leaf', () => {
			const { tree, leafA, leafB, innerGroup } = makeTree()

			const next = mapNode(tree, leafA.id, (n) => ({ ...n, value: 'updated' }))

			expect(next).not.toBe(tree)
			expect(next.children[1]).toBe(innerGroup) // unchanged sibling subtree
			expect((next.children[0] as typeof leafA).value).toBe('updated')

			// Nested leaf reference inside the unchanged group stays identical.
			const unchangedInner = next.children[1] as QueryGroupNode

			expect(unchangedInner.children[0]).toBe(leafB)
		})

		it('updates nested nodes while preserving unrelated subtrees', () => {
			const { tree, leafA, leafB } = makeTree()

			const next = mapNode(tree, leafB.id, (n) => ({ ...n, value: 'nested' }))

			expect(next).not.toBe(tree)
			expect(next.children[0]).toBe(leafA) // unchanged sibling preserved

			const innerNext = next.children[1] as QueryGroupNode

			expect((innerNext.children[0] as typeof leafB).value).toBe('nested')
		})
	})

	describe('addChild', () => {
		it('returns the same tree reference when parent is not found', () => {
			const { tree } = makeTree()

			const next = addChild(tree, '__absent__', createRule(fields[0]))

			expect(next).toBe(tree)
		})

		it('inserts at a nested group and preserves unrelated siblings', () => {
			const { tree, leafA, innerGroup } = makeTree()

			const newRule = createRule(fields[0])

			const next = addChild(tree, innerGroup.id, newRule)

			expect(next).not.toBe(tree)
			expect(next.children[0]).toBe(leafA)

			const innerNext = next.children[1] as QueryGroupNode

			expect(innerNext.children).toHaveLength(2)
			expect(innerNext.children[1]).toBe(newRule)
		})
	})

	describe('removeChild', () => {
		it('returns the same tree reference when id is not found', () => {
			const { tree } = makeTree()

			const next = removeChild(tree, '__absent__')

			expect(next).toBe(tree)
		})

		it('removes a direct child and preserves untouched siblings', () => {
			const { tree, innerGroup, leafA } = makeTree()

			// Add a second leaf alongside leafA so we can verify sibling preservation.
			const extra = createRule(fields[0])
			const withExtra = addChild(tree, tree.id, extra)

			const next = removeChild(withExtra, leafA.id)

			expect(next.children).toHaveLength(2)
			expect(next.children).not.toContain(leafA)
			expect(next.children).toContain(innerGroup)
			expect(next.children).toContain(extra)
		})

		it('removes a nested node and preserves unrelated subtrees', () => {
			const { tree, leafA, leafB } = makeTree()

			const next = removeChild(tree, leafB.id)

			expect(next).not.toBe(tree)
			expect(next.children[0]).toBe(leafA)

			const innerNext = next.children[1] as QueryGroupNode

			expect(innerNext.children).toHaveLength(0)
		})
	})
})
