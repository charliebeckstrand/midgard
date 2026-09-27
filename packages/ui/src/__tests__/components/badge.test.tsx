import { describe, expect, it } from 'vitest'
import { Badge } from '../../components/badge'
import { bySlot, renderUI, screen } from '../helpers'

describe('Badge', () => {
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

	// A size makes the badge its own density scope. The class string is the
	// same at each step, so only the attribute changes.
	it('writes the size step to data-density', () => {
		const { container } = renderUI(<Badge size="xs">Tiny</Badge>)

		expect(bySlot(container, 'badge')).toHaveAttribute('data-density', 'xs')
	})
})
