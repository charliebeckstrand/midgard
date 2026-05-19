import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useComboboxState } from '../../components/combobox/use-combobox-state'

function setup<T>(overrides: Partial<Parameters<typeof useComboboxState<T>>[0]> = {}) {
	const setValue = vi.fn()
	const focus = vi.fn()

	const inputRef = { current: { focus } as unknown as HTMLInputElement }

	const result = renderHook(() =>
		useComboboxState<T>({
			multiple: false,
			nullable: false,
			selectable: true,
			setValue,
			inputRef,
			...overrides,
		}),
	)

	return { ...result, setValue, focus }
}

describe('useComboboxState', () => {
	it('starts with an empty query and closed', () => {
		const { result } = setup<string>()

		expect(result.current.query).toBe('')

		expect(result.current.open).toBe(false)
	})

	it('fires onQueryChange when setQuery is called', () => {
		const onQueryChange = vi.fn()

		const { result } = setup<string>({ onQueryChange })

		act(() => {
			result.current.setQuery('hello')
		})

		expect(result.current.query).toBe('hello')

		expect(onQueryChange).toHaveBeenCalledWith('hello')
	})

	it('fires onOpenChange when setOpen is called', () => {
		const onOpenChange = vi.fn()

		const { result } = setup<string>({ onOpenChange })

		act(() => {
			result.current.setOpen(true)
		})

		expect(result.current.open).toBe(true)

		expect(onOpenChange).toHaveBeenCalledWith(true)
	})

	it('honors a controlled open prop', () => {
		const onOpenChange = vi.fn()

		const { result } = setup<string>({ open: true, onOpenChange })

		expect(result.current.open).toBe(true)

		act(() => {
			result.current.setOpen(false)
		})

		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	it('resets editing and query when close() is called', () => {
		const { result } = setup<string>()

		act(() => {
			result.current.setEditing(true)
		})

		act(() => {
			result.current.setQuery('partial')
		})

		act(() => {
			result.current.close()
		})

		expect(result.current.query).toBe('')

		expect(result.current.editing).toBe(false)
	})

	it('falls back to onValueChange when selectable is false', () => {
		const onValueChange = vi.fn()

		const { result } = setup<string>({ selectable: false, onValueChange })

		act(() => {
			result.current.select('x')
		})

		expect(onValueChange).toHaveBeenCalledWith('x')
	})

	it('refocuses the input and clears the query in multi-select mode', () => {
		const { result, focus } = setup<string>({ multiple: true })

		act(() => {
			result.current.setQuery('partial')
		})

		act(() => {
			result.current.select('x')
		})

		expect(focus).toHaveBeenCalled()

		expect(result.current.query).toBe('')
	})

	it('closes the panel on select in single-select mode', () => {
		const { result } = setup<string>()

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.select('x')
		})

		expect(result.current.open).toBe(false)
	})

	it('keeps the panel open on select when closeOnSelect is false', () => {
		const { result } = setup<string>({ closeOnSelect: false })

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.select('x')
		})

		expect(result.current.open).toBe(true)
	})
})
