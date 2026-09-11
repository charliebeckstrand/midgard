import { describe, expect, it, vi } from 'vitest'
import { printInHiddenFrame } from '../../utilities/print-frame'
import { captureAppended } from '../helpers/capture-appended'

/** A `contentWindow` stand-in; jsdom's own is not printable. */
function stubWindow(print: () => void = vi.fn()) {
	return { addEventListener: vi.fn(), focus: vi.fn(), print: vi.fn(print) }
}

function frameWith(win: object | null, options: Parameters<typeof printInHiddenFrame>[0]) {
	const iframe = captureAppended(() => printInHiddenFrame(options), 'iframe')

	Object.defineProperty(iframe, 'contentWindow', { value: win, configurable: true })

	return iframe
}

const prepare = (iframe: HTMLIFrameElement) => {
	iframe.srcdoc = '<p>page</p>'
}

describe('printInHiddenFrame', () => {
	it('appends an off-screen aria-hidden frame, prepared before it enters the DOM', () => {
		let preparedWhileDetached = false

		const iframe = captureAppended(
			() =>
				printInHiddenFrame({
					prepare: (frame) => {
						preparedWhileDetached = frame.parentNode == null

						frame.srcdoc = '<p>page</p>'
					},
				}),
			'iframe',
		)

		// `prepare` assigning before the append is what keeps the `load` it triggers
		// from firing ahead of the listeners.
		expect(preparedWhileDetached).toBe(true)

		expect(iframe.srcdoc).toBe('<p>page</p>')

		expect(iframe.getAttribute('aria-hidden')).toBe('true')

		expect(iframe.style.position).toBe('fixed')
	})

	it('reclaims the frame on load when contentWindow is unavailable', () => {
		const iframe = frameWith(null, { prepare })

		iframe.dispatchEvent(new Event('load'))

		expect(iframe.parentNode).toBeNull()
	})

	it('focuses and prints through the frame window, deferring cleanup to afterprint', () => {
		const win = stubWindow()

		const iframe = frameWith(win, { prepare })

		iframe.dispatchEvent(new Event('load'))

		expect(win.focus).toHaveBeenCalled()

		expect(win.print).toHaveBeenCalled()

		expect(win.addEventListener).toHaveBeenCalledWith('afterprint', expect.any(Function))

		// Cleanup is deferred to the afterprint event, so the frame is still attached.
		expect(iframe.parentNode).not.toBeNull()
	})

	it('reclaims the frame when the window regains focus and afterprint never fires', () => {
		const iframe = frameWith(stubWindow(), { prepare })

		iframe.dispatchEvent(new Event('load'))

		expect(iframe.parentNode).not.toBeNull()

		window.dispatchEvent(new Event('focus'))

		expect(iframe.parentNode).toBeNull()
	})

	it('runs the cleanup once, however many routes fire', () => {
		const iframe = frameWith(stubWindow(), { prepare })

		iframe.dispatchEvent(new Event('load'))

		const remove = vi.spyOn(iframe, 'remove')

		window.dispatchEvent(new Event('focus'))
		window.dispatchEvent(new Event('focus'))

		expect(remove).toHaveBeenCalledTimes(1)
	})

	describe('failure routes', () => {
		it('reclaims the frame on a load error and runs onFail', () => {
			const onFail = vi.fn()

			const iframe = frameWith(null, { prepare, onFail })

			iframe.dispatchEvent(new Event('error'))

			expect(onFail).toHaveBeenCalled()

			expect(iframe.parentNode).toBeNull()
		})

		// Reclaiming is the helper's own invariant, not something `onFail` buys: a
		// frame that never loads arms neither `afterprint` nor the focus backstop,
		// so without this the caller with no fallback would leak it.
		it('reclaims the frame on a load error with no onFail', () => {
			const iframe = frameWith(null, { prepare })

			iframe.dispatchEvent(new Event('error'))

			expect(iframe.parentNode).toBeNull()
		})

		it('runs onFail and reclaims the frame when print throws', () => {
			const onFail = vi.fn()

			const win = stubWindow(() => {
				throw new Error('print blocked')
			})

			const iframe = frameWith(win, { prepare, onFail })

			iframe.dispatchEvent(new Event('load'))

			expect(onFail).toHaveBeenCalled()

			expect(iframe.parentNode).toBeNull()
		})
	})
})
