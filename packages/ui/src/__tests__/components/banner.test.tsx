import { describe, expect, it } from 'vitest'
import { Banner } from '../../components/banner'
import { bySlot, renderUI, screen } from '../helpers'

describe('Banner', () => {
	it('renders with data-slot="banner"', () => {
		const { container } = renderUI(<Banner>content</Banner>)

		const el = bySlot(container, 'banner')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<Banner>Hello</Banner>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Banner className="custom">content</Banner>)

		const el = bySlot(container, 'banner')

		expect(el?.className).toContain('custom')
	})

	it('applies sticky positioning when position="sticky"', () => {
		const { container } = renderUI(<Banner position="sticky">content</Banner>)

		const el = bySlot(container, 'banner')

		expect(el?.className).toContain('sticky')
	})

	it('omits sticky positioning when position="static" (default)', () => {
		const { container } = renderUI(<Banner>content</Banner>)

		const el = bySlot(container, 'banner')

		expect(el?.className).not.toContain('sticky')
	})
})
