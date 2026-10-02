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
 * A download name from the last path segment of `src`, such as `invoice.pdf` for
 * `/files/invoice.pdf?v=2`.
 *
 * @remarks For a download through a blob URL, which has no name of its own. A segment with no
 * extension gets `.pdf`. A `src` with no path segment, or one that is not an `http(s)` URL,
 * gives `undefined`, because its name is not legible.
 * @internal
 */
export function pdfNameFromSrc(src: string): string | undefined {
	let url: URL

	try {
		url = new URL(src, window.location.href)
	} catch {
		return undefined
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined

	const segment = url.pathname.split('/').pop()

	if (!segment) return undefined

	let name: string

	try {
		name = decodeURIComponent(segment)
	} catch {
		name = segment
	}

	return name.includes('.') ? name : `${name}.pdf`
}

/**
 * The name of a download: the `filename` of the consumer, else a name from `src` when the
 * download goes through the blob URL of a loaded document.
 *
 * @remarks Without a blob URL the download goes to `src` itself, and the browser names it.
 * @internal
 */
export function resolveDownloadName(
	filename: string | undefined,
	src: string | undefined,
	documentUrl: string | null,
): string | undefined {
	if (filename !== undefined) return filename

	return documentUrl && src ? pdfNameFromSrc(src) : undefined
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
