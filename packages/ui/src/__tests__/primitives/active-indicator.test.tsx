import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
	ActiveIndicator,
	ActiveIndicatorScope,
	useActiveIndicator,
} from '../../primitives/active-indicator'
import { renderUI, screen } from '../helpers'

describe('ActiveIndicatorScope', () => {
	it('renders children', () => {
		renderUI(
			<ActiveIndicatorScope>
				<span>content</span>
			</ActiveIndicatorScope>,
		)

		expect(screen.getByText('content')).toBeInTheDocument()
	})
})

describe('ActiveIndicator', () => {
	it('renders a span element', () => {
		renderUI(<ActiveIndicator>indicator</ActiveIndicator>)

		expect(screen.getByText('indicator')).toBeInTheDocument()

		expect(screen.getByText('indicator').tagName).toBe('SPAN')
	})

	it('applies custom className', () => {
		renderUI(<ActiveIndicator className="custom">indicator</ActiveIndicator>)

		expect(screen.getByText('indicator').className).toContain('custom')
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
