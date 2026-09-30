import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_RELATIVE_PRESETS } from '../../components/date-picker/date-picker-relative-utilities'
import { useDatePickerRelativeState } from '../../components/date-picker/use-date-picker-relative-state'
import { attach, makeKeyEvent } from '../helpers'

const [today, yesterday] = DEFAULT_RELATIVE_PRESETS

if (!today || !yesterday) throw new Error('The default presets changed.')

const Jan1 = new Date(2025, 0, 1)

const Jan31 = new Date(2025, 0, 31)

// A list surface with two preset rows and the custom row, on the body so that
// `focus()` moves `document.activeElement`.
function listSurface() {
	const list = attach(document.createElement('div'))

	list.innerHTML =
		'<button data-relative-preset>A</button><button data-relative-preset>B</button><button data-relative-custom>Custom</button>'

	return { list, cells: Array.from(list.querySelectorAll('button')) }
}

describe('useDatePickerRelativeState', () => {
	describe('readOnly', () => {
		// A controlled `open` shows the preset list past the open gate, so each
		// writer must refuse the value on its own.
		it('blocks every value write while the popover is open', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRelativeState({
					relative: { multiple: true },
					readOnly: true,
					open: true,
					value: [today.resolve(new Date())],
					onValueChange: onChange,
				}),
			)

			act(() => result.current.togglePreset(yesterday))

			act(() => result.current.togglePreset(today))

			act(() => result.current.custom.onStartChange(new Date(2025, 0, 1)))

			act(() => result.current.custom.onEndChange(new Date(2025, 0, 31)))

			act(() => result.current.onClear())

			expect(onChange).not.toHaveBeenCalled()

			expect(result.current.custom.start).toBeNull()

			expect(result.current.readOnly).toBe(true)
		})
	})

	describe('multiple presets', () => {
		it('removes a selected preset on a second toggle and keeps the others', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRelativeState({ relative: { multiple: true }, onValueChange: onChange }),
			)

			act(() => result.current.togglePreset(today))

			act(() => result.current.togglePreset(yesterday))

			expect(result.current.selectedIds).toEqual(new Set(['today', 'yesterday']))

			act(() => result.current.togglePreset(today))

			expect(result.current.selectedIds).toEqual(new Set(['yesterday']))

			expect(onChange).toHaveBeenLastCalledWith([yesterday.resolve(new Date())])
		})

		it('replaces a committed custom range with the toggled preset', () => {
			const { result } = renderHook(() =>
				useDatePickerRelativeState({ relative: { multiple: true } }),
			)

			act(() => result.current.enterCustom())

			act(() => result.current.custom.onStartChange(Jan1))

			act(() => result.current.custom.onEndChange(Jan31))

			expect(result.current.customActive).toBe(true)

			act(() => result.current.togglePreset(today))

			expect(result.current.customActive).toBe(false)

			expect(result.current.selectedIds).toEqual(new Set(['today']))

			expect(result.current.value).toEqual([today.resolve(new Date())])
		})
	})

	describe('custom range', () => {
		it('commits the span in order when End is earlier than Start', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRelativeState({ relative: true, onValueChange: onChange }),
			)

			act(() => result.current.enterCustom())

			act(() => result.current.custom.onStartChange(Jan31))

			act(() => result.current.custom.onEndChange(Jan1))

			expect(onChange).toHaveBeenCalledWith([{ from: Jan1, to: Jan31 }])
		})

		it('keeps the committed span when an endpoint is cleared', () => {
			const onChange = vi.fn()

			const { result } = renderHook(() =>
				useDatePickerRelativeState({ relative: true, onValueChange: onChange }),
			)

			act(() => result.current.enterCustom())

			act(() => result.current.custom.onStartChange(Jan1))

			act(() => result.current.custom.onEndChange(Jan31))

			act(() => result.current.custom.onStartChange(null))

			act(() => result.current.custom.onEndChange(null))

			expect(result.current.custom).toMatchObject({ start: null, end: null })

			expect(onChange).toHaveBeenCalledTimes(1)

			expect(result.current.value).toEqual([{ from: Jan1, to: Jan31 }])

			// A draft that is not complete gives no Clear in custom mode.
			expect(result.current.footer.footerButtons).toEqual([])
		})

		it('returns to the list with an empty draft after the exit animation', () => {
			const { result } = renderHook(() => useDatePickerRelativeState({ relative: true }))

			act(() => result.current.enterCustom())

			act(() => result.current.custom.onStartChange(Jan1))

			expect(result.current.mode).toBe('custom')

			act(() => result.current.onExitComplete())

			expect(result.current.mode).toBe('list')

			expect(result.current.custom.start).toBeNull()
		})
	})

	describe('open and close', () => {
		it('closes on onOpenChange(false)', () => {
			const { result } = renderHook(() => useDatePickerRelativeState({ relative: true }))

			act(() => result.current.onOpenChange(true))

			expect(result.current.open).toBe(true)

			act(() => result.current.onOpenChange(false))

			expect(result.current.open).toBe(false)
		})

		it('opens on ArrowUp from the closed trigger', () => {
			const { result } = renderHook(() => useDatePickerRelativeState({ relative: true }))

			const event = makeKeyEvent('ArrowUp')

			act(() => result.current.onTriggerKeyDown(event))

			expect(result.current.open).toBe(true)

			expect(event.defaultPrevented).toBe(true)
		})

		it('leaves Enter on the closed trigger to the native button click', () => {
			const { result } = renderHook(() => useDatePickerRelativeState({ relative: true }))

			const event = makeKeyEvent('Enter')

			act(() => result.current.onTriggerKeyDown(event))

			expect(result.current.open).toBe(false)

			expect(event.defaultPrevented).toBe(false)
		})

		it('ignores trigger keys while open or disabled', () => {
			const open = renderHook(() => useDatePickerRelativeState({ relative: true, open: true }))

			const openEvent = makeKeyEvent('ArrowDown')

			act(() => open.result.current.onTriggerKeyDown(openEvent))

			expect(openEvent.defaultPrevented).toBe(false)

			const disabled = renderHook(() =>
				useDatePickerRelativeState({ relative: true, disabled: true }),
			)

			const disabledEvent = makeKeyEvent('ArrowDown')

			act(() => disabled.result.current.onTriggerKeyDown(disabledEvent))

			expect(disabledEvent.defaultPrevented).toBe(false)

			expect(disabled.result.current.open).toBe(false)
		})
	})

	describe('list keyboard', () => {
		function press(key: string, list: HTMLElement, target: HTMLElement) {
			const { result } = renderHook(() => useDatePickerRelativeState({ relative: true }))

			const handler = result.current.onContentKeyDown

			if (!handler) throw new Error('The list mode has no key handler.')

			const event = makeKeyEvent<HTMLElement>(key, { currentTarget: list, target })

			handler(event)

			return event
		}

		it('moves focus to the next row and wraps from the last row to the first', () => {
			const { list, cells } = listSurface()

			press('ArrowDown', list, cells[0] as HTMLElement)

			expect(document.activeElement).toBe(cells[1])

			press('ArrowDown', list, cells[2] as HTMLElement)

			expect(document.activeElement).toBe(cells[0])
		})

		it('wraps from the first row to the last on ArrowUp', () => {
			const { list, cells } = listSurface()

			press('ArrowUp', list, cells[0] as HTMLElement)

			expect(document.activeElement).toBe(cells[2])
		})

		it('enters at the last row on ArrowUp when no row has focus', () => {
			const { list, cells } = listSurface()

			press('ArrowUp', list, list)

			expect(document.activeElement).toBe(cells[2])
		})

		it('jumps to the first row on Home and to the last row on End', () => {
			const { list, cells } = listSurface()

			press('Home', list, cells[2] as HTMLElement)

			expect(document.activeElement).toBe(cells[0])

			press('End', list, cells[0] as HTMLElement)

			expect(document.activeElement).toBe(cells[2])
		})

		it('ignores keys that do not navigate, and a list with no rows', () => {
			const { list, cells } = listSurface()

			expect(press('a', list, cells[0] as HTMLElement).defaultPrevented).toBe(false)

			const empty = attach(document.createElement('div'))

			expect(press('ArrowDown', empty, empty).defaultPrevented).toBe(false)
		})

		it('has no key handler in custom mode', () => {
			const { result } = renderHook(() => useDatePickerRelativeState({ relative: true }))

			act(() => result.current.enterCustom())

			expect(result.current.onContentKeyDown).toBeUndefined()
		})
	})
})
