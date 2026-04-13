import { describe, expect, it } from 'vitest'
import { Badge } from '../../components/badge'
import { bySlot, renderUI, screen } from '../helpers'

describe('Badge', () => {
	it('renders a span with data-slot="badge"', () => {
		const { container } = renderUI(<Badge>New</Badge>)

		const badge = bySlot(container, 'badge')

		expect(badge).toBeInTheDocument()

		expect(badge?.tagName).toBe('SPAN')
	})

	it('renders children', () => {
		renderUI(<Badge>Status</Badge>)

		expect(screen.getByText('Status')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Badge className="extra">Tag</Badge>)

		const badge = bySlot(container, 'badge')

		expect(badge?.className).toContain('extra')
	})

	it('renders as a link when href is provided', () => {
		const { container } = renderUI(<Badge href="/tags">Tag</Badge>)

		const badge = bySlot(container, 'badge')

		expect(badge).toBeInTheDocument()

		expect(badge?.tagName).toBe('A')

		expect(badge).toHaveAttribute('href', '/tags')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Badge>New</Badge>, { skeleton: true })

		expect(bySlot(container, 'badge')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})
})
