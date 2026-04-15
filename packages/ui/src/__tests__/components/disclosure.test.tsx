import { describe, expect, it } from 'vitest'
import { Disclosure } from '../../components/disclosure'
import { bySlot, renderUI, screen } from '../helpers'

describe('Disclosure', () => {
	it('renders with data-slot="collapse"', () => {
		const { container } = renderUI(
			<Disclosure trigger="Toggle">
				<p>Content</p>
			</Disclosure>,
		)

		const el = bySlot(container, 'collapse')

		expect(el).toBeInTheDocument()
	})

	it('renders panel content when open', () => {
		renderUI(
			<Disclosure trigger="Toggle" defaultOpen>
				<p>Content</p>
			</Disclosure>,
		)

		expect(screen.getByText('Content')).toBeInTheDocument()
	})
})
