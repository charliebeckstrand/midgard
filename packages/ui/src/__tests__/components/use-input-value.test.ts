import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useInputValue } from '../../components/input/use-input-value'

// Outside a Form provider `useFormText` returns undefined; that's the seam this
// hook normalises around. The Form-bound branch is covered by form.test.tsx.

describe('useInputValue', () => {
	it('returns a supplied value controlled', () => {
		const onChange = vi.fn()

		const onBlur = vi.fn()

		const { result } = renderHook(() => useInputValue({ value: 'hello', onChange, onBlur }))

		expect(result.current.value).toBe('hello')

		expect(result.current.onChange).toBe(onChange)

		expect(result.current.onBlur).toBe(onBlur)

		expect(result.current.invalid).toBeUndefined()
	})

	it('coerces a null value to "" and stays controlled (§7.3)', () => {
		const { result } = renderHook(() => useInputValue({ value: null }))

		expect(result.current.value).toBe('')
	})

	it('leaves an undefined value uncontrolled (§7.3)', () => {
		const { result } = renderHook(() => useInputValue({ value: undefined }))

		expect(result.current.value).toBeUndefined()
	})
})
