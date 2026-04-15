import { describe, expect, it } from 'vitest'
import { Banner } from '../../components/banner'
import { bySlot, renderUI, screen } from '../helpers'

describe('Banner', () => {
	it('renders with data-slot="alert"', () => {
		const { container } = renderUI(<Banner>content</Banner>)

		const el = bySlot(container, 'alert')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<Banner>Hello</Banner>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Banner className="custom">content</Banner>)

		const el = bySlot(container, 'alert')

		expect(el?.className).toContain('custom')
	})
})
