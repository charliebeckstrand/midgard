import { describe, expect, it } from 'vitest'
import { Badge, BadgeSkeleton } from '../../components/badge'
import { bySlot, renderUI, screen } from '../helpers'

describe('Badge', () => {
	it('renders as a link when href is provided', () => {
		const { container } = renderUI(<Badge href="/tags">Tag</Badge>)

		const badge = bySlot(container, 'badge')

		expect(badge).toBeInTheDocument()

		expect(badge?.tagName).toBe('A')

		expect(badge).toHaveAttribute('href', '/tags')
	})

	it('pairs with an explicit BadgeSkeleton in loading trees', () => {
		const { container } = renderUI(<BadgeSkeleton />)

		expect(bySlot(container, 'badge')).not.toBeInTheDocument()

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('renders prefix content with data-has-prefix', () => {
		const { container } = renderUI(<Badge prefix={<span>icon</span>}>Tag</Badge>)

		const badge = bySlot(container, 'badge')

		expect(badge).toHaveAttribute('data-has-prefix', '')

		expect(screen.getByText('icon')).toBeInTheDocument()
	})

	it('renders suffix content with data-has-suffix', () => {
		const { container } = renderUI(<Badge suffix={<span>×</span>}>Tag</Badge>)

		const badge = bySlot(container, 'badge')

		expect(badge).toHaveAttribute('data-has-suffix', '')

		expect(screen.getByText('×')).toBeInTheDocument()
	})

	// xs projects the smallest type step: data-size echoes the prop and the
	// kata stamps the text-xs row (ji.size.xs) onto the badge slot.
	it('renders with the xs size variant', () => {
		const { container } = renderUI(<Badge size="xs">Tiny</Badge>)

		const badge = bySlot(container, 'badge')

		expect(badge).toHaveAttribute('data-size', 'xs')

		expect(badge).toHaveClass('text-xs')
	})
})
