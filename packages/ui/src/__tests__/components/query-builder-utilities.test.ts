import { describe, expect, it } from 'vitest'
import {
	addChild,
	createGroup,
	createRule,
	getOperators,
	hasRules,
	mapNode,
	removeChild,
} from '../../components/query-builder/query-builder-utilities'
import type { QueryField, QueryNode, QueryRule } from '../../components/query-builder/types'

const textField: QueryField = { name: 'title', label: 'Title', type: 'text' }
const numberField: QueryField = { name: 'age', label: 'Age', type: 'number' }
const selectField: QueryField = {
	name: 'role',
	label: 'Role',
	type: 'select',
	options: [
		{ value: 'admin', label: 'Admin' },
		{ value: 'user', label: 'User' },
	],
}
const booleanField: QueryField = { name: 'active', label: 'Active', type: 'boolean' }

describe('createRule', () => {
	it('returns a rule with combinator defaulting to "and"', () => {
		const rule = createRule(textField)

		expect(rule.type).toBe('rule')
		expect(rule.combinator).toBe('and')
		expect(rule.field).toBe('title')
	})

	it('seeds the operator from the field’s default operator list', () => {
		expect(createRule(textField).operator).toBe('equals')
	})

	it('uses the supplied combinator', () => {
		expect(createRule(textField, 'or').combinator).toBe('or')
	})

	it('defaults the value per field type', () => {
		expect(createRule(textField).value).toBe('')
		expect(createRule(numberField).value).toBe('')
		expect(createRule(selectField).value).toBe('admin')
		expect(createRule(booleanField).value).toBeNull()
	})

	it('returns a rule with an empty field when no QueryField is supplied', () => {
		const rule = createRule()

		expect(rule.field).toBe('')
		expect(rule.operator).toBe('')
	})

	it('mints unique ids across calls', () => {
		const a = createRule(textField)
		const b = createRule(textField)

		expect(a.id).not.toBe(b.id)
	})
})

describe('createGroup', () => {
	it('returns an empty group with combinator defaulting to "and"', () => {
		const group = createGroup()

		expect(group.type).toBe('group')
		expect(group.combinator).toBe('and')
		expect(group.children).toEqual([])
	})

	it('honors the supplied combinator and children', () => {
		const child = createRule(textField)
		const group = createGroup('or', [child])

		expect(group.combinator).toBe('or')
		expect(group.children).toEqual([child])
	})
})

describe('getOperators', () => {
	it('returns the field’s explicit operators when present', () => {
		const custom: QueryField = {
			name: 'x',
			label: 'X',
			type: 'text',
			operators: [{ value: 'is', label: 'is' }],
		}

		expect(getOperators(custom)).toEqual([{ value: 'is', label: 'is' }])
	})

	it('falls back to the default operator list per field type', () => {
		expect(getOperators(numberField).map((o) => o.value)).toContain('gte')
	})
})

describe('hasRules', () => {
	it('returns false for an empty group', () => {
		expect(hasRules(createGroup())).toBe(false)
	})

	it('returns true when a rule is a direct child', () => {
		expect(hasRules(createGroup('and', [createRule(textField)]))).toBe(true)
	})

	it('returns true when a rule is nested inside a child group', () => {
		const inner = createGroup('and', [createRule(textField)])
		const outer = createGroup('and', [inner])

		expect(hasRules(outer)).toBe(true)
	})

	it('returns false when every child group is empty', () => {
		expect(hasRules(createGroup('and', [createGroup()]))).toBe(false)
	})
})

describe('mapNode', () => {
	it('replaces a top-level node identified by id', () => {
		const rule = createRule(textField)
		const tree = createGroup('and', [rule])

		const replacement: QueryRule = { ...rule, field: 'replaced' }

		const next = mapNode(tree, rule.id, () => replacement)

		expect(next.children[0]).toBe(replacement)
	})

	it('replaces a node nested inside a child group', () => {
		const rule = createRule(textField)
		const inner = createGroup('and', [rule])
		const tree = createGroup('and', [inner])

		const replacement: QueryRule = { ...rule, field: 'replaced' }

		const next = mapNode(tree, rule.id, () => replacement)

		const newInner = next.children[0] as { children: QueryNode[] }

		expect(newInner.children[0]).toBe(replacement)
	})

	it('returns the same tree reference when id is not found', () => {
		const tree = createGroup('and', [createRule(textField)])

		expect(mapNode(tree, 'missing', (n) => n)).toBe(tree)
	})
})

describe('addChild', () => {
	it('appends a node to the matching parent group', () => {
		const tree = createGroup()

		const rule = createRule(textField)

		expect(addChild(tree, tree.id, rule).children).toEqual([rule])
	})

	it('appends inside a nested group', () => {
		const inner = createGroup()
		const tree = createGroup('and', [inner])

		const rule = createRule(textField)

		const next = addChild(tree, inner.id, rule)

		const newInner = next.children[0] as { children: QueryNode[] }

		expect(newInner.children).toEqual([rule])
	})

	it('returns the same tree when parentId is not found', () => {
		const tree = createGroup()

		expect(addChild(tree, 'missing', createRule(textField))).toBe(tree)
	})
})

describe('removeChild', () => {
	it('removes a top-level child by id', () => {
		const rule = createRule(textField)
		const tree = createGroup('and', [rule])

		expect(removeChild(tree, rule.id).children).toEqual([])
	})

	it('removes a deeply nested child', () => {
		const rule = createRule(textField)
		const inner = createGroup('and', [rule])
		const tree = createGroup('and', [inner])

		const next = removeChild(tree, rule.id)

		const newInner = next.children[0] as { children: QueryNode[] }

		expect(newInner.children).toEqual([])
	})

	it('returns the same tree when id is not found', () => {
		const tree = createGroup('and', [createRule(textField)])

		expect(removeChild(tree, 'missing')).toBe(tree)
	})
})
