import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useChatDraft } from '../../modules/chat'

describe('useChatDraft', () => {
	it('starts empty and not submittable', () => {
		const { result } = renderHook(() => useChatDraft())

		expect(result.current.value).toBe('')

		expect(result.current.canSubmit).toBe(false)
	})

	it('honors an initial value', () => {
		const { result } = renderHook(() => useChatDraft({ initialValue: 'hi' }))

		expect(result.current.value).toBe('hi')

		expect(result.current.canSubmit).toBe(true)
	})

	it('marks whitespace-only input as not submittable', () => {
		const { result } = renderHook(() => useChatDraft())

		act(() => result.current.setValue('   '))

		expect(result.current.canSubmit).toBe(false)
	})

	it('submits the trimmed value and clears the draft', () => {
		const onSubmit = vi.fn()

		const { result } = renderHook(() => useChatDraft({ onSubmit }))

		act(() => result.current.setValue('  hello  '))

		act(() => result.current.submit())

		expect(onSubmit).toHaveBeenCalledWith('hello')

		expect(result.current.value).toBe('')
	})

	it('does not submit empty input', () => {
		const onSubmit = vi.fn()

		const { result } = renderHook(() => useChatDraft({ onSubmit }))

		act(() => result.current.setValue('   '))

		act(() => result.current.submit())

		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('clears the draft on demand', () => {
		const { result } = renderHook(() => useChatDraft({ initialValue: 'draft' }))

		act(() => result.current.clear())

		expect(result.current.value).toBe('')
	})
})
