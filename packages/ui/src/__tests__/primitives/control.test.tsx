import { describe, expect, it } from 'vitest'
import { ControlFrame } from '../../primitives'
import { bySlot, renderUI, screen } from '../helpers'

describe('ControlFrame', () => {
	it('renders a span with data-slot="control-frame"', () => {
		const { container } = renderUI(<ControlFrame>content</ControlFrame>)

		const frame = bySlot(container, 'control-frame')

		expect(frame).toBeInTheDocument()

		expect(frame?.tagName).toBe('SPAN')
	})

	it('renders children', () => {
		renderUI(<ControlFrame>inner content</ControlFrame>)

		expect(screen.getByText('inner content')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<ControlFrame className="custom">content</ControlFrame>)

		const frame = bySlot(container, 'control-frame')

		expect(frame?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<ControlFrame id="ctrl">content</ControlFrame>)

		const frame = bySlot(container, 'control-frame')

		expect(frame).toHaveAttribute('id', 'ctrl')
	})
})
