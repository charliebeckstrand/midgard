import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { QueryField } from '../../modules/query'
import { useQueryBuilderTree } from '../../modules/query/query-builder/use-query-builder-tree'

const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{ name: 'age', label: 'Age', type: 'number' },
]

// Tree-state mechanics live with the headless hook (use-query-tree.test.ts);
// these cases cover what the builder wrapper adds — the focus registry and its
// focus-aware `remove`.
describe('useQueryBuilderTree', () => {
	it('exposes a focus register alongside the tree and actions', () => {
		const { result } = renderHook(() => useQueryBuilderTree({ fields }))

		expect(result.current.root.type).toBe('group')

		expect(typeof result.current.register).toBe('function')

		expect(typeof result.current.actions.remove).toBe('function')
	})

	it('removes a node through the focus-aware remove wrapper', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useQueryBuilderTree({ fields, onValueChange }))

		act(() => {
			result.current.actions.addRule(result.current.root.id)
		})

		const added = onValueChange.mock.calls.at(-1)?.[0].children[0]

		act(() => {
			result.current.actions.remove(added.id)
		})

		expect(onValueChange.mock.calls.at(-1)?.[0].children).toHaveLength(0)
	})
})
