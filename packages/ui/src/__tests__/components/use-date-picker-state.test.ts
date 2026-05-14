import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDatePickerState } from '../../components/date-picker/use-date-picker-state'

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
	})
})
