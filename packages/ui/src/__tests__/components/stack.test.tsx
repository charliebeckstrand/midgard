import { describe, expect, it } from 'vitest'
import { Stack } from '../../components/stack'
import { bySlot, renderUI, screen } from '../helpers'

describe('Stack', () => {
	it('renders with data-slot="stack"', () => {
		const { container } = renderUI(<Stack>content</Stack>)

		const el = bySlot(container, 'stack')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders children', () => {
		renderUI(<Stack>Hello</Stack>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Stack className="custom">content</Stack>)

		const el = bySlot(container, 'stack')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Stack id="test">content</Stack>)

		const el = bySlot(container, 'stack')

		expect(el).toHaveAttribute('id', 'test')
	})
})
