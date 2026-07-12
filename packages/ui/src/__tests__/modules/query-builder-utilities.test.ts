import { describe, expect, it } from 'vitest'
import { createGroup, createRule } from '../../modules/query/engine/query-node'
import type { QueryField } from '../../modules/query/engine/types'
import { findFocusTarget } from '../../modules/query/query-builder/query-builder-utilities'

const textField: QueryField = { name: 'title', label: 'Title', type: 'text' }

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
