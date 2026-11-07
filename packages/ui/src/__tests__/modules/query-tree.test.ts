// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import {
	addChild,
	findParent,
	mapNode,
	moveChild,
	moveChildInto,
	removeChild,
} from '../../modules/query/engine/query-tree'
import type { QueryField, QueryGroup, QueryNode, QueryRule } from '../../modules/query/engine/types'

const textField: QueryField = { name: 'title', label: 'Title', type: 'text' }

const numberField: QueryField = { name: 'age', label: 'Age', type: 'number' }

describe('mapNode', () => {
	it('replaces a top-level node identified by id', () => {
		const rule = createRule(textField)

		const tree = createGroup('and', [rule])

		const replacement: QueryRule = { ...rule, field: 'replaced' }

		const next = mapNode(tree, rule.id, () => replacement)

		expect(next.children[0]).toBe(replacement)
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

	it('returns the same tree when parentId is not found', () => {
		const tree = createGroup()

		expect(addChild(tree, 'missing', createRule(textField))).toBe(tree)
	})

	it('preserves unrelated siblings when inserting into a nested group', () => {
		const leafA = createRule(textField)

		const inner = createGroup('or', [createRule(numberField)])

		const tree = createGroup('and', [leafA, inner])

		const rule = createRule(textField)

		const next = addChild(tree, inner.id, rule)

		expect(next.children[0]).toBe(leafA)

		const innerNext = next.children[1] as { children: QueryNode[] }

		expect(innerNext.children).toHaveLength(2)

		expect(innerNext.children[1]).toBe(rule)
	})
})

describe('removeChild', () => {
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

describe('moveChildInto', () => {
	/** A rule with a fixed id and combinator, so a test reads the order at a glance. */
	const rule = (id: string, combinator?: 'and' | 'or'): QueryRule => ({
		id,
		type: 'rule',
		...(combinator ? { combinator } : {}),
		field: 'title',
		operator: 'contains',
		value: id,
	})

	const group = (id: string, children: QueryNode[], combinator?: 'and' | 'or'): QueryGroup => ({
		id,
		type: 'group',
		...(combinator ? { combinator } : {}),
		children,
	})

	const ids = (node: QueryGroup) => node.children.map((child) => child.id)

	const combinators = (node: QueryGroup) => node.children.map((child) => child.combinator)

	const at = (tree: QueryGroup, id: string) => {
		const found = findParent(tree, id)?.children.find((child) => child.id === id)

		if (found?.type !== 'group') throw new Error(`expected group ${id}`)

		return found
	}

	/** The root holds a, the group g of x and y, and b. */
	const tree = () =>
		group('root', [rule('a'), group('g', [rule('x'), rule('y', 'or')], 'and'), rule('b', 'and')])

	it('moves a rule into a sibling group at the index', () => {
		const next = moveChildInto(tree(), 'a', 'g', 1)

		expect(ids(next)).toEqual(['g', 'b'])

		expect(ids(at(next, 'g'))).toEqual(['x', 'a', 'y'])
	})

	it('moves a rule out of a nested group into an ancestor', () => {
		const next = moveChildInto(tree(), 'y', 'root', 2)

		expect(ids(next)).toEqual(['a', 'g', 'y', 'b'])

		expect(ids(at(next, 'g'))).toEqual(['x'])
	})

	it('moves a group with its subtree', () => {
		const start = group('root', [group('g', [rule('x')]), group('h', [rule('z')], 'or')])

		const next = moveChildInto(start, 'g', 'h', 1)

		expect(ids(next)).toEqual(['h'])

		expect(ids(at(next, 'h'))).toEqual(['z', 'g'])

		expect(ids(at(next, 'g'))).toEqual(['x'])
	})

	it('gives the node the combinator of the node that it displaces', () => {
		const start = group('root', [
			rule('a'),
			group('g', [rule('x'), rule('y', 'or'), rule('z', 'and')]),
		])

		const next = at(moveChildInto(start, 'a', 'g', 2), 'g')

		expect(ids(next)).toEqual(['x', 'y', 'a', 'z'])

		// a takes the AND of z, and y and z keep theirs.
		expect(combinators(next)).toEqual([undefined, 'or', 'and', 'and'])
	})

	it('gives a node at the end the combinator of the node before it', () => {
		const start = group('root', [rule('a', 'and'), group('g', [rule('x'), rule('y', 'or')])])

		const next = at(moveChildInto(start, 'a', 'g', 9), 'g')

		expect(ids(next)).toEqual(['x', 'y', 'a'])

		expect(combinators(next)).toEqual([undefined, 'or', 'or'])
	})

	it('gives the second node of a group AND, because the first hides its combinator', () => {
		const start = group('root', [rule('a', 'or'), group('g', [rule('x', 'or')])])

		const next = at(moveChildInto(start, 'a', 'g', 1), 'g')

		expect(combinators(next)).toEqual(['or', 'and'])
	})

	it('shows a combinator on the first node that the move displaces', () => {
		const start = group('root', [
			rule('a', 'and'),
			group('g', [rule('x', 'and'), rule('y', 'or'), rule('z', 'or')]),
		])

		const next = at(moveChildInto(start, 'a', 'g', 0), 'g')

		expect(ids(next)).toEqual(['a', 'x', 'y', 'z'])

		// a takes the hidden place of x, and x takes the OR of y, the node after it.
		expect(combinators(next)).toEqual(['and', 'or', 'or', 'or'])
	})

	it('moves a node into an empty group', () => {
		const start = group('root', [rule('a', 'or'), group('g', [])])

		const next = at(moveChildInto(start, 'a', 'g', 0), 'g')

		expect(ids(next)).toEqual(['a'])

		expect(combinators(next)).toEqual(['and'])
	})

	it('keeps the combinator of the node after the node that leaves', () => {
		const start = group('root', [
			rule('a'),
			rule('b', 'or'),
			rule('c', 'and'),
			group('g', [rule('x')]),
		])

		const next = moveChildInto(start, 'b', 'g', 1)

		expect(ids(next)).toEqual(['a', 'c', 'g'])

		expect(combinators(next)).toEqual([undefined, 'and', undefined])
	})

	it('keeps the subtrees that the move does not touch', () => {
		const start = group('root', [
			group('g', [rule('x'), rule('y', 'and')]),
			group('h', [rule('z')]),
			group('k', [rule('w')]),
		])

		const next = moveChildInto(start, 'y', 'h', 1)

		expect(next.children[2]).toBe(start.children[2])
	})

	it('moves a node inside its own group as moveChild does', () => {
		const start = tree()

		expect(moveChildInto(start, 'a', 'root', 2)).toEqual(moveChild(start, 'a', 2))
	})

	it('returns the same tree for a group in the subtree of the node, or a missing node', () => {
		const start = group('root', [
			group('g', [group('h', [rule('x')]), rule('y', 'and')]),
			rule('a', 'and'),
		])

		expect(moveChildInto(start, 'g', 'g', 0)).toBe(start)

		expect(moveChildInto(start, 'g', 'h', 0)).toBe(start)

		expect(moveChildInto(start, 'missing', 'root', 0)).toBe(start)

		expect(moveChildInto(start, 'a', 'missing', 0)).toBe(start)

		// A rule is not a group that takes children.
		expect(moveChildInto(start, 'y', 'a', 0)).toBe(start)

		// The root has no parent, so it does not move.
		expect(moveChildInto(start, 'root', 'g', 0)).toBe(start)
	})
})

describe('findParent', () => {
	it('finds the group that holds a node, and no group for the root', () => {
		const inner = createGroup('and', [createRule(textField)])

		const tree = createGroup('and', [createRule(textField), inner])

		const leaf = inner.children[0]

		if (!leaf) throw new Error('expected a rule')

		expect(findParent(tree, leaf.id)).toBe(inner)

		expect(findParent(tree, inner.id)).toBe(tree)

		expect(findParent(tree, tree.id)).toBeUndefined()
	})
})
