import { describe, expect, it } from 'vitest'
import { CopyButton } from '../../components/copy-button'
import { renderUI } from '../helpers'

describe('CopyButton', () => {
	it('renders a button', () => {
		const { container } = renderUI(<CopyButton value="text" />)

		const el = container.querySelector('button')

		expect(el).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<CopyButton value="text" className="custom" />)

		const el = container.querySelector('button')

		expect(el?.className).toContain('custom')
	})

	it('has an accessible label', () => {
		const { container } = renderUI(<CopyButton value="text" />)

		const el = container.querySelector('button')

		expect(el).toHaveAttribute('aria-label', 'Copy to clipboard')
	})
})
