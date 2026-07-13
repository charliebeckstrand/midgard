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

			result.current.setConfirm('hunt')
		})

		expect(result.current.status).toBe('idle')
	})

	it('flips to warning once confirm catches up but still differs', () => {
		const { result } = renderHook(() => usePasswordConfirmState())

		act(() => {
			result.current.setPassword('hunter2')

			result.current.setConfirm('hunter3')
		})

		expect(result.current.status).toBe('warning')
	})

	it('suppresses the warning while disabled is true', () => {
		const { result } = renderHook(() => usePasswordConfirmState({ disabled: true }))

		act(() => {
			result.current.setPassword('hunter2')

			result.current.setConfirm('hunter3')
		})

		expect(result.current.status).toBe('idle')
	})

	it('fires onMatchChange(true) once when the fields converge', () => {
		const onMatchChange = vi.fn()

		const { result } = renderHook(() => usePasswordConfirmState({ onMatchChange }))

		act(() => {
			result.current.setPassword('hunter2')

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

			result.current.setConfirm('hunter2')
		})

		expect(onMatchChange).toHaveBeenCalledOnce()

		rerender()

		rerender()

		expect(onMatchChange).toHaveBeenCalledOnce()
	})
})
