import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useInputValue } from '../../components/input/use-input-value'

// Outside a Form provider `useFormText` returns undefined; that's the seam this
// hook normalises around. The Form-bound branch is covered by form.test.tsx.

describe('useInputValue', () => {
	it('returns the supplied value when hasValueProp is true', () => {
		const onChange = vi.fn()

		const onBlur = vi.fn()

		const { result } = renderHook(() =>
			useInputValue({ hasValueProp: true, value: 'hello', onChange, onBlur }),
		)

		expect(result.current.value).toBe('hello')

		expect(result.current.onChange).toBe(onChange)

		expect(result.current.onBlur).toBe(onBlur)

		expect(result.current.binding).toBeUndefined()
	})

	it('coerces a nullish value to "" when hasValueProp is true', () => {
		const { result } = renderHook(() => useInputValue({ hasValueProp: true, value: undefined }))

		expect(result.current.value).toBe('')
	})

	it('passes through an undefined value as-is when hasValueProp is false', () => {
		const { result } = renderHook(() => useInputValue({ hasValueProp: false, value: undefined }))

		expect(result.current.value).toBeUndefined()
	})
})
