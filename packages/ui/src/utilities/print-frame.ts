/** Options for {@link printInHiddenFrame}. */
type PrintFrameOptions = {
	/**
	 * Points the frame at the document to print, through `srcdoc` for markup the
	 * caller builds or `src` for a URL. Runs before the frame enters the DOM, so
	 * the assignment cannot miss the `load` event it triggers.
	 */
	prepare: (iframe: HTMLIFrameElement) => void
	/**
	 * Recovery for a frame that cannot print — typically opening the source in a
	 * new tab. It also arms the two failure routes that reach it: the frame's
	 * `error` event, and a `print()` the browser blocks. Omit it where the caller
	 * has nothing to recover to, and both stay unarmed, so a blocked `print()`
	 * propagates rather than going silent.
	 */
	onFail?: () => void
}

/**
 * Prints a document through a hidden iframe, then reclaims the frame.
 *
 * @remarks Cleans up on `afterprint`, with a window-`focus` backstop for
 * browsers that never fire it (e.g. older Safari) or when the user dismisses the
 * dialog. Every cleanup route runs at most once. A frame that never loads is
 * reclaimed only where `onFail` arms the `error` route.
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

	let cleaned = false

	const cleanup = () => {
		if (cleaned) return

		cleaned = true

		window.removeEventListener('focus', cleanup)

		iframe.remove()
	}

	const printThrough = (win: Window) => {
		win.addEventListener('afterprint', cleanup)

		// Backstop for browsers that never fire `afterprint` (e.g. older Safari) or
		// where the user dismisses the dialog: reclaims the iframe when focus
		// returns to the main window after the print dialog closes.
		window.addEventListener('focus', cleanup, { once: true })

		win.focus()
		win.print()
	}

	const fail = () => {
		onFail?.()

		cleanup()
	}

	iframe.addEventListener('load', () => {
		const win = iframe.contentWindow

		if (!win) {
			cleanup()

			return
		}

		// A caller with no recovery takes the throw: swallowing it here would turn
		// a blocked print into silence.
		if (!onFail) {
			printThrough(win)

			return
		}

		try {
			printThrough(win)
		} catch {
			fail()
		}
	})

	if (onFail) iframe.addEventListener('error', fail)

	prepare(iframe)

	document.body.appendChild(iframe)
}
