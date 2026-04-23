import { describe, expect, it, vi } from 'vitest'
import {
	addChild,
	createGroup,
	createRule,
	getOperators,
	mapNode,
	QueryBuilder,
	type QueryField,
	type QueryGroupNode,
	QueryRuleValue,
	removeChild,
} from '../../components/query-builder'
import { hasRules } from '../../components/query-builder/utilities'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

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

	describe('createRule', () => {
		it('builds an empty rule when no field is supplied', () => {
			const rule = createRule()

			expect(rule.type).toBe('rule')

			expect(rule.combinator).toBe('and')

			expect(rule.field).toBe('')

			expect(rule.operator).toBe('')

			expect(rule.value).toBe('')
		})

		it('derives the default operator from the field type', () => {
			const rule = createRule({ name: 'age', label: 'Age', type: 'number' })

			expect(rule.field).toBe('age')

			expect(rule.operator).toBe('equals')
		})

		it('uses the first option value as default for select fields', () => {
			const rule = createRule({
				name: 'status',
				label: 'Status',
				type: 'select',
				options: [
					{ value: 'open', label: 'Open' },
					{ value: 'closed', label: 'Closed' },
				],
			})

			expect(rule.value).toBe('open')
		})

		it('defaults boolean fields to null', () => {
			const rule = createRule({ name: 'active', label: 'Active', type: 'boolean' })

			expect(rule.value).toBeNull()
		})

		it('respects the provided combinator', () => {
			const rule = createRule(undefined, 'or')

			expect(rule.combinator).toBe('or')
		})
	})

	describe('createGroup', () => {
		it('builds a group with default combinator "and"', () => {
			const group = createGroup()

			expect(group.type).toBe('group')

			expect(group.combinator).toBe('and')

			expect(group.children).toEqual([])
		})

		it('preserves children and a custom combinator', () => {
			const child = createRule()

			const group = createGroup('or', [child])

			expect(group.combinator).toBe('or')

			expect(group.children).toEqual([child])
		})
	})

	describe('getOperators', () => {
		it('returns field-defined operators when provided', () => {
			const field: QueryField = {
				name: 'x',
				label: 'X',
				type: 'text',
				operators: [{ value: 'custom', label: 'custom' }],
			}

			expect(getOperators(field)).toHaveLength(1)

			expect(getOperators(field)[0]?.value).toBe('custom')
		})

		it('falls back to the default operators for the field type', () => {
			const field: QueryField = { name: 'age', label: 'Age', type: 'number' }

			const ops = getOperators(field)

			expect(ops.map((o) => o.value)).toContain('gte')
		})
	})

	describe('QueryRuleValue', () => {
		it('renders a text Input for text fields and emits string changes', () => {
			const field: QueryField = { name: 'name', label: 'Name', type: 'text' }

			const onChange = vi.fn()

			const { container } = renderUI(
				<QueryRuleValue field={field} value="hi" onChange={onChange} />,
			)

			const input = container.querySelector('input') as HTMLInputElement

			expect(input).toHaveAttribute('type', 'text')

			expect(input.value).toBe('hi')

			fireEvent.change(input, { target: { value: 'bye' } })

			expect(onChange).toHaveBeenCalledWith('bye')
		})

		it('renders a number Input and emits numeric changes', () => {
			const field: QueryField = { name: 'age', label: 'Age', type: 'number' }

			const onChange = vi.fn()

			const { container } = renderUI(
				<QueryRuleValue field={field} value={10} onChange={onChange} />,
			)

			const input = container.querySelector('input') as HTMLInputElement

			expect(input).toHaveAttribute('type', 'number')

			expect(input.value).toBe('10')

			fireEvent.change(input, { target: { value: '42' } })

			expect(onChange).toHaveBeenCalledWith(42)
		})

		it('emits empty string for empty numeric input', () => {
			const field: QueryField = { name: 'age', label: 'Age', type: 'number' }

			const onChange = vi.fn()

			const { container } = renderUI(<QueryRuleValue field={field} value={3} onChange={onChange} />)

			const input = container.querySelector('input') as HTMLInputElement

			fireEvent.change(input, { target: { value: '' } })

			expect(onChange).toHaveBeenCalledWith('')
		})

		it('renders empty number input when value is null', () => {
			const field: QueryField = { name: 'age', label: 'Age', type: 'number' }

			const { container } = renderUI(
				<QueryRuleValue field={field} value={null} onChange={() => {}} />,
			)

			const input = container.querySelector('input') as HTMLInputElement

			expect(input.value).toBe('')
		})

		it('renders a Select for select fields', () => {
			const field: QueryField = {
				name: 'status',
				label: 'Status',
				type: 'select',
				options: [
					{ value: 'open', label: 'Open' },
					{ value: 'closed', label: 'Closed' },
				],
			}

			const { container } = renderUI(
				<QueryRuleValue field={field} value="open" onChange={() => {}} />,
			)

			const button = container.querySelector('button[aria-haspopup="listbox"]')

			expect(button).toBeInTheDocument()
		})

		it('does not render a text input for date fields', () => {
			const field: QueryField = { name: 'start', label: 'Start', type: 'date' }

			const { container } = renderUI(
				<QueryRuleValue field={field} value="2024-03-05" onChange={() => {}} />,
			)

			const textInput = container.querySelector('input[type="text"]')

			expect(textInput).not.toBeInTheDocument()
		})

		it('falls back to a text input for unknown field types', () => {
			const field: QueryField = { name: 'x', label: 'X', type: 'boolean' }

			const { container } = renderUI(
				<QueryRuleValue field={field} value={undefined} onChange={() => {}} />,
			)

			const input = container.querySelector('input') as HTMLInputElement

			expect(input).toHaveAttribute('type', 'text')

			expect(input.value).toBe('')
		})
	})

	describe('hasRules', () => {
		it('returns false for an empty group', () => {
			expect(hasRules(createGroup())).toBe(false)
		})

		it('returns true when a direct child is a rule', () => {
			const group = createGroup('and', [createRule()])

			expect(hasRules(group)).toBe(true)
		})

		it('returns true when a rule is nested in a subgroup', () => {
			const inner = createGroup('and', [createRule()])
			const outer = createGroup('and', [inner])

			expect(hasRules(outer)).toBe(true)
		})

		it('returns false when only empty subgroups are present', () => {
			const outer = createGroup('and', [createGroup()])

			expect(hasRules(outer)).toBe(false)
		})
	})
})
