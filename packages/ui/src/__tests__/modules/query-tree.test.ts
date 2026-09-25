// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import {
	addChild,
	hasRules,
	mapNode,
	moveChild,
	removeChild,
} from '../../modules/query/engine/query-tree'
import type { QueryField, QueryGroup, QueryNode, QueryRule } from '../../modules/query/engine/types'

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

describe('moveChild', () => {
	/** A rule with a fixed id and combinator, so a test reads the order at a glance. */
	const rule = (id: string, combinator?: 'and' | 'or'): QueryRule => ({
		id,
		type: 'rule',
		...(combinator ? { combinator } : {}),
		field: 'title',
		operator: 'contains',
		value: id,
	})

	const ids = (group: QueryGroup) => group.children.map((child) => child.id)

	const combinators = (group: QueryGroup) => group.children.map((child) => child.combinator)

	it('moves a node down and up among its siblings', () => {
		const tree = createGroup('and', [rule('a'), rule('b', 'and'), rule('c', 'and')])

		expect(ids(moveChild(tree, 'a', 2))).toEqual(['b', 'c', 'a'])

		expect(ids(moveChild(tree, 'c', 0))).toEqual(['c', 'a', 'b'])
	})

	it('keeps each combinator in its position, so only the nodes move', () => {
		const tree = createGroup('and', [rule('a'), rule('b', 'or'), rule('c', 'and')])

		const next = moveChild(tree, 'c', 0)

		expect(ids(next)).toEqual(['c', 'a', 'b'])

		// The first position keeps no combinator, so the one that c held stays at
		// position 2 and no hidden combinator becomes live.
		expect(combinators(next)).toEqual([undefined, 'or', 'and'])

		expect(next.children[0]).not.toHaveProperty('combinator')
	})

	it('keeps the identity of a node whose combinator does not change', () => {
		const b = rule('b', 'and')

		const tree = createGroup('and', [rule('a', 'and'), b, rule('c', 'and')])

		const next = moveChild(tree, 'a', 2)

		expect(next.children[0]).toBe(b)
	})

	it('clamps the target index to the group', () => {
		const tree = createGroup('and', [rule('a'), rule('b', 'and')])

		expect(ids(moveChild(tree, 'a', 99))).toEqual(['b', 'a'])

		expect(ids(moveChild(tree, 'b', -5))).toEqual(['b', 'a'])
	})

	it('moves a node inside a nested group, and keeps the other subtrees', () => {
		const head = rule('head')

		const inner = createGroup('or', [rule('x'), rule('y', 'and')])

		const tree = createGroup('and', [head, inner])

		const next = moveChild(tree, 'y', 0)

		expect(next.children[0]).toBe(head)

		expect(ids(next.children[1] as QueryGroup)).toEqual(['y', 'x'])
	})

	it('returns the same tree when the id is not found or the move changes nothing', () => {
		const tree = createGroup('and', [rule('a'), rule('b', 'and')])

		expect(moveChild(tree, 'missing', 0)).toBe(tree)

		expect(moveChild(tree, 'a', 0)).toBe(tree)
	})
})
