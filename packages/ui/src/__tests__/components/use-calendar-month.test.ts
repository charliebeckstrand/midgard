import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useCalendarMonth } from '../../components/calendar/use-calendar-month'

describe('useCalendarMonth: initial viewDate', () => {
	it('seeds from value when one is supplied', () => {
		const { result } = renderHook(() =>
			useCalendarMonth({
				value: new Date(2026, 4, 15),
				activeGridDate: null,
			}),
		)

		expect(result.current.year).toBe(2026)

		expect(result.current.month).toBe(4)
	})

	it('seeds from defaultValue when value is undefined', () => {
		const { result } = renderHook(() =>
			useCalendarMonth({
				value: undefined,
				defaultValue: new Date(2026, 2, 1),
				activeGridDate: null,
			}),
		)

		expect(result.current.year).toBe(2026)

		expect(result.current.month).toBe(2)
	})

	it('seeds from today when neither value nor defaultValue is supplied', () => {
		const today = new Date()

		const { result } = renderHook(() =>
			useCalendarMonth({ value: undefined, activeGridDate: null }),
		)

		expect(result.current.year).toBe(today.getFullYear())

		expect(result.current.month).toBe(today.getMonth())
	})
})

describe('useCalendarMonth: navigation', () => {
	it('prevMonth steps to the previous month', () => {
		const value = new Date(2026, 4, 1)

		const { result } = renderHook(() => useCalendarMonth({ value, activeGridDate: null }))

		act(() => result.current.prevMonth())

		expect(result.current.month).toBe(3)
	})

	it('nextMonth steps to the next month', () => {
		const value = new Date(2026, 4, 1)

		const { result } = renderHook(() => useCalendarMonth({ value, activeGridDate: null }))

		act(() => result.current.nextMonth())

		expect(result.current.month).toBe(5)
	})

	it('steps once for each call in one batch', () => {
		const value = new Date(2026, 4, 1)

		const { result } = renderHook(() => useCalendarMonth({ value, activeGridDate: null }))

		// Each step applies to the last one, not to the month of the render.
		act(() => {
			result.current.nextMonth()

			result.current.nextMonth()
		})

		expect(result.current.month).toBe(6)
	})

	it('keeps the steppers across a month change', () => {
		const value = new Date(2026, 4, 1)

		const { result } = renderHook(() => useCalendarMonth({ value, activeGridDate: null }))

		const { prevMonth, nextMonth } = result.current

		act(() => nextMonth())

		expect(result.current.prevMonth).toBe(prevMonth)

		expect(result.current.nextMonth).toBe(nextMonth)
	})

	it('navigateTo jumps to an explicit year and month', () => {
		const { result } = renderHook(() =>
			useCalendarMonth({ value: undefined, activeGridDate: null }),
		)

		act(() => result.current.navigateTo(2027, 0))

		expect(result.current.year).toBe(2027)

		expect(result.current.month).toBe(0)
	})
})

describe('useCalendarMonth: re-anchoring', () => {
	it('snaps the view to the month of a new activeGridDate', () => {
		const initialProps: { value: Date; activeGridDate: Date | null } = {
			value: new Date(2026, 4, 1),
			activeGridDate: null,
		}

		const { result, rerender } = renderHook(
			(props: { value: Date; activeGridDate: Date | null }) => useCalendarMonth(props),
			{ initialProps },
		)

		expect(result.current.month).toBe(4)

		rerender({ value: new Date(2026, 4, 1), activeGridDate: new Date(2026, 8, 7) })

		expect(result.current.month).toBe(8)
	})

	it('does not re-anchor when the activeGridDate is in the same month already shown', () => {
		const initialProps: { value: Date; activeGridDate: Date | null } = {
			value: new Date(2026, 4, 1),
			activeGridDate: null,
		}

		const { result, rerender } = renderHook(
			(props: { value: Date; activeGridDate: Date | null }) => useCalendarMonth(props),
			{ initialProps },
		)

		// Same-month activeGridDate is a no-op against the current view.
		rerender({ value: new Date(2026, 4, 1), activeGridDate: new Date(2026, 4, 20) })

		expect(result.current.month).toBe(4)
	})

	it('snaps the view to the month of a newly-set value', () => {
		const { result, rerender } = renderHook(
			(props: { value: Date | undefined; activeGridDate: Date | null }) => useCalendarMonth(props),
			{ initialProps: { value: new Date(2026, 4, 1), activeGridDate: null } },
		)

		rerender({ value: new Date(2027, 0, 15), activeGridDate: null })

		expect(result.current.year).toBe(2027)

		expect(result.current.month).toBe(0)
	})

	it('keeps a stepped view when the value comes again as an equal Date', () => {
		// A new `Date` on each render, as a parent that derives the value inline.
		const { result, rerender } = renderHook(() =>
			useCalendarMonth({ value: new Date(2026, 4, 1), activeGridDate: null }),
		)

		act(() => result.current.nextMonth())

		rerender()

		expect(result.current.month).toBe(5)
	})

	it('snaps back for a new activeGridDate object on the same day', () => {
		const { result, rerender } = renderHook(
			(props: { activeGridDate: Date | null }) =>
				useCalendarMonth({
					value: undefined,
					defaultValue: new Date(2026, 4, 1),
					activeGridDate: props.activeGridDate,
				}),
			{ initialProps: { activeGridDate: new Date(2026, 4, 31) } },
		)

		act(() => result.current.nextMonth())

		expect(result.current.month).toBe(5)

		// A keyboard move that the parent clamps to the same day is still a move.
		rerender({ activeGridDate: new Date(2026, 4, 31) })

		expect(result.current.month).toBe(4)
	})

	it('does not snap when the new value is in the same month already shown', () => {
		const { result, rerender } = renderHook(
			(props: { value: Date | undefined; activeGridDate: Date | null }) => useCalendarMonth(props),
			{ initialProps: { value: new Date(2026, 4, 1), activeGridDate: null } },
		)

		rerender({ value: new Date(2026, 4, 20), activeGridDate: null })

		expect(result.current.month).toBe(4)
	})
})
