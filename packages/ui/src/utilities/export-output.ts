/**
 * Downloads a blob under `filename` through a transient object-URL anchor.
 *
 * @remarks The click starts the download asynchronously. A revoke in the same
 * tick can stop the download before the browser reads the blob (Firefox and
 * Safari, with larger files). Thus the revoke waits for the next macrotask.
 *
 * @internal
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob)

	const anchor = document.createElement('a')

	anchor.href = url

	anchor.download = filename

	anchor.rel = 'noopener'

	document.body.append(anchor)

	anchor.click()

	anchor.remove()

	setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Writes text to the clipboard when the API is available.
 *
 * @remarks A rejected write (a denied permission, an unfocused document) does
 * nothing, because no affordance shows a failed copy. The optional chain stops
 * the expression when the API is absent, so `.catch` never runs on a nullish
 * clipboard.
 *
 * @internal
 */
export function copyText(text: string): void {
	navigator.clipboard?.writeText(text).catch(() => {})
}
