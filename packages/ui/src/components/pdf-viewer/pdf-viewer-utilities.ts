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

export function printPdf(src: string) {
	const iframe = document.createElement('iframe')

	iframe.style.position = 'fixed'
	iframe.style.right = '0'
	iframe.style.bottom = '0'
	iframe.style.width = '0'
	iframe.style.height = '0'
	iframe.style.border = '0'

	iframe.setAttribute('aria-hidden', 'true')

	let cleaned = false

	const cleanup = () => {
		if (cleaned) return

		cleaned = true

		window.removeEventListener('focus', cleanup)

		iframe.remove()
	}

	iframe.addEventListener('load', () => {
		const win = iframe.contentWindow

		if (!win) {
			cleanup()

			return
		}

		try {
			win.addEventListener('afterprint', cleanup)

			// Backstop for browsers that never fire `afterprint` (e.g. older Safari)
			// or where the user dismisses the dialog: reclaims the iframe when
			// focus returns to the main window after the print dialog closes.
			window.addEventListener('focus', cleanup, { once: true })

			win.focus()
			win.print()
		} catch {
			// Same-origin blob URL should not throw; if it does (e.g. pages + remote src),
			// falls back to opening the PDF in a new tab for manual printing.
			window.open(src, '_blank', 'noopener,noreferrer')

			cleanup()
		}
	})

	iframe.addEventListener('error', () => {
		window.open(src, '_blank', 'noopener,noreferrer')

		cleanup()
	})

	iframe.src = src

	document.body.appendChild(iframe)
}
