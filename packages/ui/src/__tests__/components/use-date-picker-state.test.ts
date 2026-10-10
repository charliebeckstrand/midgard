import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CalendarHandle } from '../../components/calendar'
import { useDatePickerState } from '../../components/date-picker/use-date-picker-state'
import { attach, makeKeyEvent } from '../helpers'

const Jan1 = new Date(2025, 0, 1)

const Jan15 = new Date(2025, 0, 15)

const Feb1 = new Date(2025, 1, 1)

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

// Local midnight on 1 January of year 1. The `Date` constructor reads year 1 as 1901.
function firstDay(): Date {
	const value = new Date(0)

	value.setFullYear(1, 0, 1)

	value.setHours(0, 0, 0, 0)

	return value
}

// An arrow key or a Page key from a focused day button of the grid. The button has
// its date in `data-date`, and the key gets to the handler on the dialog.
function keyFromDay(key: string, date: string) {
	const dialog = attach(document.createElement('div'))

	const day = document.createElement('button')

	day.dataset.date = date

	dialog.append(day)

	return makeKeyEvent<HTMLElement>(key, { target: day, currentTarget: dialog })
}

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

		// C01: in input mode the close returns focus to the input, not to the first
		// button in the wrapper.
		it('returns focus to the input on close in input mode', () => {
			const { result } = renderHook(() => useDatePickerState({ input: true }))

			const wrapper = attach(document.createElement('div'))

			const button = document.createElement('button')

			const input = document.createElement('input')

			wrapper.append(button, input)

			act(() => {
				result.current.setReference(wrapper)

				result.current.inputRef.current = input
			})

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onOpenChange(false))

			expect(input).toHaveFocus()
		})
	})

	describe('selection in uncontrolled mode', () => {
		it('commits the selected date and closes', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerState({ defaultValue: Jan1, onValueChange: onChange }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onDayPress(Jan15))

			expect(onChange).toHaveBeenCalledWith(Jan15)

			expect(result.current.calendar.value).toEqual(Jan15)

			expect(result.current.open).toBe(false)
		})

		it('clear resets the value to null and closes', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerState({ defaultValue: Jan15, onValueChange: onChange }),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.footer.onClear())

			expect(onChange).toHaveBeenCalledWith(null)

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

			act(() => result.current.calendar.onDayPress(Jan15))

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

		it('materializes grid focus on the first arrow press after opening', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			act(() => {
				result.current.onTriggerKeyDown(fakeKey('ArrowDown'))
			})

			act(() => {
				result.current.onTriggerKeyDown(fakeKey('ArrowRight'))
			})

			expect(result.current.calendar.active?.zone).toBe('grid')
		})

		// B01-C12, Q8: the step starts on the focused day, not on the highlight.
		it('steps from a focused day button on an arrow', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(fakeKey('ArrowRight')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Jan15 })

			act(() => result.current.onTriggerKeyDown(keyFromDay('ArrowRight', '2025-01-20')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: new Date(2025, 0, 21) })
		})

		// B01-C12, Q11: a Page key from a focused day steps a month from that day.
		it('steps a month from a focused day button on PageDown', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(fakeKey('ArrowRight')))

			act(() => result.current.onTriggerKeyDown(keyFromDay('PageDown', '2025-01-20')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: new Date(2025, 1, 20) })
		})

		it('holds the step from a focused day button inside max', () => {
			const max = new Date(2025, 0, 20)

			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan1, max }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(fakeKey('ArrowRight')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Jan1 })

			act(() => result.current.onTriggerKeyDown(keyFromDay('ArrowDown', '2025-01-18')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: max })
		})
	})

	describe('initial active date', () => {
		it('clamps the initial date to min when no value is set', () => {
			// Today must fall before `min`. On the real clock, today can fall after
			// `max`, and then the cursor clamps to `max` and the case passes on it.
			vi.useFakeTimers({ now: new Date(2025, 0, 1, 13, 30) })

			onTestFinished(() => {
				vi.useRealTimers()
			})

			const { result } = renderHook(() =>
				useDatePickerState({ min: Jan15, max: new Date(2025, 11, 31) }),
			)

			// Open and trigger a grid materialization to expose the initial active date.
			const fakeKey = (k: string) => makeKeyEvent<HTMLElement>(k)

			act(() => {
				result.current.onTriggerKeyDown(fakeKey('ArrowDown'))
			})

			act(() => {
				result.current.onTriggerKeyDown(fakeKey('ArrowRight'))
			})

			const active = result.current.calendar.active

			expect(active).toEqual({ zone: 'grid', date: Jan15 })
		})

		// B02-C06: a past `min` bounds the cursor. It is not the start point.
		it('starts the cursor on today when no value is set and today is inside min/max', () => {
			vi.useFakeTimers({ now: new Date(2025, 5, 15, 13, 30) })

			onTestFinished(() => {
				vi.useRealTimers()
			})

			const { result } = renderHook(() => useDatePickerState({ min: Jan15 }))

			act(() => {
				result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowDown'))
			})

			act(() => {
				result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowRight'))
			})

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: new Date(2025, 5, 15) })
		})

		it('commits today on Enter when no value is set and today is inside min/max', () => {
			vi.useFakeTimers({ now: new Date(2025, 5, 15, 13, 30) })

			onTestFinished(() => {
				vi.useRealTimers()
			})

			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerState({ min: Jan15, onValueChange: onChange }),
			)

			act(() => {
				result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowDown'))
			})

			act(() => {
				result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('Enter'))
			})

			expect(onChange).toHaveBeenCalledWith(new Date(2025, 5, 15))
		})
	})

	describe('grid entry from the header and the footer', () => {
		// Not the value and not today, so only the Calendar can give it.
		const Mar10 = new Date(2025, 2, 10)

		it('enters the grid from the header on the entry day of the Calendar', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			act(() => result.current.onOpenChange(true))

			result.current.calendar.calendarRef.current = entering(Mar10)

			act(() =>
				result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowUp', { shiftKey: true })),
			)

			act(() => result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowDown')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Mar10 })
		})

		it('enters the grid from the footer on the entry day of the Calendar', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			act(() => result.current.onOpenChange(true))

			result.current.calendar.calendarRef.current = entering(Mar10)

			act(() =>
				result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowDown', { shiftKey: true })),
			)

			expect(result.current.calendar.active).toEqual({ zone: 'footer', index: 0 })

			act(() => result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowUp')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Mar10 })
		})

		// B01-C06: the first arrow with no highlight enters the shown month. Q5: with no
		// enabled day in the shown month, the arrow enters on the value.
		it.each<[string, Date | null, Date]>([
			['the entry day of the Calendar', Mar10, Mar10],
			['the value when the Calendar gives no entry day', null, Jan15],
		])('enters the grid on the first arrow on %s', (_name, entry, expected) => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			act(() => result.current.onOpenChange(true))

			result.current.calendar.calendarRef.current = entering(entry)

			act(() => result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowRight')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: expected })
		})

		it('keeps the highlight in the header when the Calendar gives no entry day', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			act(() => result.current.onOpenChange(true))

			result.current.calendar.calendarRef.current = entering(null)

			act(() =>
				result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowUp', { shiftKey: true })),
			)

			act(() => result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowDown')))

			expect(result.current.calendar.active).toEqual({ zone: 'header', index: 1 })
		})

		it('keeps the highlight in the footer when the Calendar gives no entry day', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			act(() => result.current.onOpenChange(true))

			result.current.calendar.calendarRef.current = entering(null)

			act(() =>
				result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowDown', { shiftKey: true })),
			)

			act(() => result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowUp')))

			expect(result.current.calendar.active).toEqual({ zone: 'footer', index: 0 })
		})

		it('enters on the value when no Calendar is mounted', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			act(() => result.current.onOpenChange(true))

			act(() =>
				result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowUp', { shiftKey: true })),
			)

			act(() => result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowDown')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: Jan15 })
		})
	})

	describe('year limits', () => {
		it('keeps the cursor on 1 January of year 1 when a step goes back', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: firstDay() }))

			act(() => result.current.onOpenChange(true))

			act(() => result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowRight')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: firstDay() })

			act(() => result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('ArrowLeft')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: firstDay() })

			act(() => result.current.onTriggerKeyDown(makeKeyEvent<HTMLElement>('PageUp')))

			expect(result.current.calendar.active).toEqual({ zone: 'grid', date: firstDay() })
		})
	})

	describe('footerButtons', () => {
		it('exposes "clear" and "today" once a value is set', () => {
			const { result } = renderHook(() => useDatePickerState({ defaultValue: Jan15 }))

			expect(result.current.footer.footerButtons).toEqual(['clear', 'today'])
		})

		it('switches from ["today"] to ["clear","today"] after a selection', () => {
			const { result } = renderHook(() => useDatePickerState({}))

			expect(result.current.footer.footerButtons).toEqual(['today'])

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onDayPress(Jan15))

			expect(result.current.footer.footerButtons).toEqual(['clear', 'today'])
		})

		it('omits "today" when today is outside the min/max range', () => {
			const { result } = renderHook(() => useDatePickerState({ max: new Date(2020, 0, 1) }))

			expect(result.current.footer.footerButtons).toEqual([])
		})
	})

	describe('readOnly', () => {
		// A controlled `open` shows the calendar past the open gate, so each writer
		// must refuse the value on its own.
		it('blocks every value write while the calendar is open', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerState({ readOnly: true, open: true, value: Jan15, onValueChange: onChange }),
			)

			act(() => result.current.calendar.onDayPress(Feb1))

			act(() => result.current.footer.onToday())

			act(() => result.current.onClear())

			act(() => result.current.setValue(Feb1))

			expect(onChange).not.toHaveBeenCalled()

			expect(result.current.readOnly).toBe(true)
		})
	})
})
