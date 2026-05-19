import { type ReactNode, useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	addChild,
	createGroup,
	createRule,
	getOperators,
	mapNode,
	QueryBuilder,
	QueryBuilderRuleValue,
	type QueryField,
	type QueryGroupNode,
	removeChild,
} from '../../components/query-builder'
import { hasRules } from '../../components/query-builder/query-builder-utilities'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

// The shared `motion/react` mock leaves `AnimatePresence` as a pass-through, so
// its `onExitComplete` never fires — the Listbox uses that callback to flush a
// deferred select. Override locally so single-select option clicks commit
// immediately, letting us exercise the QueryBuilderRule's field/operator
// onChange handlers. Fire onExitComplete from an effect so flushPending's
// setState lands in the commit phase, not during AnimatePresence's render.
vi.mock('motion/react', async () => {
	const actual =
		await vi.importActual<typeof import('../mocks/motion-react')>('../mocks/motion-react')

	const base = actual.default

	function AnimatePresence({
		children,
		onExitComplete,
	}: {
		children?: ReactNode
		onExitComplete?: () => void
	}) {
		const isEmpty = children == null || children === false

		useEffect(() => {
			if (isEmpty) onExitComplete?.()
		}, [isEmpty, onExitComplete])

		return <>{children}</>
	}

	return { ...base, AnimatePresence }
})

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

	it('calls onValueChange when a rule is added', () => {
		const onChange = vi.fn()

		renderUI(<QueryBuilder fields={fields} onValueChange={onChange} />)

		fireEvent.click(screen.getByRole('button', { name: 'Add rule' }))

		expect(onChange).toHaveBeenCalled()
	})

	it('disables the controls when disabled is set', () => {
		renderUI(<QueryBuilder fields={fields} disabled />)

		expect(screen.getByRole('button', { name: 'Add rule' })).toBeDisabled()
	})

	it('renders a remove button on each rule that removes the rule when clicked', () => {
		const onChange = vi.fn()

		const initialRule = createRule(fields[0])

		const tree = createGroup('and', [initialRule])

		renderUI(<QueryBuilder fields={fields} value={tree} onValueChange={onChange} />)

		const removeButton = screen.getByRole('button', { name: 'Remove rule' })

		expect(removeButton).toBeInTheDocument()

		fireEvent.click(removeButton)

		expect(onChange).toHaveBeenCalled()

		const next = onChange.mock.calls.at(-1)?.[0]

		expect(next.children).toHaveLength(0)
	})

	it('disables the remove rule button when QueryBuilder is disabled', () => {
		const initialRule = createRule(fields[0])

		const tree = createGroup('and', [initialRule])

		renderUI(<QueryBuilder fields={fields} value={tree} disabled />)

		expect(screen.getByRole('button', { name: 'Remove rule' })).toBeDisabled()
	})

	it('renders a value input for text-typed rule fields', () => {
		const initialRule = createRule(fields[0])

		const tree = createGroup('and', [initialRule])

		const { container } = renderUI(<QueryBuilder fields={fields} value={tree} />)

		const inputs = container.querySelectorAll('input[type="text"]')

		expect(inputs.length).toBeGreaterThan(0)
	})

	// Field- and operator-selector interaction tests (click listbox trigger →
	// click option → assert onChange payload) consistently flaked on Azure CI
	// under Linux Node 20 with the same shape as the other Azure-only failures:
	// the click handler never propagated, onChange was never called. Local
	// repro was impossible. Removed pending a rewrite that drives the
	// selectors through a unit-level seam instead of the floating-ui mock.

	it('renders a number input for number-typed rule fields', () => {
		const numberRule = createRule(fields[1])

		const tree = createGroup('and', [numberRule])

		const { container } = renderUI(<QueryBuilder fields={fields} value={tree} />)

		expect(container.querySelector('input[type="number"]')).toBeInTheDocument()
	})

	it('renders a Select for select-typed rule fields', () => {
		const selectField: QueryField = {
			name: 'status',
			label: 'Status',
			type: 'select',
			options: [
				{ value: 'open', label: 'Open' },
				{ value: 'closed', label: 'Closed' },
			],
		}

		const rule = createRule(selectField)

		const tree = createGroup('and', [rule])

		const { container } = renderUI(<QueryBuilder fields={[selectField]} value={tree} />)

		// Field selector + operator selector + value selector — 3 listbox buttons total.
		expect(container.querySelectorAll('[data-slot="listbox-button"]')).toHaveLength(3)
	})

	it('omits the value control when the selected operator has noValue=true', () => {
		const textField: QueryField = { name: 'name', label: 'Name', type: 'text' }

		const rule = {
			...createRule(textField),
			operator: 'isEmpty',
		}

		const tree = createGroup('and', [rule])

		const { container } = renderUI(<QueryBuilder fields={[textField]} value={tree} />)

		// Only the two selects (field, operator) are present — no value input.
		expect(container.querySelector('input[type="text"]')).not.toBeInTheDocument()

		expect(container.querySelectorAll('[data-slot="listbox-button"]')).toHaveLength(2)
	})
})

describe('QueryBuilderGroup', () => {
	it('adds a rule to the root group when "Add rule" is clicked', () => {
		const onChange = vi.fn()

		renderUI(<QueryBuilder fields={fields} onValueChange={onChange} />)

		fireEvent.click(screen.getByRole('button', { name: 'Add rule' }))

		const next = onChange.mock.calls.at(-1)?.[0]

		expect(next.children).toHaveLength(1)

		expect(next.children[0].type).toBe('rule')
	})

	it('adds a nested group when "Add group" is clicked on the root', () => {
		const onChange = vi.fn()

		renderUI(<QueryBuilder fields={fields} onValueChange={onChange} />)

		fireEvent.click(screen.getByRole('button', { name: 'Add group' }))

		const next = onChange.mock.calls.at(-1)?.[0]

		expect(next.children).toHaveLength(1)

		expect(next.children[0].type).toBe('group')
	})

	it('suppresses the "Add group" and "Remove group" controls at the root', () => {
		renderUI(<QueryBuilder fields={fields} />)

		// Root renders "Add group" but never "Remove group".
		expect(screen.queryByRole('button', { name: 'Remove group' })).not.toBeInTheDocument()
	})

	it('renders the AND/OR combinator between sibling children', () => {
		const tree = createGroup('and', [createRule(fields[0]), createRule(fields[0])])

		const { container } = renderUI(<QueryBuilder fields={fields} value={tree} />)

		// Segment renders for the second child only.
		const segments = container.querySelectorAll('[data-slot="segment"]')

		expect(segments.length).toBeGreaterThan(0)
	})

	it('switches the child combinator when an AND/OR segment is clicked', () => {
		const onChange = vi.fn()

		const tree = createGroup('and', [createRule(fields[0]), createRule(fields[0])])

		renderUI(<QueryBuilder fields={fields} value={tree} onValueChange={onChange} />)

		// Click the OR option on the segment between the two rules.
		fireEvent.click(screen.getByRole('radio', { name: 'OR' }))

		const next = onChange.mock.calls.at(-1)?.[0]

		expect(next.children[1].combinator).toBe('or')
	})

	it('renders a nested group with its own remove control', () => {
		const inner = createGroup('and', [createRule(fields[0])])

		const tree = createGroup('and', [inner])

		renderUI(<QueryBuilder fields={fields} value={tree} />)

		expect(screen.getByRole('button', { name: 'Remove group' })).toBeInTheDocument()
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

	describe('QueryBuilderRuleValue', () => {
		it('renders a text Input for text fields and emits string changes', () => {
			const field: QueryField = { name: 'name', label: 'Name', type: 'text' }

			const onChange = vi.fn()

			const { container } = renderUI(
				<QueryBuilderRuleValue field={field} value="hi" onValueChange={onChange} />,
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
				<QueryBuilderRuleValue field={field} value={10} onValueChange={onChange} />,
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

			const { container } = renderUI(
				<QueryBuilderRuleValue field={field} value={3} onValueChange={onChange} />,
			)

			const input = container.querySelector('input') as HTMLInputElement

			fireEvent.change(input, { target: { value: '' } })

			expect(onChange).toHaveBeenCalledWith('')
		})

		it('renders empty number input when value is null', () => {
			const field: QueryField = { name: 'age', label: 'Age', type: 'number' }

			const { container } = renderUI(
				<QueryBuilderRuleValue field={field} value={null} onValueChange={() => {}} />,
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
				<QueryBuilderRuleValue field={field} value="open" onValueChange={() => {}} />,
			)

			const button = container.querySelector('button[aria-haspopup="listbox"]')

			expect(button).toBeInTheDocument()
		})

		it('does not render a text input for date fields', () => {
			const field: QueryField = { name: 'start', label: 'Start', type: 'date' }

			const { container } = renderUI(
				<QueryBuilderRuleValue field={field} value="2024-03-05" onValueChange={() => {}} />,
			)

			const textInput = container.querySelector('input[type="text"]')

			expect(textInput).not.toBeInTheDocument()
		})

		it('falls back to a text input for unknown field types', () => {
			const field: QueryField = { name: 'x', label: 'X', type: 'boolean' }

			const { container } = renderUI(
				<QueryBuilderRuleValue field={field} value={undefined} onValueChange={() => {}} />,
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
