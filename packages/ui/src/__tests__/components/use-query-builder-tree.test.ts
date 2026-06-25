import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { QueryField } from '../../modules/query'
import { useQueryBuilderTree } from '../../modules/query/query-builder/use-query-builder-tree'

const fields: QueryField[] = [
	{ name: 'name', label: 'Name', type: 'text' },
	{ name: 'age', label: 'Age', type: 'number' },
]

describe('useQueryBuilderTree', () => {
	it('seeds with an empty AND group when no defaultValue is provided', () => {
		const { result } = renderHook(() => useQueryBuilderTree({ fields }))

		expect(result.current.root.type).toBe('group')

		expect(result.current.root.combinator).toBe('and')

		expect(result.current.root.children).toHaveLength(0)
	})

	it('adds a rule via the addRule action', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useQueryBuilderTree({ fields, onValueChange }))

		act(() => {
			result.current.actions.addRule(result.current.root.id)
		})

		expect(onValueChange).toHaveBeenCalled()

		const next = onValueChange.mock.calls.at(-1)?.[0]

		expect(next.children).toHaveLength(1)

		expect(next.children[0].type).toBe('rule')
	})

	it('adds a nested group via the addGroup action', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useQueryBuilderTree({ fields, onValueChange }))

		act(() => {
			result.current.actions.addGroup(result.current.root.id)
		})

		const next = onValueChange.mock.calls.at(-1)?.[0]

		expect(next.children).toHaveLength(1)

		expect(next.children[0].type).toBe('group')

		expect(next.children[0].children).toHaveLength(1)
	})

	it('removes a child via the remove action', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useQueryBuilderTree({ fields, onValueChange }))

		act(() => {
			result.current.actions.addRule(result.current.root.id)
		})

		const added = onValueChange.mock.calls.at(-1)?.[0].children[0]

		act(() => {
			result.current.actions.remove(added.id)
		})

		const next = onValueChange.mock.calls.at(-1)?.[0]

		expect(next.children).toHaveLength(0)
	})

	it('updates a rule via the updateRule action', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useQueryBuilderTree({ fields, onValueChange }))

		act(() => {
			result.current.actions.addRule(result.current.root.id)
		})

		const added = onValueChange.mock.calls.at(-1)?.[0].children[0]

		act(() => {
			result.current.actions.updateRule(added.id, { value: 'alice' })
		})

		const next = onValueChange.mock.calls.at(-1)?.[0]

		expect(next.children[0].value).toBe('alice')
	})

	it('updates a group combinator via the updateCombinator action', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useQueryBuilderTree({ fields, onValueChange }))

		act(() => {
			result.current.actions.updateCombinator(result.current.root.id, 'or')
		})

		const next = onValueChange.mock.calls.at(-1)?.[0]

		expect(next.combinator).toBe('or')
	})

	it('supports a controlled value', () => {
		const value = {
			id: 'root',
			type: 'group' as const,
			combinator: 'or' as const,
			children: [],
		}

		const { result } = renderHook(() => useQueryBuilderTree({ fields, value }))

		expect(result.current.root).toBe(value)
	})
})
