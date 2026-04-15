import { describe, expect, it } from 'vitest'
import { Split } from '../../components/split'
import { bySlot, renderUI, screen } from '../helpers'

describe('Split', () => {
	it('renders with data-slot="split"', () => {
		const { container } = renderUI(<Split>content</Split>)

		const el = bySlot(container, 'split')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<Split>Hello</Split>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Split className="custom">content</Split>)

		const el = bySlot(container, 'split')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Split id="test">content</Split>)

		const el = bySlot(container, 'split')

		expect(el).toHaveAttribute('id', 'test')
	})
})
