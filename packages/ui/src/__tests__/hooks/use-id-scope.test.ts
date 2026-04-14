import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useIdScope } from '../../hooks/use-id-scope'

describe('useIdScope', () => {
	it('generates a stable id from useId when no override is provided', () => {
		const { result } = renderHook(() => useIdScope())
		expect(result.current.id).toBeDefined()
		expect(typeof result.current.id).toBe('string')
	})

	it('uses explicit id when provided', () => {
		const { result } = renderHook(() => useIdScope({ id: 'custom' }))
		expect(result.current.id).toBe('custom')
	})

	it('sub() derives a suffixed id', () => {
		const { result } = renderHook(() => useIdScope({ id: 'field' }))
		expect(result.current.sub('description')).toBe('field-description')
		expect(result.current.sub('error')).toBe('field-error')
		expect(result.current.sub('trigger')).toBe('field-trigger')
	})

	it('returns a referentially stable object across re-renders', () => {
		const { result, rerender } = renderHook(() => useIdScope({ id: 'stable' }))
		const first = result.current
		rerender()
		expect(result.current).toBe(first)
	})

	it('sub is referentially stable across re-renders', () => {
		const { result, rerender } = renderHook(() => useIdScope({ id: 'stable' }))
		const firstSub = result.current.sub
		rerender()
		expect(result.current.sub).toBe(firstSub)
	})

	it('returns a new object when id changes', () => {
		const { result, rerender } = renderHook(({ id }) => useIdScope({ id }), {
			initialProps: { id: 'a' },
		})
		const first = result.current
		rerender({ id: 'b' })
		expect(result.current).not.toBe(first)
		expect(result.current.id).toBe('b')
		expect(result.current.sub('panel')).toBe('b-panel')
	})
})
