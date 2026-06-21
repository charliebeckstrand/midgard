import { renderHook } from '@testing-library/react'
import type { KeyboardEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useComboboxInput } from '../../components/combobox/use-combobox-input'
import { makeChangeEvent, makeFocusEvent, makeKeyEvent } from '../helpers'

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

describe('useComboboxInput onBlur', () => {
	it('closes when focus leaves the floating element', () => {
		const { result, close, floatingRef } = setup<string>()

		floatingRef.current = document.createElement('div')

		const event = makeFocusEvent<HTMLInputElement>({
			relatedTarget: document.createElement('span'),
		})

		result.current.onBlur(event)

		expect(close).toHaveBeenCalled()
	})

	it('keeps the panel open when focus moves inside the floating element', () => {
		const { result, close, floatingRef } = setup<string>()

		const floating = document.createElement('div')

		const inside = document.createElement('span')

		floating.appendChild(inside)

		floatingRef.current = floating

		const event = makeFocusEvent<HTMLInputElement>({ relatedTarget: inside })

		result.current.onBlur(event)

		expect(close).not.toHaveBeenCalled()
	})

	it('fires onTouched when focus leaves the floating element', () => {
		const onTouched = vi.fn()

		const { result, floatingRef } = setup<string>({ onTouched })

		floatingRef.current = document.createElement('div')

		const event = makeFocusEvent<HTMLInputElement>({
			relatedTarget: document.createElement('span'),
		})

		result.current.onBlur(event)

		expect(onTouched).toHaveBeenCalled()
	})

	it('does not fire onTouched when focus moves inside the floating element', () => {
		const onTouched = vi.fn()

		const { result, floatingRef } = setup<string>({ onTouched })

		const floating = document.createElement('div')

		const inside = document.createElement('span')

		floating.appendChild(inside)

		floatingRef.current = floating

		const event = makeFocusEvent<HTMLInputElement>({ relatedTarget: inside })

		result.current.onBlur(event)

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

	it('opens the closed menu on ArrowDown from the text end, without delegating to roving', () => {
		const { result, openByArrowKey, rovingKeyDown } = setup<string>({ open: false })

		const event = arrowEvent('ArrowDown', 'abc')

		result.current.onKeyDown(event)

		expect(openByArrowKey).toHaveBeenCalled()

		expect(event.preventDefault).toHaveBeenCalled()

		expect(rovingKeyDown).not.toHaveBeenCalled()
	})

	it('moves the caret to the text end on ArrowDown from mid-value instead of opening', () => {
		const { result, openByArrowKey, rovingKeyDown } = setup<string>({ open: false })

		const event = arrowEvent('ArrowDown', 'abc', 1)

		result.current.onKeyDown(event)

		expect(openByArrowKey).not.toHaveBeenCalled()

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect(rovingKeyDown).toHaveBeenCalledWith(event)
	})

	it('opens the closed menu on ArrowUp from the text start, without delegating to roving', () => {
		const { result, openByArrowKey, rovingKeyDown } = setup<string>({ open: false })

		const event = arrowEvent('ArrowUp', 'abc', 0)

		result.current.onKeyDown(event)

		expect(openByArrowKey).toHaveBeenCalled()

		expect(event.preventDefault).toHaveBeenCalled()

		expect(rovingKeyDown).not.toHaveBeenCalled()
	})

	it('moves the caret to the text start on ArrowUp from mid-value instead of opening', () => {
		const { result, openByArrowKey, rovingKeyDown } = setup<string>({ open: false })

		const event = arrowEvent('ArrowUp', 'abc', 2)

		result.current.onKeyDown(event)

		expect(openByArrowKey).not.toHaveBeenCalled()

		expect(event.preventDefault).not.toHaveBeenCalled()

		expect(rovingKeyDown).toHaveBeenCalledWith(event)
	})

	it('opens the closed menu on either arrow when the value is empty', () => {
		for (const key of ['ArrowDown', 'ArrowUp'] as const) {
			const { result, openByArrowKey } = setup<string>({ open: false })

			const event = arrowEvent(key, '')

			result.current.onKeyDown(event)

			expect(openByArrowKey).toHaveBeenCalled()

			expect(event.preventDefault).toHaveBeenCalled()
		}
	})

	it('opens the closed menu on either arrow when the input reports no caret', () => {
		for (const key of ['ArrowDown', 'ArrowUp'] as const) {
			const { result, openByArrowKey } = setup<string>({ open: false })

			const event = arrowEvent(key, 'abc', null, null)

			result.current.onKeyDown(event)

			expect(openByArrowKey).toHaveBeenCalled()

			expect(event.preventDefault).toHaveBeenCalled()
		}
	})

	it('lets the textbox collapse a ranged selection before opening, on either arrow', () => {
		for (const key of ['ArrowDown', 'ArrowUp'] as const) {
			const { result, openByArrowKey, rovingKeyDown } = setup<string>({ open: false })

			// Caret spans the whole value, so neither edge is a collapsed caret.
			const event = arrowEvent(key, 'abc', 0, 3)

			result.current.onKeyDown(event)

			expect(openByArrowKey).not.toHaveBeenCalled()

			expect(event.preventDefault).not.toHaveBeenCalled()

			expect(rovingKeyDown).toHaveBeenCalledWith(event)
		}
	})

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
})
