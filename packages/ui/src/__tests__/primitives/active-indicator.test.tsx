import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActiveIndicator, useActiveIndicator } from '../../primitives/active-indicator'
import { renderUI, screen } from '../helpers'

describe('ActiveIndicator', () => {
	it('renders a span element', () => {
		renderUI(<ActiveIndicator>indicator</ActiveIndicator>)

		expect(screen.getByText('indicator')).toBeInTheDocument()

		expect(screen.getByText('indicator').tagName).toBe('SPAN')
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
