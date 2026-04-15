import { describe, expect, it } from 'vitest'
import { Sizer } from '../../components/sizer'
import { bySlot, renderUI, screen } from '../helpers'

describe('Sizer', () => {
	it('renders with data-slot="sizer"', () => {
		const { container } = renderUI(<Sizer>content</Sizer>)

		const el = bySlot(container, 'sizer')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<Sizer>Hello</Sizer>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Sizer className="custom">content</Sizer>)

		const el = bySlot(container, 'sizer')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Sizer id="test">content</Sizer>)

		const el = bySlot(container, 'sizer')

		expect(el).toHaveAttribute('id', 'test')
	})
})
