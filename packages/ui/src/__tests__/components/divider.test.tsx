import { describe, expect, it } from 'vitest'
import { Divider } from '../../components/divider'
import { bySlot, expectSlot, renderUI } from '../helpers'

describe('Divider', () => {
	it('renders with data-slot="divider"', () => {
		const { container } = renderUI(<Divider />)

		expectSlot(container, 'divider', 'hr')
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
