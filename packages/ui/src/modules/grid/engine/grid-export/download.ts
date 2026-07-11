'use client'

/**
 * Triggers a client-side download of `content` as a file named `filename`
 * with the given MIME `type`: wraps it in a `Blob`, clicks a transient
 * object-URL anchor, then revokes the URL. Shared by every download-based
 * export type (CSV, Excel); print opens a browser dialog instead (`print.ts`).
 *
 * @internal
 */
export function downloadBlob(filename: string, content: BlobPart[], type: string): void {
	const blob = new Blob(content, { type })

	const url = URL.createObjectURL(blob)

	const anchor = document.createElement('a')

	anchor.href = url

	anchor.download = filename

	document.body.append(anchor)

	anchor.click()

	anchor.remove()

	// The click dispatches the download asynchronously; revoking in the same tick
	// can abort it before the browser reads the blob (Firefox/Safari, larger
	// files), so defer the revoke to the next macrotask.
	setTimeout(() => URL.revokeObjectURL(url), 0)
}
