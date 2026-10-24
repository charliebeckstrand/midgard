import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { ActiveIndicator, useActiveIndicator } from '../../primitives/active-indicator'
import { bySlot, renderUI } from '../helpers'

describe('ActiveIndicator', () => {
	it('renders a span element', () => {
		const { container } = renderUI(<ActiveIndicator />)

		const indicator = bySlot(container, 'active-indicator')

		expect(indicator).toBeInTheDocument()

		expect(indicator?.tagName).toBe('SPAN')
	})

	it('passes native attributes and a ref to the marker', () => {
		const ref = createRef<HTMLSpanElement>()

		const { container } = renderUI(<ActiveIndicator ref={ref} data-testid="marker" />)

		const indicator = bySlot(container, 'active-indicator')

		expect(ref.current).toBe(indicator)

		expect(indicator).toHaveAttribute('data-testid', 'marker')
	})
})

describe('useActiveIndicator', () => {
	it('returns ref and tapHandlers', () => {
		const { result } = renderHook(() => useActiveIndicator())

		expect(result.current).toHaveProperty('ref')

		expect(result.current).toHaveProperty('tapHandlers')

		expect(result.current.tapHandlers).toHaveProperty('onPointerDown')

		expect(result.current.tapHandlers).toHaveProperty('onPointerUp')

		expect(result.current.tapHandlers).toHaveProperty('onPointerLeave')
	})
})
