import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Badge, BadgeSkeleton } from '../../components/badge'
import { bySlot, renderUI, screen } from '../helpers'

describe('Badge', () => {
	/*
	 * A badge can sit in a line of text, so its skeleton has to be able to as well. Parsed back
	 * from server markup, the way a browser meets it: a `div` inside a `<p>` makes the parser
	 * close the paragraph there, and the tree it hydrates no longer matches.
	 */
	it('stands in for a badge inside a paragraph, as server markup and inline', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(
			<p>
				Invoice 90210 <BadgeSkeleton size="sm" />
			</p>,
		)

		const skeleton = bySlot(container, 'placeholder')

		expect(skeleton?.tagName).toBe('SPAN')
		expect(skeleton?.parentElement?.tagName).toBe('P')
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
})
