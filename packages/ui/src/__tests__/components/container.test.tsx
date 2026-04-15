import { describe, expect, it } from 'vitest'
import { Container } from '../../components/container'
import { bySlot, renderUI, screen } from '../helpers'

describe('Container', () => {
	it('renders with data-slot="container"', () => {
		const { container } = renderUI(<Container>content</Container>)

		const el = bySlot(container, 'container')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<Container>Hello</Container>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Container className="custom">content</Container>)

		const el = bySlot(container, 'container')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Container id="test">content</Container>)

		const el = bySlot(container, 'container')

		expect(el).toHaveAttribute('id', 'test')
	})
})
