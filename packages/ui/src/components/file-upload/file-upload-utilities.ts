import type { KeyboardEvent, ReactNode } from 'react'

/**
 * Resolves the hidden input's accessible name from a variant's visible
 * trigger: string children become the label directly, anything else falls back
 * to a variant default.
 *
 * @internal
 */
export function triggerLabel(children: ReactNode, fallback: string): string {
	return typeof children === 'string' ? children : fallback
}

/**
 * Builds a keydown handler that activates a non-button control (the readonly
 * file `input`) on Enter / Space, matching native button keyboard behavior.
 *
 * @internal
 */
export function activateOnEnterSpace(onActivate: () => void) {
	return (event: KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault()

			onActivate()
		}
	}
}

/**
 * Materializes a DOM `FileList` (or `null`) into a real array.
 *
 * @returns The files as an array; empty when `fileList` is `null`.
 */
export function fileListToArray(fileList: FileList | null): File[] {
	return Array.from(fileList ?? [])
}

/**
 * Joins file names into a comma-separated label, e.g. for an input's display
 * value.
 *
 * @returns The joined names, or `undefined` when there are no files.
 */
export function formatFileNames(files: File[]): string | undefined {
	if (files.length === 0) return undefined

	return files.map((f) => f.name).join(', ')
}

/**
 * Selection status text for the `drop` and `input` variants. It is the file
 * name for a single pick. Once `multiple` yields more than one, it is an
 * "x files selected" summary.
 *
 * @returns The status text, or `undefined` when there are no files.
 * @internal
 */
export function selectionSummary(files: File[], multiple?: boolean): string | undefined {
	if (files.length === 0) return undefined

	if (multiple && files.length > 1) return `${files.length} files selected`

	return formatFileNames(files)
}

/** A file excluded from a selection, paired with the constraint it tripped. */
export type FileRejection = {
	file: File
	/**
	 * `'type'` does not match `accept`; `'size'` exceeds `maxSize`; `'count'`
	 * overflows `maxCount`, or the one-file limit without `multiple`.
	 */
	reason: 'type' | 'size' | 'count'
}

type FileConstraints = {
	/** Accepted file types, in the syntax of the `accept` attribute. */
	accept?: string
	/** Maximum size per file, in bytes. */
	maxSize?: number
	/** Maximum number of files accepted; overflow is rejected. */
	maxCount?: number
}

/**
 * Returns `true` when a file matches an `accept` list, by the rules of the
 * native attribute. A `.ext` token matches the end of the file name, a `type/*` token
 * matches the MIME group, and other tokens match the full MIME type. Case does
 * not count. An empty or absent list matches every file.
 *
 * @internal
 */
export function matchesAccept(file: File, accept: string | undefined): boolean {
	const tokens = (accept ?? '')
		.split(',')
		.map((token) => token.trim().toLowerCase())
		.filter(Boolean)

	if (tokens.length === 0) return true

	const name = file.name.toLowerCase()

	const type = file.type.toLowerCase()

	return tokens.some((token) => {
		if (token.startsWith('.')) return name.endsWith(token)

		if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1))

		return type === token
	})
}

/**
 * Splits a selection into accepted files and rejections. Files that do not
 * match `accept` go first (reason `'type'`), then oversized files (reason
 * `'size'`). `maxCount` then caps the survivors in selection order, and rejects
 * the overflow (reason `'count'`). All constraints are optional. An unset limit
 * never rejects.
 *
 * @returns `{ accepted, rejected }` — the kept files and the `FileRejection`s,
 * each tagged with the constraint it tripped.
 */
export function partitionFiles(
	files: File[],
	{ accept, maxSize, maxCount }: FileConstraints,
): { accepted: File[]; rejected: FileRejection[] } {
	const rejected: FileRejection[] = []
	const kept: File[] = []

	for (const file of files) {
		if (!matchesAccept(file, accept)) {
			rejected.push({ file, reason: 'type' })
		} else if (maxSize != null && file.size > maxSize) {
			rejected.push({ file, reason: 'size' })
		} else {
			kept.push(file)
		}
	}

	if (maxCount != null && kept.length > maxCount) {
		for (const file of kept.slice(maxCount)) rejected.push({ file, reason: 'count' })

		return { accepted: kept.slice(0, maxCount), rejected }
	}

	return { accepted: kept, rejected }
}
