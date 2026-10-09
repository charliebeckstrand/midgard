import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { QueryField } from '../../modules/query'
import { focusKeys } from '../../modules/query/query-builder/query-builder-focus'
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

	it('skips a disabled target and focuses the next live one, as the focus ladder says', () => {
		const onValueChange = vi.fn()

		const { result } = renderHook(() => useQueryBuilderTree({ fields, onValueChange }))

		for (let i = 0; i < 3; i++) {
			act(() => {
				result.current.actions.addRule(result.current.root.id)
			})
		}

		const [first, middle, last] = onValueChange.mock.calls.at(-1)?.[0].children ?? []

		const button = (disabled: boolean) => {
			const el = document.createElement('button')

			el.disabled = disabled

			document.body.append(el)

			return el
		}

		const previous = button(true)

		const next = button(false)

		act(() => {
			result.current.register(focusKeys.node(first.id), previous)

			result.current.register(focusKeys.node(last.id), next)
		})

		act(() => {
			result.current.actions.remove(middle.id)
		})

		expect(document.activeElement).toBe(next)

		previous.remove()

		next.remove()
	})
})
