import { describe, expect, it } from 'vitest'
import { Skeleton } from '../../components/skeleton'
import { bySlot, renderUI, screen } from '../helpers'

describe('Skeleton', () => {
	it('renders with data-slot="skeleton"', () => {
		const { container } = renderUI(<Skeleton>content</Skeleton>)

		const el = bySlot(container, 'skeleton')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SPAN')
	})

	it('renders children', () => {
		renderUI(<Skeleton>Hello</Skeleton>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('sets aria-busy when loading', () => {
		const { container } = renderUI(<Skeleton>content</Skeleton>)

		const el = bySlot(container, 'skeleton')

		expect(el).toHaveAttribute('aria-busy', 'true')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Skeleton className="custom">content</Skeleton>)

		const el = bySlot(container, 'skeleton')

		expect(el?.className).toContain('custom')
	})
})
