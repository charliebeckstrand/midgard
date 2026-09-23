import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_RELATIVE_PRESETS } from '../../components/date-picker/date-picker-relative-utilities'
import { useDatePickerRelativeState } from '../../components/date-picker/use-date-picker-relative-state'

const [today, yesterday] = DEFAULT_RELATIVE_PRESETS

if (!today || !yesterday) throw new Error('The default presets changed.')

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
})
