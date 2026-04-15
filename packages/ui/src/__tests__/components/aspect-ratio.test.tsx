import { describe, expect, it } from 'vitest'
import { AspectRatio } from '../../components/aspect-ratio'
import { bySlot, renderUI, screen } from '../helpers'

describe('AspectRatio', () => {
	it('renders with data-slot="aspect-ratio"', () => {
		const { container } = renderUI(<AspectRatio>content</AspectRatio>)

		const el = bySlot(container, 'aspect-ratio')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<AspectRatio>Hello</AspectRatio>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<AspectRatio className="custom">content</AspectRatio>)

		const el = bySlot(container, 'aspect-ratio')

		expect(el?.className).toContain('custom')
	})

	it('applies numeric ratio as inline style', () => {
		const { container } = renderUI(<AspectRatio ratio={16 / 9}>content</AspectRatio>)

		const el = bySlot(container, 'aspect-ratio')

		expect(el).toHaveStyle({ aspectRatio: `${16 / 9}` })
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<AspectRatio id="test">content</AspectRatio>)

		const el = bySlot(container, 'aspect-ratio')

		expect(el).toHaveAttribute('id', 'test')
	})
})
