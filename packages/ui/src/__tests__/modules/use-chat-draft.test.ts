import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type ChatCitation, useChatDraft } from '../../modules/chat'

const QUOTE = '@Late stops'

const scope = (start: number): ChatCitation => ({
	id: 'c1',
	start,
	end: start + QUOTE.length,
	quote: QUOTE,
	target: 'dataset',
	selector: { datasets: ['late'] },
})

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

		expect(onSubmit).toHaveBeenCalledWith('hello', [])

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

	it('takes the citations that come with a value', () => {
		const { result } = renderHook(() => useChatDraft())

		act(() => result.current.setValue(`${QUOTE} by day`, [scope(0)]))

		expect(result.current.citations).toEqual([scope(0)])
	})

	it('moves its citations across a value that comes with none', () => {
		const { result } = renderHook(() => useChatDraft())

		act(() => result.current.setValue(`${QUOTE} by day`, [scope(0)]))

		act(() => result.current.setValue(`Show ${QUOTE} by day`))

		expect(result.current.citations).toEqual([scope(5)])

		act(() => result.current.setValue('Show @Late by day'))

		expect(result.current.citations).toEqual([])
	})

	it('submits the citations moved onto the trimmed value, and clears them', () => {
		const onSubmit = vi.fn()

		const { result } = renderHook(() => useChatDraft({ onSubmit }))

		act(() => result.current.setValue(`  ${QUOTE} by day`, [scope(2)]))

		act(() => result.current.submit())

		expect(onSubmit).toHaveBeenCalledWith(`${QUOTE} by day`, [scope(0)])

		expect(result.current.citations).toEqual([])
	})

	it('clears its citations with the value', () => {
		const { result } = renderHook(() => useChatDraft())

		act(() => result.current.setValue(QUOTE, [scope(0)]))

		act(() => result.current.clear())

		expect(result.current.citations).toEqual([])
	})
})
