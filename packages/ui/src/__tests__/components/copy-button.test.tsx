import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { CopyButton, useCopyButtonState } from '../../components/copy-button'
import {
	bySlot,
	deferred,
	expectAnnouncement,
	fireEvent,
	liveRegion,
	present,
	renderUI,
} from '../helpers'

/**
 * Puts `writeText` on `navigator.clipboard` for the current case.
 *
 * @remarks
 * `onTestFinished` restores the property. It runs after a case that times out,
 * but a `finally` in the case does not: the body of that case waits at its
 * `await`, and the stub then stays on the shared window.
 */
function stubClipboard(writeText: (value: string) => Promise<void>) {
	const original = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard')

	Object.defineProperty(window.navigator, 'clipboard', {
		configurable: true,
		value: { writeText },
	})

	onTestFinished(() => {
		if (original) Object.defineProperty(window.navigator, 'clipboard', original)
		else delete (window.navigator as { clipboard?: unknown }).clipboard
	})
}

describe('CopyButton', () => {
	it('has an accessible label', () => {
		const { container } = renderUI(<CopyButton text="text" />)

		const el = container.querySelector('button')

		expect(el).toHaveAttribute('aria-label', 'Copy to clipboard')
	})

	it('is an action, not a toggle: no aria-pressed at rest or after a copy', async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined))

		const { container } = renderUI(<CopyButton text="hello" />)

		const button = present<HTMLButtonElement>(container.querySelector('button'), 'button')

		expect(button).not.toHaveAttribute('aria-pressed')

		await act(async () => {
			fireEvent.click(button)
		})

		await waitFor(() => expect(button).toHaveAttribute('aria-label', 'Copied'))

		expect(button).not.toHaveAttribute('aria-pressed')
	})

	// The code-block kata reads this attribute: its light-mode override paints
	// only while the attribute is absent, and so yields to the green palette of
	// the copied state.
	it('writes data-copied only while the copied state holds', async () => {
		vi.useFakeTimers()

		stubClipboard(vi.fn().mockResolvedValue(undefined))

		const { container } = renderUI(<CopyButton text="hello" timeout={2000} />)

		const button = present<HTMLButtonElement>(container.querySelector('button'), 'button')

		expect(button).not.toHaveAttribute('data-copied')

		await act(async () => {
			fireEvent.click(button)
		})

		await vi.waitFor(() => expect(button).toHaveAttribute('aria-label', 'Copied'))

		expect(button).toHaveAttribute('data-copied', '')

		act(() => {
			vi.advanceTimersByTime(2000)
		})

		expect(button).not.toHaveAttribute('data-copied')
	})

	// The library does not select this anchor, so CONVENTIONS.md §3.9 keeps it
	// open: a wrapper can re-anchor the CopyButton that it renders.
	it('lets a wrapper re-anchor it with its own data-slot', () => {
		const { container } = renderUI(<CopyButton text="hello" data-slot="hex-copy" />)

		expect(bySlot(container, 'hex-copy')?.tagName).toBe('BUTTON')

		expect(bySlot(container, 'copy-button')).toBeNull()
	})

	it('lets a caller override the idle label', () => {
		const { container } = renderUI(<CopyButton text="#6366F1" aria-label="Copy hex value" />)

		expect(container.querySelector('button')).toHaveAttribute('aria-label', 'Copy hex value')
	})

	it('stays in the idle state when clipboard.writeText rejects', async () => {
		const writeText = vi.fn().mockRejectedValue(new Error('denied'))

		stubClipboard(writeText)

		const { container } = renderUI(<CopyButton text="hello" />)

		const button = present<HTMLButtonElement>(container.querySelector('button'), 'button')

		fireEvent.click(button)

		await waitFor(() => expect(writeText).toHaveBeenCalledWith('hello'))

		expect(button).toHaveAttribute('aria-label', 'Copy to clipboard')
	})

	it('hands the rejection to onCopyError and leaves onCopiedChange alone', async () => {
		const denial = new Error('denied')

		const writeText = vi.fn().mockRejectedValue(denial)

		stubClipboard(writeText)

		const onCopyError = vi.fn()
		const onCopiedChange = vi.fn()

		const { container } = renderUI(
			<CopyButton text="hello" onCopyError={onCopyError} onCopiedChange={onCopiedChange} />,
		)

		fireEvent.click(present<HTMLButtonElement>(container.querySelector('button'), 'button'))

		await waitFor(() => expect(onCopyError).toHaveBeenCalledExactlyOnceWith(denial))

		// A refused write is not a copy: the rest glyph means "failed" here, which is
		// exactly why the failure needs its own channel.
		expect(onCopiedChange).not.toHaveBeenCalled()
	})

	it('says nothing on onCopyError when the write succeeds', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)

		stubClipboard(writeText)

		const onCopyError = vi.fn()

		const { container } = renderUI(<CopyButton text="hello" onCopyError={onCopyError} />)

		fireEvent.click(present<HTMLButtonElement>(container.querySelector('button'), 'button'))

		await waitFor(() => expect(writeText).toHaveBeenCalledWith('hello'))

		expect(onCopyError).not.toHaveBeenCalled()
	})

	it('does not fire onCopiedChange on mount', () => {
		const onCopiedChange = vi.fn()

		renderUI(<CopyButton text="hello" onCopiedChange={onCopiedChange} />)

		expect(onCopiedChange).not.toHaveBeenCalled()
	})

	it('does not fire onCopiedChange when only the callback identity changes', () => {
		const first = vi.fn()

		const second = vi.fn()

		const { rerender } = renderUI(<CopyButton text="hello" onCopiedChange={first} />)

		rerender(<CopyButton text="hello" onCopiedChange={second} />)

		expect(first).not.toHaveBeenCalled()

		expect(second).not.toHaveBeenCalled()
	})

	it('fires onCopiedChange with true after a successful copy and false after the timeout', async () => {
		vi.useFakeTimers()

		const writeText = vi.fn().mockResolvedValue(undefined)

		const onCopiedChange = vi.fn()

		stubClipboard(writeText)

		const { container } = renderUI(
			<CopyButton text="hello" timeout={2000} onCopiedChange={onCopiedChange} />,
		)

		const button = present<HTMLButtonElement>(container.querySelector('button'), 'button')

		await act(async () => {
			fireEvent.click(button)
		})

		await vi.waitFor(() => expect(onCopiedChange).toHaveBeenCalledWith(true))

		expect(onCopiedChange).toHaveBeenCalledTimes(1)

		act(() => {
			vi.advanceTimersByTime(2000)
		})

		expect(onCopiedChange).toHaveBeenLastCalledWith(false)

		expect(onCopiedChange).toHaveBeenCalledTimes(2)
	})

	// The platform timer holds a 32-bit signed delay. Without the clamp, each of
	// these values overflows, and the copied state reverts at once.
	it.each([Infinity, 2 ** 31, 2 ** 32])(
		'holds the copied state for 2^31-1 ms when timeout is %d',
		async (timeout) => {
			vi.useFakeTimers()

			const write = deferred()

			stubClipboard(vi.fn(() => write.promise))

			const { container } = renderUI(<CopyButton text="hello" timeout={timeout} />)

			const button = present<HTMLButtonElement>(container.querySelector('button'), 'button')

			fireEvent.click(button)

			await act(async () => {
				write.resolve()
			})

			act(() => {
				vi.advanceTimersByTime(2 ** 31 - 2)
			})

			expect(button).toHaveAttribute('aria-label', 'Copied')

			act(() => {
				vi.advanceTimersByTime(1)
			})

			expect(button).toHaveAttribute('aria-label', 'Copy to clipboard')
		},
	)

	it('stays focusable and focused through the copied window (WCAG 2.4.3)', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)

		stubClipboard(writeText)

		const { container } = renderUI(<CopyButton text="hello" />)

		const button = present<HTMLButtonElement>(container.querySelector('button'), 'button')

		button.focus()

		await act(async () => {
			fireEvent.click(button)
		})

		await waitFor(() => expect(button).toHaveAttribute('aria-label', 'Copied'))

		// Disabling here would drop keyboard focus to <body> mid-interaction.
		expect(button).not.toBeDisabled()

		expect(document.activeElement).toBe(button)

		// Re-activating during the window is a no-op, not a second write.
		await act(async () => {
			fireEvent.click(button)
		})

		expect(writeText).toHaveBeenCalledTimes(1)
	})

	// The copied state turns true only after the write. Thus a second activation
	// during the write must also be a no-op, or each write announces and notifies.
	it('writes and notifies once for two activations during one write', async () => {
		const write = deferred()

		const writeText = vi.fn(() => write.promise)

		const onCopiedChange = vi.fn()

		stubClipboard(writeText)

		const { container } = renderUI(<CopyButton text="hello" onCopiedChange={onCopiedChange} />)

		const button = present<HTMLButtonElement>(container.querySelector('button'), 'button')

		fireEvent.click(button)

		fireEvent.click(button)

		await act(async () => {
			write.resolve()
		})

		expect(button).toHaveAttribute('aria-label', 'Copied')

		expect(writeText).toHaveBeenCalledTimes(1)

		expect(onCopiedChange).toHaveBeenCalledExactlyOnceWith(true)
	})

	// The transitions end at unmount. A write that resolves after the unmount
	// does not announce, and does not tell the consumer.
	it('drops the late announcement and onCopiedChange when it unmounts during the write', async () => {
		const write = deferred()

		const onCopiedChange = vi.fn()

		stubClipboard(vi.fn(() => write.promise))

		const { container, unmount } = renderUI(
			<CopyButton text="hello" onCopiedChange={onCopiedChange} />,
		)

		fireEvent.click(present<HTMLButtonElement>(container.querySelector('button'), 'button'))

		unmount()

		await act(async () => {
			write.resolve()
		})

		expect(onCopiedChange).not.toHaveBeenCalled()

		// The announcer makes its region at the first announcement.
		expect(liveRegion()).toBeNull()
	})

	// No callback runs during the unmount, so the true that the consumer saw
	// gets no false.
	it('runs no callback when it unmounts in the copied window', async () => {
		vi.useFakeTimers()

		const onCopiedChange = vi.fn()

		stubClipboard(vi.fn().mockResolvedValue(undefined))

		const { container, unmount } = renderUI(
			<CopyButton text="hello" timeout={2000} onCopiedChange={onCopiedChange} />,
		)

		await act(async () => {
			fireEvent.click(present<HTMLButtonElement>(container.querySelector('button'), 'button'))
		})

		await vi.waitFor(() => expect(onCopiedChange).toHaveBeenCalledWith(true))

		unmount()

		act(() => {
			vi.advanceTimersByTime(2000)
		})

		expect(onCopiedChange).toHaveBeenCalledExactlyOnceWith(true)
	})

	it('invokes a consumer onClick before copying', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)

		const onClick = vi.fn()

		stubClipboard(writeText)

		const { container } = renderUI(<CopyButton text="hello" onClick={onClick} />)

		const button = present<HTMLButtonElement>(container.querySelector('button'), 'button')

		fireEvent.click(button)

		expect(onClick).toHaveBeenCalledTimes(1)

		await waitFor(() => expect(writeText).toHaveBeenCalledWith('hello'))
	})

	it('announces success to a live region on copy', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)

		stubClipboard(writeText)

		const { container } = renderUI(<CopyButton text="hello" />)

		fireEvent.click(present<HTMLButtonElement>(container.querySelector('button'), 'button'))

		await expectAnnouncement('Copied')
	})
})

describe('useCopyButtonState', () => {
	// A control other than CopyButton calls `copy` on each click. The copied state
	// is one window: a second call in it does not write, announce, or tell the
	// consumer that the state turned true again.
	it('drops a copy in the copied window, and copies again after the revert', async () => {
		vi.useFakeTimers()

		onTestFinished(() => {
			vi.useRealTimers()
		})

		const writeText = vi.fn().mockResolvedValue(undefined)

		const onCopiedChange = vi.fn()

		stubClipboard(writeText)

		const { result } = renderHook(() =>
			useCopyButtonState({ text: 'hello', timeout: 1000, onCopiedChange }),
		)

		await act(() => result.current.copy())

		expect(result.current.copied).toBe(true)

		await act(() => result.current.copy())

		expect(writeText).toHaveBeenCalledTimes(1)

		expect(onCopiedChange).toHaveBeenCalledExactlyOnceWith(true)

		act(() => {
			vi.advanceTimersByTime(1000)
		})

		expect(result.current.copied).toBe(false)

		await act(() => result.current.copy())

		expect(writeText).toHaveBeenCalledTimes(2)

		expect(onCopiedChange.mock.calls).toEqual([[true], [false], [true]])
	})

	// The copy starts the revert window. A later `timeout` applies to the next copy.
	it('keeps the revert window when the timeout changes while the copied state holds', async () => {
		vi.useFakeTimers()

		onTestFinished(() => {
			vi.useRealTimers()
		})

		stubClipboard(vi.fn().mockResolvedValue(undefined))

		const { result, rerender } = renderHook(
			({ timeout }: { timeout: number }) => useCopyButtonState({ text: 'hello', timeout }),
			{ initialProps: { timeout: 1000 } },
		)

		await act(() => result.current.copy())

		act(() => {
			vi.advanceTimersByTime(600)
		})

		rerender({ timeout: 5000 })

		act(() => {
			vi.advanceTimersByTime(400)
		})

		expect(result.current.copied).toBe(false)

		await act(() => result.current.copy())

		act(() => {
			vi.advanceTimersByTime(4999)
		})

		expect(result.current.copied).toBe(true)

		act(() => {
			vi.advanceTimersByTime(1)
		})

		expect(result.current.copied).toBe(false)
	})
})
