import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useComboboxState } from '../../components/combobox/use-combobox-state'

function setup<T>(overrides: Partial<Parameters<typeof useComboboxState<T>>[0]> = {}) {
	const setValue = vi.fn()

	const input = document.createElement('input')

	const focus = vi.spyOn(input, 'focus').mockImplementation(() => {})

	const inputRef = { current: input }

	const result = renderHook(() =>
		useComboboxState<T>({
			multiple: false,
			nullable: false,
			selectable: true,
			value: undefined,
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

	it('freezes the menu query through close so the filter holds during the exit animation', () => {
		const { result } = setup<string>()

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.setQuery('partial')
		})

		expect(result.current.menuDeferredQuery).toBe('partial')

		act(() => {
			result.current.close()
		})

		// The live query clears immediately, but the menu keeps filtering on the
		// pre-close snapshot so its content stays put while the panel animates out.
		expect(result.current.query).toBe('')

		expect(result.current.deferredQuery).toBe('')

		expect(result.current.menuQuery).toBe('partial')

		expect(result.current.menuDeferredQuery).toBe('partial')
	})

	it('releases the frozen menu query on flushPending (exit-complete)', () => {
		const { result } = setup<string>()

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.setQuery('partial')
		})

		act(() => {
			result.current.close()
		})

		act(() => {
			result.current.flushPending()
		})

		expect(result.current.menuQuery).toBe('')

		expect(result.current.menuDeferredQuery).toBe('')
	})

	it('releases the frozen menu query when the menu reopens mid-close', () => {
		const { result } = setup<string>()

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.setQuery('partial')
		})

		act(() => {
			result.current.close()
		})

		// Reopen before the exit animation completes: onExitComplete never fires,
		// so the reopen guard must clear the freeze instead.
		act(() => {
			result.current.setOpen(true)
		})

		expect(result.current.menuQuery).toBe('')

		expect(result.current.menuDeferredQuery).toBe('')
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
