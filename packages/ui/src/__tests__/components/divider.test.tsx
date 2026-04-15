import { describe, expect, it } from 'vitest'
import { Divider } from '../../components/divider'
import { bySlot, renderUI } from '../helpers'

describe('Divider', () => {
	it('renders with data-slot="divider"', () => {
		const { container } = renderUI(<Divider />)

		const el = bySlot(container, 'divider')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('HR')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Divider className="custom" />)

		const el = bySlot(container, 'divider')

		expect(el?.className).toContain('custom')
	})

	it('sets role and aria-orientation for vertical dividers', () => {
		const { container } = renderUI(<Divider orientation="vertical" />)

		const el = bySlot(container, 'divider')

		expect(el).toHaveAttribute('role', 'separator')

		expect(el).toHaveAttribute('aria-orientation', 'vertical')
	})

	it('does not set role for horizontal dividers', () => {
		const { container } = renderUI(<Divider orientation="horizontal" />)

		const el = bySlot(container, 'divider')

		expect(el).not.toHaveAttribute('role')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Divider id="test" data-testid="el" />)

		const el = bySlot(container, 'divider')

		expect(el).toHaveAttribute('id', 'test')
	})
})
