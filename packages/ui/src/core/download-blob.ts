/**
 * Downloads a blob under `filename` through a transient object-URL anchor.
 *
 * @remarks The click starts the download asynchronously. A revoke in the same
 * tick can stop the download before the browser reads the blob (Firefox and
 * Safari, with larger files). Thus the revoke waits for the next macrotask.
 *
 * @param blob - The content of the file.
 * @param filename - The name of the download, such as `account.json`.
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
