import { describe, expect, it } from 'vitest'
import { Badge } from '../../components/badge'
import { bySlot, expectSlot, itRendersSkeletonPlaceholder, renderUI, screen } from '../helpers'

describe('Badge', () => {
	it('renders as a link when href is provided', () => {
		const { container } = renderUI(<Badge href="/tags">Tag</Badge>)

		const badge = expectSlot(container, 'badge', 'a')

		expect(badge).toHaveAttribute('href', '/tags')
	})

	itRendersSkeletonPlaceholder(<Badge>New</Badge>, 'badge')

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
})
