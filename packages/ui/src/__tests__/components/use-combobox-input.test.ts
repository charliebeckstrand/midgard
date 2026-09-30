import { renderHook } from '@testing-library/react'
import type { KeyboardEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useComboboxInput } from '../../components/combobox/use-combobox-input'
import { makeChangeEvent, makeFocusEvent, makeKeyEvent, makePointerEvent } from '../helpers'

/**
 * Build a closed-menu arrow key event whose `currentTarget` reports the input's
 * value and caret. `selectionStart` defaults to the value's end (collapsed
 * caret); pass `null` to model a selectionless input type.
 */
function arrowEvent(
	key: 'ArrowDown' | 'ArrowUp',
	value: string,
	selectionStart: number | null = value.length,
	selectionEnd: number | null = selectionStart,
): KeyboardEvent<HTMLInputElement> {
	return makeKeyEvent<HTMLInputElement>(key, {
		currentTarget: { value, selectionStart, selectionEnd } as unknown as HTMLInputElement,
	})
}

function setup<T>(overrides: Partial<Parameters<typeof useComboboxInput<T>>[0]> = {}) {
	const setValue = vi.fn()

	const setEditing = vi.fn()

	const setQuery = vi.fn()

	const setOpen = vi.fn()

	const openByArrowKey = vi.fn()

	const close = vi.fn()

	const rovingKeyDown = vi.fn()

	const keyboardSettled = vi.fn((cb: () => void) => cb())

	const floatingRef = { current: null as HTMLElement | null }

	const optionsRef = { current: null as HTMLDivElement | null }

	const { result } = renderHook(() =>
		useComboboxInput<T>({
			value: undefined as T | undefined,
			multiple: false,
			clearOnEmpty: false,
			floatingRef,
			optionsRef,
			open: true,
			setValue,
			setEditing,
			setQuery,
			setOpen,
			openByArrowKey,
			close,
			keyboardSettled,
			rovingKeyDown,
			...overrides,
		}),
	)

	return {
		result,
		setValue,
		setEditing,
		setQuery,
		setOpen,
		openByArrowKey,
		close,
		rovingKeyDown,
		floatingRef,
		optionsRef,
	}
}

describe('useComboboxInput onChange', () => {
	it('flips into editing mode, mirrors the query, and opens the panel', () => {
		const { result, setEditing, setQuery, setOpen } = setup<string>()

		const event = makeChangeEvent({ target: { value: 'partial' } as HTMLInputElement })

		result.current.onChange(event)

		expect(setEditing).toHaveBeenCalledWith(true)

		expect(setQuery).toHaveBeenCalledWith('partial')

		expect(setOpen).toHaveBeenCalledWith(true)
	})

	it('clears the value when clearOnEmpty is true and the input goes empty in single-select', () => {
		const { result, setValue } = setup<string>({ clearOnEmpty: true, value: 'x' })

		const event = makeChangeEvent({ target: { value: '' } as HTMLInputElement })

		result.current.onChange(event)

		expect(setValue).toHaveBeenCalledWith(undefined)
	})

	it('does not clear the value when clearOnEmpty is false', () => {
		const { result, setValue } = setup<string>({ value: 'x' })

		const event = makeChangeEvent({ target: { value: '' } as HTMLInputElement })

		result.current.onChange(event)

		expect(setValue).not.toHaveBeenCalled()
	})

	it('does not clear in multi-select mode', () => {
		const { result, setValue } = setup<string>({
			clearOnEmpty: true,
			multiple: true,
			value: ['x'],
		})

		const event = makeChangeEvent({ target: { value: '' } as HTMLInputElement })

		result.current.onChange(event)

		expect(setValue).not.toHaveBeenCalled()
	})
})

describe('useComboboxInput onFocus', () => {
	it('opens the panel via keyboardSettled', () => {
		const { result, setOpen } = setup<string>()

		result.current.onFocus()

		expect(setOpen).toHaveBeenCalledWith(true)
	})
})

describe('useComboboxInput onMouseDown', () => {
	function focusedInput() {
		const input = document.createElement('input')

		document.body.appendChild(input)

		input.focus()

		return input
	}

	it('opens the closed menu on a press into the focused input', () => {
		const { result, setOpen } = setup<string>({ open: false })

		const input = focusedInput()

		result.current.onMouseDown(makePointerEvent<HTMLInputElement>({ currentTarget: input }))

		expect(setOpen).toHaveBeenCalledWith(true)

		input.remove()
	})

	it('leaves a press into an unfocused input to onFocus', () => {
		const { result, setOpen } = setup<string>({ open: false })

		const input = document.createElement('input')

		result.current.onMouseDown(makePointerEvent<HTMLInputElement>({ currentTarget: input }))

		expect(setOpen).not.toHaveBeenCalled()
	})

	it('does nothing while the menu is open', () => {
		const { result, setOpen } = setup<string>({ open: true })

		const input = focusedInput()

		result.current.onMouseDown(makePointerEvent<HTMLInputElement>({ currentTarget: input }))

		expect(setOpen).not.toHaveBeenCalled()

		input.remove()
	})
})

describe('useComboboxInput onBlur', () => {
	it('closes and fires onTouched when focus leaves the floating element', () => {
		const onTouched = vi.fn()

		const { result, close, floatingRef } = setup<string>({ onTouched })

		floatingRef.current = document.createElement('div')

		const event = makeFocusEvent<HTMLInputElement>({
			relatedTarget: document.createElement('span'),
		})

		result.current.onBlur(event)

		expect(close).toHaveBeenCalled()

		expect(onTouched).toHaveBeenCalled()
	})

	it('keeps the panel open, and fires no onTouched, when focus moves inside the floating element', () => {
		const onTouched = vi.fn()

		const { result, close, floatingRef } = setup<string>({ onTouched })

		const floating = document.createElement('div')

		const inside = document.createElement('span')

		floating.appendChild(inside)

		floatingRef.current = floating

		const event = makeFocusEvent<HTMLInputElement>({ relatedTarget: inside })

		result.current.onBlur(event)

		expect(close).not.toHaveBeenCalled()

		expect(onTouched).not.toHaveBeenCalled()
	})
})

describe('useComboboxInput onKeyDown', () => {
	it('closes on Escape', () => {
		const { result, close, rovingKeyDown } = setup<string>()

		result.current.onKeyDown(makeKeyEvent<HTMLInputElement>('Escape'))

		expect(close).toHaveBeenCalled()

		expect(rovingKeyDown).not.toHaveBeenCalled()
	})

	it('selects the lone option on Enter when one is present', () => {
		const { result, optionsRef } = setup<string>()

		const container = document.createElement('div')

		const option = document.createElement('div')

		option.setAttribute('role', 'option')

		container.appendChild(option)

		optionsRef.current = container as HTMLDivElement

		const event = makeKeyEvent<HTMLInputElement>('Enter')

		result.current.onKeyDown(event)

		expect(event.preventDefault).toHaveBeenCalled()
	})

	it('forwards Enter to roving navigation when there is no lone option', () => {
		const { result, rovingKeyDown, optionsRef } = setup<string>()

		optionsRef.current = document.createElement('div') as HTMLDivElement

		const event = makeKeyEvent<HTMLInputElement>('Enter')

		result.current.onKeyDown(event)

		expect(rovingKeyDown).toHaveBeenCalled()
	})

	it('forwards other keys to roving navigation', () => {
		const { result, rovingKeyDown } = setup<string>()

		const event = makeKeyEvent<HTMLInputElement>('ArrowUp')

		result.current.onKeyDown(event)

		expect(rovingKeyDown).toHaveBeenCalledWith(event)
	})

	// Each row presses an arrow on a closed menu with the caret at `start`..`end`
	// of 'abc'. At the edge the arrow points past, it opens the menu; elsewhere it
	// is the textbox's own caret move, which roving handles.
	it.each<[string, 'ArrowDown' | 'ArrowUp', number | null, number | null, boolean]>([
		['opens on ArrowDown from the text end', 'ArrowDown', 3, 3, true],
		['moves the caret to the text end on ArrowDown from mid-value', 'ArrowDown', 1, 1, false],
		['opens on ArrowUp from the text start', 'ArrowUp', 0, 0, true],
		['moves the caret to the text start on ArrowUp from mid-value', 'ArrowUp', 2, 2, false],
		['opens on ArrowDown when the input reports no caret', 'ArrowDown', null, null, true],
		['opens on ArrowUp when the input reports no caret', 'ArrowUp', null, null, true],
		// Caret spans the whole value, so neither edge is a collapsed caret.
		['lets the textbox collapse a ranged selection on ArrowDown', 'ArrowDown', 0, 3, false],
		['lets the textbox collapse a ranged selection on ArrowUp', 'ArrowUp', 0, 3, false],
	])('%s', (_name, key, start, end, opens) => {
		const { result, openByArrowKey, rovingKeyDown } = setup<string>({ open: false })

		const event = arrowEvent(key, 'abc', start, end)

		result.current.onKeyDown(event)

		if (opens) {
			expect(openByArrowKey).toHaveBeenCalled()

			expect(event.preventDefault).toHaveBeenCalled()

			expect(rovingKeyDown).not.toHaveBeenCalled()
		} else {
			expect(openByArrowKey).not.toHaveBeenCalled()

			expect(event.preventDefault).not.toHaveBeenCalled()

			expect(rovingKeyDown).toHaveBeenCalledWith(event)
		}
	})

	it.each(['ArrowDown', 'ArrowUp'] as const)(
		'opens the closed menu on %s when the value is empty',
		(key) => {
			const { result, openByArrowKey } = setup<string>({ open: false })

			const event = arrowEvent(key, '')

			result.current.onKeyDown(event)

			expect(openByArrowKey).toHaveBeenCalled()

			expect(event.preventDefault).toHaveBeenCalled()
		},
	)

	it('forwards ArrowDown to roving navigation once the menu is open', () => {
		const { result, openByArrowKey, rovingKeyDown } = setup<string>({ open: true })

		const event = makeKeyEvent<HTMLInputElement>('ArrowDown')

		result.current.onKeyDown(event)

		expect(openByArrowKey).not.toHaveBeenCalled()

		expect(rovingKeyDown).toHaveBeenCalledWith(event)
	})

	it('leaves Shift+ArrowDown to the textbox even while the menu is closed', () => {
		const { result, openByArrowKey, rovingKeyDown } = setup<string>({ open: false })

		const event = makeKeyEvent<HTMLInputElement>('ArrowDown', { shiftKey: true })

		result.current.onKeyDown(event)

		expect(openByArrowKey).not.toHaveBeenCalled()

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect(rovingKeyDown).not.toHaveBeenCalled()
	})

	it('leaves Shift+Arrow to the textbox so it extends the text selection', () => {
		const { result, rovingKeyDown } = setup<string>()

		for (const key of ['ArrowUp', 'ArrowDown']) {
			const event = makeKeyEvent<HTMLInputElement>(key, { shiftKey: true })

			result.current.onKeyDown(event)

			expect(event.preventDefault).not.toHaveBeenCalled()
		}

		expect(rovingKeyDown).not.toHaveBeenCalled()
	})
	describe('a pasted list', () => {
		function paste(defaultPrevented: boolean) {
			return {
				defaultPrevented,
				preventDefault: vi.fn(),
			} as unknown as Parameters<ReturnType<typeof useComboboxInput<string>>['onPaste']>[0]
		}

		it('drops the draft it replaced once the handler takes the paste', () => {
			const onPaste = vi.fn()

			const { result, setQuery, setEditing } = setup<string>({ onPaste })

			result.current.onPaste(paste(true))

			expect(onPaste).toHaveBeenCalled()

			// A handler that prevented the default read the clipboard and turned it into a selection, so
			// the query it pasted over is spent — left in place the field stays `editing`, which
			// suppresses the resting display (and any placeholder standing in for it) behind text the
			// consumer has already committed.
			expect(setQuery).toHaveBeenCalledWith('')

			expect(setEditing).toHaveBeenCalledWith(false)
		})

		it('leaves an unconsumed paste to land at the caret as typing', () => {
			const onPaste = vi.fn()

			const { result, setQuery, setEditing } = setup<string>({ onPaste })

			result.current.onPaste(paste(false))

			expect(onPaste).toHaveBeenCalled()

			// A paste with no delimiter is one value dropped into a draft mid-edit; clearing there would
			// eat the very keystrokes it was pasted into.
			expect(setQuery).not.toHaveBeenCalled()

			expect(setEditing).not.toHaveBeenCalled()
		})

		it('is inert with no handler, so an ordinary combobox pastes as it always did', () => {
			const { result, setQuery, setEditing } = setup<string>()

			result.current.onPaste(paste(false))

			expect(setQuery).not.toHaveBeenCalled()

			expect(setEditing).not.toHaveBeenCalled()
		})
	})
})
