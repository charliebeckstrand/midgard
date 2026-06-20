import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDatePickerState } from '../../components/date-picker/use-date-picker-state'
import { makeKeyEvent } from '../helpers'

const Jan1 = new Date(2025, 0, 1)
const Jan15 = new Date(2025, 0, 15)
const Feb1 = new Date(2025, 1, 1)

describe('useDatePickerState', () => {
	describe('initial state', () => {
		it('starts closed with empty displayValue when no value is provided', () => {
			const { result } = renderHook(() => useDatePickerState({}))

			expect(result.current.open).toBe(false)
			expect(result.current.displayValue).toBe('')
		})

		it('derives a non-empty displayValue from defaultValue', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			expect(result.current.displayValue).not.toBe('')
		})

		it('derives a non-empty displayValue from a controlled value', () => {
			const { result } = renderHook(() => useDatePickerState({ value: Jan15 }))

			expect(result.current.displayValue).not.toBe('')
		})

		it('exposes calendar.active as null while closed', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			expect(result.current.calendar.active).toBeNull()
		})
	})

	describe('open / close', () => {
		it('opens via onOpenChange(true)', () => {
			const { result } = renderHook(() => useDatePickerState({}))

			act(() => result.current.onOpenChange(true))

			expect(result.current.open).toBe(true)
		})

		it('closes via onOpenChange(false) and clears active', () => {
			const { result } = renderHook(() => useDatePickerState({}))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onOpenChange(false))

			expect(result.current.open).toBe(false)
			expect(result.current.calendar.active).toBeNull()
		})
	})

	describe('selection in uncontrolled mode', () => {
		it('commits the selected date and closes', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerState({ defaultValue: Jan1, onValueChange: onChange }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan15))

			expect(onChange).toHaveBeenCalledWith(Jan15)
			expect(result.current.calendar.value).toEqual(Jan15)
			expect(result.current.open).toBe(false)
		})

		it('clear resets the value to undefined and closes', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerState({ defaultValue: Jan15, onValueChange: onChange }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.footer.onClear())

			expect(onChange).toHaveBeenCalledWith(undefined)
			expect(result.current.calendar.value).toBeNull()
			expect(result.current.open).toBe(false)
		})

		it('today selects the current date and closes', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() => useDatePickerState({ onValueChange: onChange }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.footer.onToday())

			expect(onChange).toHaveBeenCalledTimes(1)
			expect(onChange.mock.calls[0]?.[0]).toBeInstanceOf(Date)
			expect(result.current.open).toBe(false)
		})

		it('clamps the today selection to max when today is out of range', () => {
			const onChange = vi.fn()

			const max = new Date(2020, 0, 1)

			const { result } = renderHook(() => useDatePickerState({ max, onValueChange: onChange }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.footer.onToday())

			const committed = onChange.mock.calls[0]?.[0] as Date

			expect(committed.getTime()).toBe(max.getTime())
		})
	})

	describe('selection in controlled mode', () => {
		it('does not mutate internal state; reports the new value via onValueChange', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerState({ value: Jan1, onValueChange: onChange }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan15))

			expect(onChange).toHaveBeenCalledWith(Jan15)
			expect(result.current.calendar.value).toEqual(Jan1)
			expect(result.current.open).toBe(false)
		})

		it('updates displayValue when the controlling value prop changes', () => {
			const { result, rerender } = renderHook(
				({ value }: { value: Date | undefined }) => useDatePickerState({ value }),
				{ initialProps: { value: undefined as Date | undefined } },
			)

			expect(result.current.displayValue).toBe('')

			rerender({ value: Feb1 })

			expect(result.current.displayValue).not.toBe('')
		})
	})

	describe('keyboard delegation', () => {
		const fakeKey = (key: string, shift = false) =>
			makeKeyEvent<HTMLElement>(key, { shiftKey: shift })

		it('opens the calendar when ArrowDown is pressed on a closed trigger', () => {
			const { result } = renderHook(() => useDatePickerState({}))

			act(() => {
				result.current.onTriggerKeyDown(fakeKey('ArrowDown'))
			})

			expect(result.current.open).toBe(true)
		})

		it('ignores keys when disabled is true', () => {
			const { result } = renderHook(() => useDatePickerState({ disabled: true }))

			act(() => {
				result.current.onTriggerKeyDown(fakeKey('ArrowDown'))
			})

			expect(result.current.open).toBe(false)
		})

		it('closes the calendar on Escape when open', () => {
			const { result } = renderHook(() => useDatePickerState({}))

			act(() => {
				result.current.onTriggerKeyDown(fakeKey('ArrowDown'))
			})

			act(() => {
				result.current.onTriggerKeyDown(fakeKey('Escape'))
			})

			expect(result.current.open).toBe(false)
		})

		it('materialises grid focus on the first arrow press after opening', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			act(() => {
				result.current.onTriggerKeyDown(fakeKey('ArrowDown'))
			})

			act(() => {
				result.current.onTriggerKeyDown(fakeKey('ArrowRight'))
			})

			expect(result.current.calendar.active?.zone).toBe('grid')
		})
	})

	describe('initial active date', () => {
		it('clamps the initial date to min when no value is set', () => {
			const { result } = renderHook(() =>
				useDatePickerState({ min: Jan15, max: new Date(2025, 11, 31) }),
			)

			// Open and trigger a grid materialisation to expose the initial active date.
			const fakeKey = (k: string) => makeKeyEvent<HTMLElement>(k)

			act(() => {
				result.current.onTriggerKeyDown(fakeKey('ArrowDown'))
			})

			act(() => {
				result.current.onTriggerKeyDown(fakeKey('ArrowRight'))
			})

			const active = result.current.calendar.active

			if (active?.zone !== 'grid') throw new Error('expected grid active zone')

			expect(active.date.getTime()).toBeGreaterThanOrEqual(Jan15.getTime())
		})
	})

	describe('footerButtons', () => {
		it('exposes only "today" when there is no value', () => {
			const { result } = renderHook(() => useDatePickerState({}))

			expect(result.current.footer.footerButtons).toEqual(['today'])
		})

		it('exposes "clear" and "today" once a value is set', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			expect(result.current.footer.footerButtons).toEqual(['clear', 'today'])
		})

		it('switches from ["today"] to ["clear","today"] after a selection', () => {
			const { result } = renderHook(() => useDatePickerState({}))

			expect(result.current.footer.footerButtons).toEqual(['today'])

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan15))

			expect(result.current.footer.footerButtons).toEqual(['clear', 'today'])
		})

		it('omits "today" when today is outside the min/max range', () => {
			const { result } = renderHook(() => useDatePickerState({ max: new Date(2020, 0, 1) }))

			expect(result.current.footer.footerButtons).toEqual([])
		})
	})
})
