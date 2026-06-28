import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useA11yControl } from '../../hooks/a11y/use-a11y-control'

describe('useA11yControl', () => {
	it('derives the legacy description / error ids from the control id', () => {
		const { result } = renderHook(() => useA11yControl('field'))

		expect(result.current.descriptionId).toBe('field-description')

		expect(result.current.messageId).toBe('field-error')
	})

	it('omits describedBy until a slot registers', () => {
		const { result } = renderHook(() => useA11yControl('field'))

		expect(result.current.describedBy).toBeUndefined()
	})

	it('composes describedBy from only the registered slots', () => {
		const { result } = renderHook(() => useA11yControl('field'))

		act(() => {
			result.current.registerDescription()
		})

		expect(result.current.describedBy).toBe('field-description')

		act(() => {
			result.current.registerMessage()
		})

		expect(result.current.describedBy).toBe('field-description field-error')
	})

	it('drops a slot from describedBy when its cleanup runs', () => {
		const { result } = renderHook(() => useA11yControl('field'))

		let cleanup = () => {}

		act(() => {
			cleanup = result.current.registerDescription()
		})

		expect(result.current.describedBy).toBe('field-description')

		act(() => {
			cleanup()
		})

		expect(result.current.describedBy).toBeUndefined()
	})

	it('keeps registrars referentially stable across re-renders', () => {
		const { result, rerender } = renderHook(() => useA11yControl('field'))

		const firstDescription = result.current.registerDescription

		const firstMessage = result.current.registerMessage

		rerender()

		expect(result.current.registerDescription).toBe(firstDescription)

		expect(result.current.registerMessage).toBe(firstMessage)
	})
})
