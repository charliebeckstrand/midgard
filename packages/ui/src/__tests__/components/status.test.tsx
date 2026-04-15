import { describe, expect, it } from 'vitest'
import { StatusDot } from '../../components/status'
import { bySlot, renderUI } from '../helpers'

describe('StatusDot', () => {
	it('renders with data-slot="status-dot"', () => {
		const { container } = renderUI(<StatusDot />)

		const el = bySlot(container, 'status-dot')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SPAN')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<StatusDot className="custom" />)

		const el = bySlot(container, 'status-dot')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<StatusDot id="test" />)

		const el = bySlot(container, 'status-dot')

		expect(el).toHaveAttribute('id', 'test')
	})
})
