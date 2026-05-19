import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
	resolveInputDisplay,
	selectActiveOrSingleOption,
} from '../../components/combobox/combobox-utilities'
import { useComboboxTrigger } from '../../components/combobox/use-combobox-trigger'

describe('resolveInputDisplay', () => {
	it('returns the query while the user is editing', () => {
		const result = resolveInputDisplay({
			editing: true,
			query: 'partial',
			value: 'real',
			displayValue: (v) => v as string,
			multiple: false,
		})

		expect(result).toBe('partial')
	})

	it('returns the displayed value when not editing in single-select mode', () => {
		const result = resolveInputDisplay({
			editing: false,
			query: '',
			value: { id: 1, name: 'Alice' },
			displayValue: (v) => (v as { name: string }).name,
			multiple: false,
		})

		expect(result).toBe('Alice')
	})

	it('returns an empty string in multi-select mode', () => {
		const result = resolveInputDisplay({
			editing: false,
			query: '',
			value: ['a', 'b'],
			displayValue: (v) => v as string,
			multiple: true,
		})

		expect(result).toBe('')
	})

	it('returns an empty string when there is no value', () => {
		const result = resolveInputDisplay<string>({
			editing: false,
			query: '',
			value: undefined,
			displayValue: (v) => v,
			multiple: false,
		})

		expect(result).toBe('')
	})

	it('returns an empty string when there is no displayValue', () => {
		const result = resolveInputDisplay({
			editing: false,
			query: '',
			value: 'x',
			multiple: false,
		})

		expect(result).toBe('')
	})
})

describe('selectActiveOrSingleOption', () => {
	it('clicks and returns true when exactly one option is present', () => {
		const container = document.createElement('div')

		const option = document.createElement('div')

		option.setAttribute('role', 'option')

		const clicked = vi.fn()

		option.addEventListener('click', clicked)

		container.appendChild(option)

		expect(selectActiveOrSingleOption(container)).toBe(true)

		expect(clicked).toHaveBeenCalled()
	})

	it('returns false when there is more than one option', () => {
		const container = document.createElement('div')

		const a = document.createElement('div')

		a.setAttribute('role', 'option')

		container.appendChild(a)

		const b = document.createElement('div')

		b.setAttribute('role', 'option')

		container.appendChild(b)

		expect(selectActiveOrSingleOption(container)).toBe(false)
	})

	it('returns false when there are no options', () => {
		const container = document.createElement('div')

		expect(selectActiveOrSingleOption(container)).toBe(false)
	})
})

describe('useComboboxTrigger', () => {
	function setupHook(open: boolean) {
		const close = vi.fn()

		const setOpen = vi.fn()

		const focus = vi.fn()

		const select = vi.fn()

		const inputRef = { current: { focus, select } as unknown as HTMLInputElement }

		const { result } = renderHook(() => useComboboxTrigger({ open, close, setOpen, inputRef }))

		return { result, close, setOpen, focus, select }
	}

	it('closes when invoked while open', () => {
		const { result, close, setOpen } = setupHook(true)

		const event = {
			preventDefault: vi.fn(),
		} as unknown as Parameters<typeof result.current.onMouseDown>[0]

		act(() => {
			result.current.onMouseDown(event)
		})

		expect(event.preventDefault).toHaveBeenCalled()

		expect(close).toHaveBeenCalled()

		expect(setOpen).not.toHaveBeenCalled()
	})

	it('opens, focuses and selects the input when invoked while closed', () => {
		const { result, setOpen, focus, select } = setupHook(false)

		const event = {
			preventDefault: vi.fn(),
		} as unknown as Parameters<typeof result.current.onMouseDown>[0]

		act(() => {
			result.current.onMouseDown(event)
		})

		expect(focus).toHaveBeenCalled()

		expect(select).toHaveBeenCalled()

		expect(setOpen).toHaveBeenCalledWith(true)
	})
})
