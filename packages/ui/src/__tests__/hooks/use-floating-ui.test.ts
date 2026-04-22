import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useFloatingPanel, useFloatingUI } from '../../hooks/use-floating-ui'

describe('useFloatingPanel', () => {
	it('returns refs, floatingStyles, and context', () => {
		const { result } = renderHook(() =>
			useFloatingPanel({ placement: 'bottom-start', open: false, onOpenChange: () => {} }),
		)

		expect(result.current).toMatchObject({
			refs: expect.any(Object),
			floatingStyles: expect.any(Object),
			context: expect.any(Object),
		})
	})
})

describe('useFloatingUI', () => {
	it('returns interaction getters in addition to the panel shape', () => {
		const { result } = renderHook(() =>
			useFloatingUI({ placement: 'bottom-start', open: false, onOpenChange: () => {} }),
		)

		expect(result.current).toMatchObject({
			refs: expect.any(Object),
			floatingStyles: expect.any(Object),
			context: expect.any(Object),
			getReferenceProps: expect.any(Function),
			getFloatingProps: expect.any(Function),
		})
	})
})
