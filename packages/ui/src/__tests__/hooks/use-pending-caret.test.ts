import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePendingCaret } from '../../hooks/use-pending-caret'
import { attach } from '../helpers'

function setup(type = 'text') {
	const input = attach(document.createElement('input'))

	input.type = type

	input.value = 'hello world'

	input.focus()

	const hook = renderHook(() => usePendingCaret())

	act(() => {
		hook.result.current.ref?.(input)
	})

	return { input, ...hook }
}

async function flushMicrotasks() {
	await act(async () => {})
}

describe('usePendingCaret', () => {
	it('applies the pending caret on the next commit', () => {
		const { input, result, rerender } = setup()

		input.setSelectionRange(11, 11)

		act(() => {
			result.current.setCaret(3)
		})

		rerender()

		expect(input.selectionStart).toBe(3)

		expect(input.selectionEnd).toBe(3)
	})

	it('applies the pending caret even when no commit follows', async () => {
		const { input, result } = setup()

		input.setSelectionRange(11, 11)

		// No state lives behind this hook: setCaret alone schedules no render,
		// mirroring a controlled consumer that rejects the value.
		result.current.setCaret(4)

		await flushMicrotasks()

		expect(input.selectionStart).toBe(4)
	})

	it('does not re-apply a consumed caret on a later unrelated commit', async () => {
		const { input, result, rerender } = setup()

		result.current.setCaret(2)

		await flushMicrotasks()

		const spy = vi.spyOn(input, 'setSelectionRange')

		rerender()

		expect(spy).not.toHaveBeenCalled()
	})

	it('skips restoration when the input is not focused', async () => {
		const { input, result } = setup()

		input.blur()

		input.setSelectionRange(11, 11)

		result.current.setCaret(5)

		await flushMicrotasks()

		expect(input.selectionStart).toBe(11)
	})

	// A `number` input has no text selection, so `setSelectionRange` throws
	// InvalidStateError on it. A spread can set that type on a mask field.
	it('skips restoration when the input type has no text selection', () => {
		const { input, result, rerender } = setup('number')

		act(() => {
			result.current.setCaret(3)
		})

		expect(() => rerender()).not.toThrow()

		expect(input.selectionStart).toBeNull()
	})
})
