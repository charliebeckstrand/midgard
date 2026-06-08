import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useA11yPanel } from '../../hooks/a11y/use-a11y-panel'

describe('useA11yPanel', () => {
	it('defaults to a modal dialog role', () => {
		const { result } = renderHook(() => useA11yPanel())

		expect(result.current.ariaProps.role).toBe('dialog')

		expect(result.current.ariaProps['aria-modal']).toBe(true)
	})

	it('honors an explicit role', () => {
		const { result } = renderHook(() => useA11yPanel('alertdialog'))

		expect(result.current.ariaProps.role).toBe('alertdialog')
	})

	it('omits labelling attributes until slots register', () => {
		const { result } = renderHook(() => useA11yPanel())

		expect(result.current.ariaProps['aria-labelledby']).toBeUndefined()

		expect(result.current.ariaProps['aria-describedby']).toBeUndefined()
	})

	it('points aria-labelledby / aria-describedby at the registered slot ids', () => {
		const { result } = renderHook(() => useA11yPanel())

		const { titleId, descriptionId, registerTitle, registerDescription } = result.current.a11y

		act(() => {
			registerTitle()

			registerDescription()
		})

		expect(result.current.ariaProps['aria-labelledby']).toBe(titleId)

		expect(result.current.ariaProps['aria-describedby']).toBe(descriptionId)
	})
})
