import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { type A11yRelation, useA11yScope } from '../../hooks/a11y/use-a11y-scope'

const SLOTS = { title: 'labelledby', description: 'describedby' } as const satisfies Record<
	string,
	A11yRelation
>

describe('useA11yScope', () => {
	it('honors an explicit id and derives sub-ids', () => {
		const { result } = renderHook(() => useA11yScope({ id: 'field', slots: SLOTS }))

		expect(result.current.id).toBe('field')

		expect(result.current.ids.title).toBe('field-title')

		expect(result.current.ids.description).toBe('field-description')

		expect(result.current.sub('extra')).toBe('field-extra')
	})

	it('omits aria attributes until a slot registers', () => {
		const { result } = renderHook(() => useA11yScope({ id: 'x', slots: SLOTS }))

		expect(result.current.ariaProps['aria-labelledby']).toBeUndefined()

		expect(result.current.ariaProps['aria-describedby']).toBeUndefined()
	})

	it('composes each attribute from only its registered slots', () => {
		const { result } = renderHook(() => useA11yScope({ id: 'x', slots: SLOTS }))

		act(() => {
			result.current.register.title()
		})

		expect(result.current.ariaProps['aria-labelledby']).toBe('x-title')

		expect(result.current.ariaProps['aria-describedby']).toBeUndefined()

		act(() => {
			result.current.register.description()
		})

		expect(result.current.ariaProps['aria-describedby']).toBe('x-description')
	})

	it('deregisters a slot when its cleanup runs', () => {
		const { result } = renderHook(() => useA11yScope({ id: 'x', slots: SLOTS }))

		let cleanup = () => {}

		act(() => {
			cleanup = result.current.register.title()
		})

		expect(result.current.ariaProps['aria-labelledby']).toBe('x-title')

		act(() => {
			cleanup()
		})

		expect(result.current.ariaProps['aria-labelledby']).toBeUndefined()
	})

	it('keeps ids and register referentially stable across re-renders', () => {
		const { result, rerender } = renderHook(() => useA11yScope({ id: 'x', slots: SLOTS }))

		const firstIds = result.current.ids

		const firstRegister = result.current.register

		rerender()

		expect(result.current.ids).toBe(firstIds)

		expect(result.current.register).toBe(firstRegister)
	})
})
