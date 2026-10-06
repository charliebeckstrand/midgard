import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import type { CalendarHandle } from '../../components/calendar'
import { useDatePickerRangeState } from '../../components/date-picker/use-date-picker-range-state'
import { makeKeyEvent } from '../helpers'

const Jan1 = new Date(2025, 0, 1)

const Jan10 = new Date(2025, 0, 10)

const Jan15 = new Date(2025, 0, 15)

const Jan20 = new Date(2025, 0, 20)

const Jan31 = new Date(2025, 0, 31)

// A Calendar handle whose grid entry is `date`. The Calendar owns the entry rule.
function entering(date: Date | null): CalendarHandle {
	return {
		prevMonth: vi.fn(),
		nextMonth: vi.fn(),
		openPicker: vi.fn(),
		footerKeyDown: vi.fn(),
		getEntryDate: () => date,
	}
}

// Local midnight on a day of January in year 1. The `Date` constructor reads year 1 as 1901.
function yearOneJanuary(date: number): Date {
	const value = new Date(0)

	value.setFullYear(1, 0, date)

	value.setHours(0, 0, 0, 0)

	return value
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

			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, onValueChange: onChange }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan10))

			expect(onChange).not.toHaveBeenCalled()

			expect(result.current.calendar.rangeStart).toEqual(Jan10)

			expect(result.current.calendar.rangeEnd).toBeNull()

			expect(result.current.open).toBe(true)
		})

		it('second click commits the range immediately and closes', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, onValueChange: onChange }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan10))

			act(() => result.current.calendar.onValueChange(Jan20))

			expect(result.current.open).toBe(false)

			// Committed on the closing click, not deferred to the exit animation.
			expect(onChange).toHaveBeenCalledTimes(1)

			expect(onChange).toHaveBeenCalledWith([Jan10, Jan20])

			// The exit-complete reset only clears in-progress state; it must not
			// re-commit.
			act(() => result.current.onExitComplete())

			expect(onChange).toHaveBeenCalledTimes(1)
		})

		it('swaps endpoints when the second click is earlier than the first', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, onValueChange: onChange }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan20))

			act(() => result.current.calendar.onValueChange(Jan10))

			expect(onChange).toHaveBeenCalledWith([Jan10, Jan20])
		})

		it('allows a same-day selection (start === end)', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, onValueChange: onChange }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan10))

			act(() => result.current.calendar.onValueChange(Jan10))

			expect(onChange).toHaveBeenCalledWith([Jan10, Jan10])
		})
	})

	describe('hover preview', () => {
		it('exposes hoverDate only while a range is being selected', () => {
			const { result } = renderHook(() => useDatePickerRangeState({ range: true }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onHoverDate(Jan10))

			// Before the first click, hover state is suppressed.
			expect(result.current.calendar.hoverDate).toBeNull()

			act(() => result.current.calendar.onValueChange(Jan10))

			act(() => result.current.calendar.onHoverDate(Jan20))

			expect(result.current.calendar.hoverDate).toEqual(Jan20)
		})

		it('clears hoverDate when the range is committed', () => {
			const { result } = renderHook(() => useDatePickerRangeState({ range: true }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan10))

			act(() => result.current.calendar.onHoverDate(Jan15))

			act(() => result.current.calendar.onValueChange(Jan20))

			act(() => result.current.onExitComplete())

			expect(result.current.calendar.hoverDate).toBeNull()
		})
	})

	describe('clear', () => {
		it('commits a null value immediately and closes', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRangeState({
					range: true,
					defaultValue: [Jan1, Jan31],
					onValueChange: onChange,
				}),
			)

			act(() => result.current.onOpenChange(true))

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
			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, defaultValue: [Jan1, Jan31] }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan10))

			expect(result.current.footer.footerButtons).toEqual([])
		})
	})

	describe('reopen after committed range', () => {
		it('starts a fresh selection (rangeStart cleared) when reopened', () => {
			const { result } = renderHook(() => useDatePickerRangeState({ range: true }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan10))

			act(() => result.current.calendar.onValueChange(Jan20))

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
		it('passes a date from calendar.onValueChange through without a clamp', () => {
			// The Calendar disables the days outside min/max, so the hook does not clamp
			// a clicked date. Only the keyboard cursor is clamped.
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRangeState({
					range: true,
					min: Jan10,
					max: Jan20,
					onValueChange: onChange,
				}),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan15))

			act(() => result.current.calendar.onValueChange(Jan20))

			expect(onChange).toHaveBeenCalledWith([Jan15, Jan20])
		})

		it('keeps the keyboard cursor inside min/max and commits the clamped range', () => {
			// Today is min, so the cursor starts on min.
			vi.useFakeTimers({ now: new Date(2025, 0, 10, 13, 30) })

			onTestFinished(() => {
				vi.useRealTimers()
			})

			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRangeState({
					range: true,
					min: Jan10,
					max: Jan20,
					onValueChange: onChange,
				}),
			)

			act(() => result.current.onOpenChange(true))

			// With no value and no range in progress, the cursor starts on today.
			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowRight')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Jan10 })

			// A step back from min stays on min.
			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowLeft')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Jan10 })

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('Enter')))

			// A month forward from the pinned start stops on max, and the hover
			// preview follows the cursor.
			act(() => result.current.onTriggerKeyDown(makeKeyEvent('PageDown')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Jan20 })

			expect(result.current.calendar.hoverDate).toEqual(Jan20)

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('Enter')))

			expect(onChange).toHaveBeenCalledWith([Jan10, Jan20])
		})

		it('clamps a Shift+PageUp year jump from the grid cursor to min', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, defaultValue: [Jan15, Jan20], min: Jan10 }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowRight')))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('PageUp', { shiftKey: true })))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Jan10 })

			// No range is in progress, so the move gives no hover preview.
			expect(result.current.calendar.hoverDate).toBeNull()
		})

		it('starts the cursor on today when there is no value and no min', () => {
			vi.useFakeTimers({ now: new Date(2025, 5, 15, 13, 30) })

			onTestFinished(() => {
				vi.useRealTimers()
			})

			const { result } = renderHook(() => useDatePickerRangeState({ range: true }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('PageDown')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: new Date(2025, 6, 15) })
		})

		// A past `min` bounds the cursor. It is not the start point.
		it('starts the cursor on today when there is no value and today is inside min/max', () => {
			vi.useFakeTimers({ now: new Date(2025, 5, 15, 13, 30) })

			onTestFinished(() => {
				vi.useRealTimers()
			})

			const { result } = renderHook(() => useDatePickerRangeState({ range: true, min: Jan15 }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowRight')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: new Date(2025, 5, 15) })
		})

		it('pins today as the start on Enter when there is no value and today is inside min/max', () => {
			vi.useFakeTimers({ now: new Date(2025, 5, 15, 13, 30) })

			onTestFinished(() => {
				vi.useRealTimers()
			})

			const { result } = renderHook(() => useDatePickerRangeState({ range: true, min: Jan15 }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('Enter')))

			expect(result.current.calendar.rangeStart).toEqual(new Date(2025, 5, 15))
		})
	})

	describe('grid entry from the header and the footer', () => {
		// Not an endpoint and not today, so only the Calendar can give it.
		const Mar5 = new Date(2025, 2, 5)

		it('enters the grid from the header on the entry day of the Calendar', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, defaultValue: [Jan10, Jan20] }),
			)

			act(() => result.current.onOpenChange(true))

			result.current.calendar.calendarRef.current = entering(Mar5)

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowUp', { shiftKey: true })))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowDown')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Mar5 })
		})

		it('enters the grid from the footer on the entry day of the Calendar', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, defaultValue: [Jan10, Jan20] }),
			)

			act(() => result.current.onOpenChange(true))

			result.current.calendar.calendarRef.current = entering(Mar5)

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowDown', { shiftKey: true })))

			expect(result.current.calendar.active).toEqual({ zone: 'footer', index: 0 })

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowUp')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Mar5 })
		})

		it('keeps the highlight in the header when the Calendar gives no entry day', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, defaultValue: [Jan10, Jan20] }),
			)

			act(() => result.current.onOpenChange(true))

			result.current.calendar.calendarRef.current = entering(null)

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowUp', { shiftKey: true })))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowDown')))

			expect(result.current.calendar.active).toEqual({ zone: 'header', index: 1 })
		})

		it('enters on the range start when no Calendar is mounted', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, defaultValue: [Jan10, Jan20] }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowUp', { shiftKey: true })))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowDown')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Jan10 })
		})
	})

	describe('year limits', () => {
		it('keeps the cursor and the hover on 1 January of year 1 when a step goes back', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({
					range: true,
					defaultValue: [yearOneJanuary(1), yearOneJanuary(5)],
				}),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowRight')))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('Enter')))

			expect(result.current.calendar.rangeStart).toEqual(yearOneJanuary(1))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowLeft')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: yearOneJanuary(1) })

			expect(result.current.calendar.hoverDate).toEqual(yearOneJanuary(1))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('PageUp')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: yearOneJanuary(1) })

			expect(result.current.calendar.hoverDate).toEqual(yearOneJanuary(1))
		})
	})

	describe('keyboard navigation', () => {
		it('materializes the grid cursor on the first arrow press after opening', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, defaultValue: [Jan10, Jan20] }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowRight')))

			// getInitialActiveDate falls back to value[0] when no range is in progress.
			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Jan10 })
		})

		it('previews the hovered endpoint as the grid cursor moves during selection', () => {
			const { result } = renderHook(() => useDatePickerRangeState({ range: true }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan10))

			// First arrow materializes the cursor on the start date.
			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowRight')))

			// Second arrow moves the cursor and drives the hover preview (range in progress).
			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowRight')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: new Date(2025, 0, 11) })

			expect(result.current.calendar.hoverDate).toEqual(new Date(2025, 0, 11))
		})

		it('does not emit a hover preview when moving the cursor with no range in progress', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, defaultValue: [Jan10, Jan20] }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowRight')))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowRight')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: new Date(2025, 0, 11) })

			expect(result.current.calendar.hoverDate).toBeNull()
		})

		it('activates the clear footer button via Shift+ArrowDown then Enter', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRangeState({
					range: true,
					defaultValue: [Jan1, Jan31],
					onValueChange: onChange,
				}),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('ArrowDown', { shiftKey: true })))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent('Enter')))

			expect(result.current.open).toBe(false)

			expect(onChange).toHaveBeenCalledWith(null)
		})

		it('is a no-op when footer keydown fires with no calendar handle mounted', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({ range: true, defaultValue: [Jan1, Jan31] }),
			)

			expect(() =>
				act(() => result.current.footer.onKeyDown(makeKeyEvent('ArrowDown'))),
			).not.toThrow()
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

			act(() => result.current.calendar.onValueChange(Jan10))

			act(() => result.current.calendar.onValueChange(Jan20))

			act(() => result.current.onClear())

			expect(onChange).not.toHaveBeenCalled()

			expect(result.current.calendar.rangeStart).toEqual(Jan1)

			expect(result.current.readOnly).toBe(true)
		})
	})
})
