import { act, renderHook } from '@testing-library/react'
import { describe, expect, vi } from 'vitest'
import { useDatePickerRangeState } from '../../components/date-picker/use-date-picker-range-state'
import { makeKeyEvent } from '../helpers'
import { it } from '../helpers/fake-clock'
import { expectAnnouncement } from '../helpers/live-region'

const Jan1 = new Date(2025, 0, 1)

const Jan10 = new Date(2025, 0, 10)

const Jan15 = new Date(2025, 0, 15)

const Jan20 = new Date(2025, 0, 20)

const Jan31 = new Date(2025, 0, 31)

type RangeOptions = Parameters<typeof useDatePickerRangeState>[0]

// Renders the range state with `options`, and opens the calendar.
function openRange(options: Omit<RangeOptions, 'range'> = {}) {
	const { result } = renderHook(() => useDatePickerRangeState({ range: true, ...options }))

	act(() => result.current.onOpenChange(true))

	return result
}

describe('useDatePickerRangeState', () => {
	describe('initial state', () => {
		it('starts closed with empty displayValue when no value is provided', () => {
			const { result } = renderHook(() => useDatePickerRangeState({ range: true }))

			expect(result.current.open).toBe(false)

			expect(result.current.displayValue).toBe('')
		})

		it('derives a non-empty displayValue from defaultValue', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, defaultValue: [Jan1, Jan31] }),
			)

			expect(result.current.displayValue).not.toBe('')
		})

		it('exposes value[0]/value[1] on calendar.rangeStart and calendar.rangeEnd while idle', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, defaultValue: [Jan1, Jan31] }),
			)

			expect(result.current.calendar.rangeStart).toEqual(Jan1)

			expect(result.current.calendar.rangeEnd).toEqual(Jan31)

			expect(result.current.calendar.hoverDate).toBeNull()
		})
	})

	describe('two-click range selection', () => {
		it('first click sets rangeStart and does not commit yet', () => {
			const onChange = vi.fn()

			const result = openRange({ onValueChange: onChange })

			act(() => result.current.calendar.onDayClick(Jan10))

			expect(onChange).not.toHaveBeenCalled()

			expect(result.current.calendar.rangeStart).toEqual(Jan10)

			expect(result.current.calendar.rangeEnd).toBeNull()

			expect(result.current.open).toBe(true)
		})

		it('second click commits the range immediately and closes', () => {
			const onChange = vi.fn()

			const result = openRange({ onValueChange: onChange })

			act(() => result.current.calendar.onDayClick(Jan10))

			act(() => result.current.calendar.onDayClick(Jan20))

			expect(result.current.open).toBe(false)

			// Committed on the closing click, not deferred to the exit animation.
			expect(onChange).toHaveBeenCalledExactlyOnceWith([Jan10, Jan20])

			// The exit-complete reset only clears in-progress state; it must not
			// re-commit.
			act(() => result.current.onExitComplete())

			expect(onChange).toHaveBeenCalledTimes(1)
		})

		it('swaps endpoints when the second click is earlier than the first', () => {
			const onChange = vi.fn()

			const result = openRange({ onValueChange: onChange })

			act(() => result.current.calendar.onDayClick(Jan20))

			act(() => result.current.calendar.onDayClick(Jan10))

			expect(onChange).toHaveBeenCalledWith([Jan10, Jan20])
		})

		it('allows a same-day selection (start === end)', () => {
			const onChange = vi.fn()

			const result = openRange({ onValueChange: onChange })

			act(() => result.current.calendar.onDayClick(Jan10))

			act(() => result.current.calendar.onDayClick(Jan10))

			expect(onChange).toHaveBeenCalledWith([Jan10, Jan10])
		})
	})

	describe('hover preview', () => {
		it('exposes hoverDate only while a range is being selected', () => {
			const result = openRange()

			act(() => result.current.calendar.onHoverDateChange(Jan10))

			// Before the first click, hover state is suppressed.
			expect(result.current.calendar.hoverDate).toBeNull()

			act(() => result.current.calendar.onDayClick(Jan10))

			act(() => result.current.calendar.onHoverDateChange(Jan20))

			expect(result.current.calendar.hoverDate).toEqual(Jan20)
		})

		it('clears hoverDate when the range is committed', () => {
			const result = openRange()

			act(() => result.current.calendar.onDayClick(Jan10))

			act(() => result.current.calendar.onHoverDateChange(Jan15))

			act(() => result.current.calendar.onDayClick(Jan20))

			act(() => result.current.onExitComplete())

			expect(result.current.calendar.hoverDate).toBeNull()
		})
	})

	describe('clear', () => {
		it('commits a null value immediately and closes', () => {
			const onChange = vi.fn()

			const result = openRange({ defaultValue: [Jan1, Jan31], onValueChange: onChange })

			act(() => result.current.footer.onClear())

			expect(result.current.open).toBe(false)

			expect(onChange).toHaveBeenCalledWith(null)
		})
	})

	describe('footerButtons', () => {
		it('shows clear when there is a committed value and no in-progress selection', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, defaultValue: [Jan1, Jan31] }),
			)

			expect(result.current.footer.footerButtons).toEqual(['clear'])
		})

		it('shows no footer buttons when there is no value', () => {
			const { result } = renderHook(() => useDatePickerRangeState({ range: true }))

			expect(result.current.footer.footerButtons).toEqual([])
		})

		it('hides clear while a range is being selected', () => {
			const result = openRange({ defaultValue: [Jan1, Jan31] })

			act(() => result.current.calendar.onDayClick(Jan10))

			expect(result.current.footer.footerButtons).toEqual([])
		})
	})

	describe('reopen after committed range', () => {
		it('starts a fresh selection (rangeStart cleared) when reopened', () => {
			const result = openRange()

			act(() => result.current.calendar.onDayClick(Jan10))

			act(() => result.current.calendar.onDayClick(Jan20))

			act(() => result.current.onExitComplete())

			act(() => result.current.onOpenChange(true))

			// After exit-complete, rangeStart is null; calendar surface mirrors the
			// committed value.
			expect(result.current.calendar.rangeStart).toEqual(Jan10)

			expect(result.current.calendar.rangeEnd).toEqual(Jan20)

			expect(result.current.calendar.hoverDate).toBeNull()
		})
	})

	describe('min/max clamping', () => {
		it('passes a date from calendar.onDayClick through without a clamp', () => {
			// The Calendar disables the days outside min/max, so the hook does not clamp
			// a clicked date. Only the keyboard cursor is clamped.
			const onChange = vi.fn()

			const result = openRange({ min: Jan10, max: Jan20, onValueChange: onChange })

			act(() => result.current.calendar.onDayClick(Jan15))

			act(() => result.current.calendar.onDayClick(Jan20))

			expect(onChange).toHaveBeenCalledWith([Jan15, Jan20])
		})
	})

	describe('keyboard', () => {
		it('opens from the closed trigger on ArrowDown and on Enter', () => {
			const { result } = renderHook(() => useDatePickerRangeState({ range: true }))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowDown')))

			expect(result.current.open).toBe(true)

			act(() => result.current.onOpenChange(false))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('Enter')))

			expect(result.current.open).toBe(true)
		})

		it('leaves the keys of the open dialog to the calendar', () => {
			const result = openRange({ defaultValue: [Jan1, Jan31] })

			const event = makeKeyEvent<HTMLElement>('ArrowRight')

			act(() => result.current.onTriggerKeyDown(event))

			expect(event.preventDefault).not.toHaveBeenCalled()

			expect(result.current.open).toBe(true)
		})

		it('previews the end of the range from the day that the focus reports', () => {
			const result = openRange()

			act(() => result.current.calendar.onDayClick(Jan10))

			act(() => result.current.calendar.onHoverDateChange(Jan15))

			expect(result.current.calendar.hoverDate).toEqual(Jan15)
		})

		it('announces the start and asks for the end after the first press', async () => {
			const result = openRange()

			act(() => result.current.calendar.onDayClick(Jan10))

			await expectAnnouncement('Start date Friday, January 10, 2025. Select the end date.')
		})
	})

	describe('readOnly', () => {
		// A controlled `open` shows the calendar past the open gate, so each writer
		// must refuse the value on its own.
		it('blocks every value write while the calendar is open', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRangeState({
					range: true,
					readOnly: true,
					open: true,
					value: [Jan1, Jan31],
					onValueChange: onChange,
				}),
			)

			act(() => result.current.calendar.onDayClick(Jan10))

			act(() => result.current.calendar.onDayClick(Jan20))

			act(() => result.current.onClear())

			expect(onChange).not.toHaveBeenCalled()

			expect(result.current.calendar.rangeStart).toEqual(Jan1)

			expect(result.current.readOnly).toBe(true)
		})
	})
})
