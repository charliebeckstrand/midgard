import { describe, expect, it } from 'vitest'
import { Chip } from '../../components/chip'
import { bySlot, renderUI, screen } from '../helpers'

describe('Chip', () => {
	it('renders with data-slot="chip"', () => {
		const { container } = renderUI(<Chip>Tag</Chip>)

		const el = bySlot(container, 'chip')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SPAN')
	})

	it('renders children', () => {
		renderUI(<Chip>Status</Chip>)

		expect(screen.getByText('Status')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Chip className="custom">Tag</Chip>)

		const el = bySlot(container, 'chip')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Chip id="test">Tag</Chip>)

		const el = bySlot(container, 'chip')

		expect(el).toHaveAttribute('id', 'test')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Chip>Tag</Chip>, { skeleton: true })

		expect(bySlot(container, 'chip')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})
