import { once } from './once'

/** Options for {@link printInHiddenFrame}. */
type PrintFrameOptions = {
	/**
	 * Points the frame at the document to print, through `srcdoc` for markup the
	 * caller builds or `src` for a URL. Runs before the frame enters the DOM, so
	 * the assignment cannot miss the `load` event it triggers.
	 */
	prepare: (iframe: HTMLIFrameElement) => void
	/**
	 * What to do besides reclaiming the frame when it cannot print — typically
	 * opening the source in a new tab. Omit it where the caller has nothing to
	 * fall back to, and a blocked `print()` propagates instead of going silent.
	 */
	onFail?: () => void
}

/**
 * Prints a document through a hidden iframe, then reclaims the frame.
 *
 * @remarks Reclaims on `afterprint`, which the frame fires also when the user
 * cancels the dialog. Both failure routes reclaim it too: a frame that cannot
 * load, and a `print()` the browser blocks. Every route runs the cleanup at
 * most once.
 */
export function printInHiddenFrame({ prepare, onFail }: PrintFrameOptions) {
	const iframe = document.createElement('iframe')

	Object.assign(iframe.style, {
		position: 'fixed',
		right: '0',
		bottom: '0',
		width: '0',
		height: '0',
		border: '0',
	})

	iframe.setAttribute('aria-hidden', 'true')

	const cleanup = once(() => {
		iframe.remove()
	})

	const printThrough = (win: Window) => {
		win.addEventListener('afterprint', cleanup)

		win.focus()
		win.print()
	}

	iframe.addEventListener('load', () => {
		const win = iframe.contentWindow

		if (!win) {
			cleanup()

			return
		}

		try {
			printThrough(win)
		} catch (error) {
			cleanup()

			// A caller with no recovery takes the throw: swallowing it here would
			// turn a blocked print into silence.
			if (!onFail) throw error

			onFail()
		}
	})

	iframe.addEventListener('error', () => {
		cleanup()

		onFail?.()
	})

	prepare(iframe)

	document.body.appendChild(iframe)
}
