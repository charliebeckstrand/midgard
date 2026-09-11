import { printInHiddenFrame } from '../../utilities'

/**
 * Triggers a download of the PDF at `src` via a transient anchor click.
 *
 * @param filename - Suggested filename; only honored for same-origin sources.
 * Empty when omitted, letting the browser derive a name.
 * @internal
 */
export function downloadPdf(src: string, filename?: string) {
	const link = document.createElement('a')

	link.href = src

	link.download = filename ?? ''

	link.rel = 'noopener'

	link.target = '_blank'

	document.body.appendChild(link)

	link.click()
	link.remove()
}

/**
 * Prints the PDF at `src` through a hidden iframe.
 *
 * @remarks Falls back to opening the PDF in a new tab when the frame cannot be
 * printed — a cross-origin source, or a `print()` the browser blocks. See
 * {@link printInHiddenFrame}.
 * @internal
 */
export function printPdf(src: string) {
	printInHiddenFrame({
		prepare: (iframe) => {
			iframe.src = src
		},
		onFail: () => window.open(src, '_blank', 'noopener,noreferrer'),
	})
}
