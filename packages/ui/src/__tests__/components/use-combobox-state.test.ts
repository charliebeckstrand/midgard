import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
	routeFloatingOpenChange,
	useComboboxState,
} from '../../components/combobox/use-combobox-state'

function setup<T>(overrides: Partial<Parameters<typeof useComboboxState<T>>[0]> = {}) {
	const setValue = vi.fn()

	const input = document.createElement('input')

	const focus = vi.spyOn(input, 'focus').mockImplementation(() => {})

	const select = vi.spyOn(input, 'select').mockImplementation(() => {})

	const inputRef = { current: input }

	const result = renderHook(() =>
		useComboboxState<T>({
			multiple: false,
			nullable: false,
			value: undefined,
			setValue,
			inputRef,
			...overrides,
		}),
	)

	return { ...result, setValue, focus, select }
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

	it('reports an open once when each keystroke calls setOpen(true) again', () => {
		const onOpenChange = vi.fn()

		const { result } = setup<string>({ onOpenChange })

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.setOpen(true)
		})

		expect(onOpenChange.mock.calls).toEqual([[true]])
	})

	it('reports a close once when an outside press and then the blur call close()', () => {
		const onOpenChange = vi.fn()

		const { result } = setup<string>({ onOpenChange })

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.close()
		})

		act(() => {
			result.current.close()
		})

		expect(onOpenChange.mock.calls).toEqual([[true], [false]])
	})

	it('reports a close once when two calls of close() run in one batch', () => {
		const onOpenChange = vi.fn()

		const { result } = setup<string>({ onOpenChange })

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.close()

			result.current.close()
		})

		expect(onOpenChange.mock.calls).toEqual([[true], [false]])
	})

	it('reports a close to a consumer that keeps the panel closed after it asked for an open', () => {
		const onOpenChange = vi.fn()

		// AddressInput passes `open={ready && menuRequested}`, so the panel stays
		// closed until results arrive. The consumer still holds the open it asked
		// for, and only the close report clears it.
		const { result } = setup<string>({ open: false, onOpenChange })

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.close()
		})

		expect(onOpenChange.mock.calls).toEqual([[true], [false]])
	})

	it('reports an open again after the consumer closes a controlled panel itself', () => {
		const onOpenChange = vi.fn()

		const { result, rerender } = renderHook(
			({ open }: { open: boolean }) =>
				useComboboxState<string>({
					multiple: false,
					nullable: false,
					value: undefined,
					open,
					onOpenChange,
					setValue: vi.fn(),
					inputRef: { current: null },
				}),
			{ initialProps: { open: false } },
		)

		act(() => {
			result.current.setOpen(true)
		})

		rerender({ open: true })

		rerender({ open: false })

		act(() => {
			result.current.setOpen(true)
		})

		expect(onOpenChange.mock.calls).toEqual([[true], [true]])
	})

	it('reports a query only when it changes, so close() on an empty query reports nothing', () => {
		const onQueryChange = vi.fn()

		const { result } = setup<string>({ onQueryChange })

		act(() => {
			result.current.close()
		})

		act(() => {
			result.current.setQuery('tex')
		})

		act(() => {
			result.current.setQuery('tex')
		})

		act(() => {
			result.current.close()
		})

		act(() => {
			result.current.close()
		})

		expect(onQueryChange.mock.calls).toEqual([['tex'], ['']])
	})

	it('reports no query when a multi-select pick clears a query that is already empty', () => {
		const onQueryChange = vi.fn()

		const { result } = setup<string>({ multiple: true, onQueryChange })

		act(() => {
			result.current.select('x')
		})

		expect(onQueryChange).not.toHaveBeenCalled()
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

	it('keeps the close-time menu query when a second close() follows during the exit', () => {
		const { result } = setup<string>()

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.setQuery('partial')
		})

		// An outside press closes the panel, then the input blur calls close() again.
		act(() => {
			result.current.close()
		})

		act(() => {
			result.current.close()
		})

		expect(result.current.menuQuery).toBe('partial')

		expect(result.current.menuDeferredQuery).toBe('partial')
	})

	// A controlled owner can keep `open` true after close(). Then no exit
	// animation runs and no reopen comes, so nothing releases a snapshot. The
	// menu reads the live query and the live selection while the panel shows open.
	it('reads the live menu query after close() while a controlled open stays true', () => {
		const { result } = setup<string>({ open: true })

		act(() => {
			result.current.close()
		})

		act(() => {
			result.current.setQuery('te')
		})

		expect(result.current.menuQuery).toBe('te')

		expect(result.current.menuDeferredQuery).toBe('te')
	})

	it('reads the live selection after a pick while a controlled open stays true', () => {
		const { result, rerender } = renderHook(
			({ value }: { value: string | undefined }) =>
				useComboboxState<string>({
					multiple: false,
					nullable: false,
					value,
					open: true,
					setValue: vi.fn(),
					inputRef: { current: null },
				}),
			{ initialProps: { value: 'a' as string | undefined } },
		)

		act(() => {
			result.current.select('b')
		})

		rerender({ value: 'b' })

		expect(result.current.selectionValue).toBe('b')
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

	it('selects the input text on a multi-select pick, so the next keystroke replaces it', () => {
		const { result, select } = setup<string>({ multiple: true })

		act(() => {
			result.current.select('x')
		})

		// Leaving editing hands the input back to its resting display, which for a multi
		// selection is the summary of what is picked. Without the text selected, the next
		// keystroke appends to that summary and searches for "Texas (US)u".
		expect(select).toHaveBeenCalled()
	})

	it('does not select the input text on a single-select pick, which closes instead', () => {
		const { result, select } = setup<string>()

		act(() => {
			result.current.select('x')
		})

		// The panel closes and focus leaves the editing path entirely, so there is no
		// next keystroke to protect.
		expect(select).not.toHaveBeenCalled()
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

	// Enter on the selected option is a choice of the value that the combobox
	// holds. It ends as a pick ends, but with no toggle, so a `nullable` value
	// stays.
	it.each([
		['closes the panel when closeOnSelect is true', true],
		['keeps the panel open and clears the query when closeOnSelect is false', false],
	])('keep() %s, and leaves the value', (_name, closeOnSelect) => {
		const { result, setValue } = setup<string>({ nullable: true, value: 'x', closeOnSelect })

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.setEditing(true)
		})

		act(() => {
			result.current.setQuery('x')
		})

		act(() => {
			result.current.keep()
		})

		expect(result.current.open).toBe(!closeOnSelect)

		expect(result.current.query).toBe('')

		expect(result.current.editing).toBe(false)

		expect(setValue).not.toHaveBeenCalled()
	})
})

// CONVENTIONS.md §10.3 bars a drive of the outside press of floating-ui. The
// adapter is the seam: a pure callback over the close() and setOpen of the hook.
describe('routeFloatingOpenChange', () => {
	it('closes through close() on a dismissal, so the query and editing reset', () => {
		const { result } = setup<string>()

		act(() => {
			result.current.setOpen(true)
		})

		act(() => {
			result.current.setEditing(true)
		})

		act(() => {
			result.current.setQuery('partial')
		})

		act(() => {
			routeFloatingOpenChange(result.current.setOpen, result.current.close)(false)
		})

		expect(result.current.open).toBe(false)

		expect(result.current.query).toBe('')

		expect(result.current.editing).toBe(false)

		// close() freezes the filter, so the menu holds it through the exit.
		expect(result.current.menuQuery).toBe('partial')
	})

	it('gives an open to the guarded setter, so the lock holds', () => {
		const setOpen = vi.fn()

		const close = vi.fn()

		routeFloatingOpenChange(setOpen, close)(true)

		expect(setOpen).toHaveBeenCalledWith(true)

		expect(close).not.toHaveBeenCalled()
	})
})
