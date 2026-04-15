import { describe, expect, it } from 'vitest'
import { Collapse } from '../../components/collapse'
import { bySlot, renderUI, screen } from '../helpers'

describe('Collapse', () => {
	it('renders with data-slot="collapse"', () => {
		const { container } = renderUI(
			<Collapse trigger="Toggle">
				<p>Content</p>
			</Collapse>,
		)

		const el = bySlot(container, 'collapse')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders trigger', () => {
		renderUI(
			<Collapse trigger="Toggle">
				<p>Content</p>
			</Collapse>,
		)

		expect(screen.getByText('Toggle')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Collapse trigger="Toggle" className="custom">
				<p>Content</p>
			</Collapse>,
		)

		const el = bySlot(container, 'collapse')

		expect(el?.className).toContain('custom')
	})

	it('renders panel when open', () => {
		renderUI(
			<Collapse trigger="Toggle" defaultOpen>
				<p>Content</p>
			</Collapse>,
		)

		expect(screen.getByText('Content')).toBeInTheDocument()
	})
})
