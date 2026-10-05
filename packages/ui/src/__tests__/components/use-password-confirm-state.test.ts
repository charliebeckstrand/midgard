import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePasswordConfirmState } from '../../components/password-confirm/use-password-confirm-state'

describe('usePasswordConfirmState', () => {
	it('starts empty with idle status', () => {
		const { result } = renderHook(() => usePasswordConfirmState())

		expect(result.current.password).toBe('')

		expect(result.current.confirm).toBe('')

		expect(result.current.status).toBe('idle')
	})

	it('stays idle while the user is still typing the confirm field', () => {
		const { result } = renderHook(() => usePasswordConfirmState())

		act(() => {
			result.current.setPassword('hunter2')

			result.current.setLastEdited('confirm')

			result.current.setConfirm('hunt')
		})

		expect(result.current.status).toBe('idle')
	})

	it('flips to warning once confirm catches up but still differs', () => {
		const { result } = renderHook(() => usePasswordConfirmState())

		act(() => {
			result.current.setPassword('hunter2')

			result.current.setLastEdited('confirm')

			result.current.setConfirm('hunter3')
		})

		expect(result.current.status).toBe('warning')
	})

	it('suppresses the warning while disabled is true', () => {
		const { result } = renderHook(() => usePasswordConfirmState({ disabled: true }))

		act(() => {
			result.current.setPassword('hunter2')

			result.current.setLastEdited('confirm')

			result.current.setConfirm('hunter3')
		})

		expect(result.current.status).toBe('idle')
	})

	it('fires onMatchChange(true) once when the fields converge', () => {
		const onMatchChange = vi.fn()

		const { result } = renderHook(() => usePasswordConfirmState({ onMatchChange }))

		act(() => {
			result.current.setPassword('hunter2')

			result.current.setLastEdited('confirm')

			result.current.setConfirm('hunter2')
		})

		expect(onMatchChange).toHaveBeenCalledOnce()

		expect(onMatchChange).toHaveBeenCalledWith(true)
	})

	it('fires onMatchChange(false) once when the fields diverge', () => {
		const onMatchChange = vi.fn()

		const { result } = renderHook(() => usePasswordConfirmState({ onMatchChange }))

		act(() => {
			result.current.setPassword('hunter2')

			result.current.setLastEdited('confirm')

			result.current.setConfirm('hunter3')
		})

		expect(onMatchChange).toHaveBeenCalledOnce()

		expect(onMatchChange).toHaveBeenCalledWith(false)
	})

	it('does not refire the callback on rerenders that hold the same matchState', () => {
		const onMatchChange = vi.fn()

		const { result, rerender } = renderHook(() => usePasswordConfirmState({ onMatchChange }))

		act(() => {
			result.current.setPassword('hunter2')

			result.current.setLastEdited('confirm')

			result.current.setConfirm('hunter2')
		})

		expect(onMatchChange).toHaveBeenCalledOnce()

		rerender()

		rerender()

		expect(onMatchChange).toHaveBeenCalledOnce()
	})
	it('fires onMatchChange(false) once when a match goes back to a partial confirm', () => {
		const onMatchChange = vi.fn()

		const { result } = renderHook(() => usePasswordConfirmState({ onMatchChange }))

		act(() => {
			result.current.setPassword('hunter2')

			result.current.setLastEdited('confirm')

			result.current.setConfirm('hunter2')
		})

		act(() => result.current.setConfirm('hunter'))

		expect(onMatchChange).toHaveBeenLastCalledWith(false)

		// The partial confirm becomes a mismatch: `false` holds, so no report.
		act(() => result.current.setConfirm('hunter3'))

		expect(onMatchChange.mock.calls).toEqual([[true], [false]])
	})

	it('does not report while disabled, and keeps the last report for re-enable', () => {
		const onMatchChange = vi.fn()

		const { result, rerender } = renderHook(
			({ disabled }) => usePasswordConfirmState({ disabled, onMatchChange }),
			{ initialProps: { disabled: false } },
		)

		act(() => {
			result.current.setPassword('hunter2')

			result.current.setLastEdited('confirm')

			result.current.setConfirm('hunter2')
		})

		rerender({ disabled: true })

		act(() => result.current.setConfirm('hunter3'))

		expect(onMatchChange.mock.calls).toEqual([[true]])

		rerender({ disabled: false })

		expect(onMatchChange.mock.calls).toEqual([[true], [false]])
	})
})
