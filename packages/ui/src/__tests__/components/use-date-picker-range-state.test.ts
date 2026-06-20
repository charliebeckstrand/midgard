import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDatePickerRangeState } from '../../components/date-picker/use-date-picker-range-state'
import { makeKeyEvent } from '../helpers'

const Jan1 = new Date(2025, 0, 1)
const Jan10 = new Date(2025, 0, 10)
const Jan15 = new Date(2025, 0, 15)
const Jan20 = new Date(2025, 0, 20)
const Jan31 = new Date(2025, 0, 31)
const Feb15 = new Date(2025, 1, 15)

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
		it('commits an undefined value immediately and closes', () => {
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
			expect(onChange).toHaveBeenCalledWith(undefined)
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
		it('does not produce out-of-range selections via calendar.onValueChange', () => {
			// The hook trusts calendar.onValueChange to deliver an in-range date, but it
			// also clamps any keyboard-driven movement. As a sanity check, verify
			// onChange passes through user-supplied dates verbatim when within bounds.
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRangeState({
					range: true,
					min: Jan1,
					max: Jan31,
					onValueChange: onChange,
				}),
			)

			act(() => result.current.onOpenChange(true))

			act(() => result.current.calendar.onValueChange(Jan10))

			act(() => result.current.calendar.onValueChange(Jan20))

			expect(onChange).toHaveBeenCalledWith([Jan10, Jan20])
		})

		it('exposes Feb15 verbatim when supplied as defaultValue (no clamping at boundary)', () => {
			const { result } = renderHook(() =>
				useDatePickerRangeState({
					range: true,
					defaultValue: [Jan10, Feb15],
				}),
			)

			expect(result.current.calendar.rangeStart).toEqual(Jan10)
			expect(result.current.calendar.rangeEnd).toEqual(Feb15)
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

			expect(onChange).toHaveBeenCalledWith(undefined)
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
})
