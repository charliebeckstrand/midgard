import { describe, expect, it } from 'vitest'
import { Badge, BadgeSkeleton } from '../../components/badge'
import { bySlot, renderUI, screen } from '../helpers'
import { expectInlineSkeleton } from '../helpers/inline-skeleton'

describe('Badge', () => {
	// A badge can sit in a line of text, so its skeleton has to be able to as well.
	it('stands in for a badge inside a paragraph, as server markup and inline', () => {
		const skeleton = expectInlineSkeleton(<BadgeSkeleton size="sm" />)

		expect(skeleton).toHaveClass('inline-block')
		expect(skeleton).not.toHaveClass('block')
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

	// A size makes the badge its own density scope. The class string is the
	// same at each step, so only the attribute changes.
	it('writes the size step to data-density', () => {
		const { container } = renderUI(<Badge size="xs">Tiny</Badge>)

		expect(bySlot(container, 'badge')).toHaveAttribute('data-density', 'xs')
	})

	// The affix of a control selects the anchor to fit a chip (CONVENTIONS.md §3.9).
	it('keeps its anchor against a consumer data-slot', () => {
		const { container } = renderUI(
			<>
				<Badge data-slot="mine">Span</Badge>
				<Badge href="/tags" data-slot="mine">
					Link
				</Badge>
			</>,
		)

		expect(container.querySelectorAll('[data-slot="badge"]')).toHaveLength(2)

		expect(bySlot(container, 'mine')).toBeNull()
	})
})
