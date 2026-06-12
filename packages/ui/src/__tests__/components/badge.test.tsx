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

		expect(badge).toHaveAttribute('data-has-prefix', 'true')

		expect(screen.getByText('icon')).toBeInTheDocument()
	})

	it('renders suffix content with data-has-suffix', () => {
		const { container } = renderUI(<Badge suffix={<span>×</span>}>Tag</Badge>)

		const badge = bySlot(container, 'badge')

		expect(badge).toHaveAttribute('data-has-suffix', 'true')

		expect(screen.getByText('×')).toBeInTheDocument()
	})

	// Covers the sub-Step branch: xs is below the Step scale, so the badge
	// opts out of broadcasting a DensityScope scale to its children.
	it('renders with the xs sub-Step size variant', () => {
		const { container } = renderUI(<Badge size="xs">Tiny</Badge>)

		expect(bySlot(container, 'badge')).toBeInTheDocument()
	})
})
