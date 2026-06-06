import { describe, expect, it } from 'vitest'
import { GlassProvider } from '../../providers/glass'
import { bySlot, renderUI, screen } from '../helpers'

describe('GlassProvider', () => {
	it('renders with data-slot="glass"', () => {
		const { container } = renderUI(<GlassProvider>content</GlassProvider>)

		const el = bySlot(container, 'glass')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SPAN')
	})

	it('renders children', () => {
		renderUI(<GlassProvider>Hello</GlassProvider>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<GlassProvider className="custom">content</GlassProvider>)

		const el = bySlot(container, 'glass')

		expect(el?.className).toContain('custom')
	})
})
