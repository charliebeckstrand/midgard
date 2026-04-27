import { waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CopyButton } from '../../components/copy-button'
import { renderUI } from '../helpers'

function stubClipboard(writeText: (value: string) => Promise<void>) {
	const original = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard')

	Object.defineProperty(window.navigator, 'clipboard', {
		configurable: true,
		value: { writeText },
	})

	return () => {
		if (original) Object.defineProperty(window.navigator, 'clipboard', original)
		else delete (window.navigator as { clipboard?: unknown }).clipboard
	}
}

describe('CopyButton', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

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

	it('stays in the idle state when clipboard.writeText rejects', async () => {
		const writeText = vi.fn().mockRejectedValue(new Error('denied'))

		const restore = stubClipboard(writeText)

		try {
			const { container } = renderUI(<CopyButton value="hello" />)

			const button = container.querySelector('button') as HTMLButtonElement

			button.click()

			await waitFor(() => expect(writeText).toHaveBeenCalledWith('hello'))

			expect(button).toHaveAttribute('aria-label', 'Copy to clipboard')
		} finally {
			restore()
		}
	})
})
