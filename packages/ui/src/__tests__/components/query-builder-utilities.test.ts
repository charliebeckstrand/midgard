import { describe, expect, it } from 'vitest'
import {
	addChild,
	createGroup,
	createRule,
	findFocusTarget,
	getOperators,
	hasRules,
	mapNode,
	removeChild,
} from '../../modules/query/query-builder/query-builder-utilities'
import type { QueryField, QueryNode, QueryRule } from '../../modules/query/query-builder/types'

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

	it('preserves sibling references when updating one leaf', () => {
		const leafA = createRule(textField)

		const inner = createGroup('or', [createRule(numberField)])

		const tree = createGroup('and', [leafA, inner])

		const next = mapNode(tree, leafA.id, (n) => ({ ...n, value: 'updated' }))

		expect(next).not.toBe(tree)

		expect(next.children[1]).toBe(inner)

		expect((next.children[0] as QueryRule).value).toBe('updated')
	})

	it('updates nested nodes while preserving unrelated subtrees', () => {
		const leafA = createRule(textField)

		const leafB = createRule(numberField)

		const tree = createGroup('and', [leafA, createGroup('or', [leafB])])

		const next = mapNode(tree, leafB.id, (n) => ({ ...n, value: 42 }))

		expect(next.children[0]).toBe(leafA)

		const inner = next.children[1] as { children: QueryNode[] }

		expect((inner.children[0] as QueryRule).value).toBe(42)
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

	it('preserves unrelated siblings when inserting into a nested group', () => {
		const leafA = createRule(textField)

		const inner = createGroup('or', [createRule(numberField)])

		const tree = createGroup('and', [leafA, inner])

		const newRule = createRule(textField)

		const next = addChild(tree, inner.id, newRule)

		expect(next.children[0]).toBe(leafA)

		const innerNext = next.children[1] as { children: QueryNode[] }

		expect(innerNext.children).toHaveLength(2)

		expect(innerNext.children[1]).toBe(newRule)
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

	it('preserves untouched siblings when removing a direct child', () => {
		const leafA = createRule(textField)

		const leafB = createRule(numberField)

		const tree = createGroup('and', [leafA, leafB])

		const next = removeChild(tree, leafA.id)

		expect(next.children).toHaveLength(1)

		expect(next.children).toContain(leafB)

		expect(next.children).not.toContain(leafA)
	})

	it('preserves unrelated subtrees when removing a nested node', () => {
		const leafA = createRule(textField)

		const leafB = createRule(numberField)

		const tree = createGroup('and', [leafA, createGroup('or', [leafB])])

		const next = removeChild(tree, leafB.id)

		expect(next.children[0]).toBe(leafA)

		const inner = next.children[1] as { children: QueryNode[] }

		expect(inner.children).toHaveLength(0)
	})
})

describe('findFocusTarget', () => {
	it('prefers the previous sibling, then offers the next, then the group', () => {
		const a = createRule(textField)
		const b = createRule(textField)
		const c = createRule(textField)

		const root = createGroup('and', [a, b, c])

		// Middle node: previous first, then next, then the enclosing group.
		expect(findFocusTarget(root, b.id)).toEqual([
			{ kind: 'node', id: a.id },
			{ kind: 'node', id: c.id },
			{ kind: 'add', groupId: root.id },
		])
	})

	it('omits the previous candidate when removing the first child', () => {
		const a = createRule(textField)
		const b = createRule(textField)

		const root = createGroup('and', [a, b])

		expect(findFocusTarget(root, a.id)).toEqual([
			{ kind: 'node', id: b.id },
			{ kind: 'add', groupId: root.id },
		])
	})

	it('falls back to the group when the node is an only child', () => {
		const only = createRule(textField)

		const root = createGroup('and', [only])

		expect(findFocusTarget(root, only.id)).toEqual([{ kind: 'add', groupId: root.id }])
	})

	it('chains add-rule fallbacks from the nested group out to the root', () => {
		const only = createRule(textField)

		const nested = createGroup('and', [only])

		const root = createGroup('and', [nested])

		// Removing the nested group's only child exhausts it, so focus walks up:
		// the nested group's add control, then the root's.
		expect(findFocusTarget(root, only.id)).toEqual([
			{ kind: 'add', groupId: nested.id },
			{ kind: 'add', groupId: root.id },
		])
	})

	it('returns no candidates when the id is absent', () => {
		const root = createGroup('and', [createRule(textField)])

		expect(findFocusTarget(root, 'missing')).toEqual([])
	})
})
