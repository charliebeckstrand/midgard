import { describe, expect, it } from 'vitest'
import { Glass } from '../../components/glass'
import { bySlot, renderUI, screen } from '../helpers'

describe('Glass', () => {
	it('renders with data-slot="glass"', () => {
		const { container } = renderUI(<Glass>content</Glass>)

		const el = bySlot(container, 'glass')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SPAN')
	})

	it('renders children', () => {
		renderUI(<Glass>Hello</Glass>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Glass className="custom">content</Glass>)

		const el = bySlot(container, 'glass')

		expect(el?.className).toContain('custom')
	})
})
