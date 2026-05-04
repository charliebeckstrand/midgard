import { act, waitFor } from '@testing-library/react'
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

	it('does not fire onCopiedChange on mount', () => {
		const onCopiedChange = vi.fn()

		renderUI(<CopyButton value="hello" onCopiedChange={onCopiedChange} />)

		expect(onCopiedChange).not.toHaveBeenCalled()
	})

	it('does not fire onCopiedChange when only the callback identity changes', () => {
		const first = vi.fn()
		const second = vi.fn()

		const { rerender } = renderUI(<CopyButton value="hello" onCopiedChange={first} />)

		rerender(<CopyButton value="hello" onCopiedChange={second} />)

		expect(first).not.toHaveBeenCalled()
		expect(second).not.toHaveBeenCalled()
	})

	it('fires onCopiedChange with true after a successful copy and false after the timeout', async () => {
		vi.useFakeTimers()

		const writeText = vi.fn().mockResolvedValue(undefined)
		const onCopiedChange = vi.fn()

		const restore = stubClipboard(writeText)

		try {
			const { container } = renderUI(
				<CopyButton value="hello" timeout={2000} onCopiedChange={onCopiedChange} />,
			)

			const button = container.querySelector('button') as HTMLButtonElement

			await act(async () => {
				button.click()
			})

			await vi.waitFor(() => expect(onCopiedChange).toHaveBeenCalledWith(true))

			expect(onCopiedChange).toHaveBeenCalledTimes(1)

			act(() => {
				vi.advanceTimersByTime(2000)
			})

			expect(onCopiedChange).toHaveBeenLastCalledWith(false)
			expect(onCopiedChange).toHaveBeenCalledTimes(2)
		} finally {
			restore()
			vi.useRealTimers()
		}
	})

	it('does not fire onCopiedChange when clipboard.writeText rejects', async () => {
		const writeText = vi.fn().mockRejectedValue(new Error('denied'))
		const onCopiedChange = vi.fn()

		const restore = stubClipboard(writeText)

		try {
			const { container } = renderUI(<CopyButton value="hello" onCopiedChange={onCopiedChange} />)

			const button = container.querySelector('button') as HTMLButtonElement

			button.click()

			await waitFor(() => expect(writeText).toHaveBeenCalledWith('hello'))

			expect(onCopiedChange).not.toHaveBeenCalled()
		} finally {
			restore()
		}
	})

	it('invokes a consumer onClick before copying', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)
		const onClick = vi.fn()

		const restore = stubClipboard(writeText)

		try {
			const { container } = renderUI(<CopyButton value="hello" onClick={onClick} />)

			const button = container.querySelector('button') as HTMLButtonElement

			button.click()

			expect(onClick).toHaveBeenCalledTimes(1)

			await waitFor(() => expect(writeText).toHaveBeenCalledWith('hello'))
		} finally {
			restore()
		}
	})
})
