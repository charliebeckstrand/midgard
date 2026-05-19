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

	it('fires onPasswordMatch once when the fields converge', () => {
		const onPasswordMatch = vi.fn()

		const { result } = renderHook(() => usePasswordConfirmState({ onPasswordMatch }))

		act(() => {
			result.current.setPassword('hunter2')
			result.current.setConfirm('hunter2')
		})

		expect(onPasswordMatch).toHaveBeenCalledOnce()
	})

	it('fires onPasswordMismatch once when the fields diverge', () => {
		const onPasswordMismatch = vi.fn()

		const { result } = renderHook(() => usePasswordConfirmState({ onPasswordMismatch }))

		act(() => {
			result.current.setPassword('hunter2')
			result.current.setConfirm('hunter3')
		})

		expect(onPasswordMismatch).toHaveBeenCalledOnce()
	})

	it('does not refire callbacks on rerenders that hold the same matchState', () => {
		const onPasswordMatch = vi.fn()

		const { result, rerender } = renderHook(() => usePasswordConfirmState({ onPasswordMatch }))

		act(() => {
			result.current.setPassword('hunter2')
			result.current.setConfirm('hunter2')
		})

		expect(onPasswordMatch).toHaveBeenCalledOnce()

		rerender()
		rerender()

		expect(onPasswordMatch).toHaveBeenCalledOnce()
	})
})
