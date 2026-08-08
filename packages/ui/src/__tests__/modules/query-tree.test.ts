import { describe, expect, it } from 'vitest'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import { addChild, hasRules, mapNode, removeChild } from '../../modules/query/engine/query-tree'
import type { QueryField, QueryNode, QueryRule } from '../../modules/query/engine/types'

const textField: QueryField = { name: 'title', label: 'Title', type: 'text' }

const numberField: QueryField = { name: 'age', label: 'Age', type: 'number' }

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
