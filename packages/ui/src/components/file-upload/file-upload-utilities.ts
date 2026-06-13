import type { KeyboardEvent, ReactNode } from 'react'

/**
 * Resolves the hidden input's accessible name from a variant's visible
 * trigger: string children become the label directly, anything else falls back
 * to a variant default.
 *
 * @returns The trigger label.
 */
export function triggerLabel(children: ReactNode, fallback: string): string {
	return typeof children === 'string' ? children : fallback
}

/**
 * Builds a keydown handler that activates a non-button control (the readonly
 * file `input`) on Enter / Space, matching native button keyboard behavior.
 *
 * @returns A keydown handler that activates on Enter / Space.
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
	if (!fileList) return []

	return Array.from(fileList)
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

/** A file excluded from a selection, paired with the constraint it tripped. */
export type FileRejection = {
	file: File
	/** `'size'` exceeds `maxSize`; `'count'` overflows `maxCount`. */
	reason: 'size' | 'count'
}

type FileConstraints = {
	/** Maximum size per file, in bytes. */
	maxSize?: number
	/** Maximum number of files accepted; overflow is rejected. */
	maxCount?: number
}

/**
 * Splits a selection into accepted files and rejections. Oversized files are
 * dropped first (reason `'size'`); `maxCount` then caps the survivors in
 * selection order, rejecting the overflow (reason `'count'`). Both constraints
 * are optional — an unset limit never rejects.
 */
export function partitionFiles(
	files: File[],
	{ maxSize, maxCount }: FileConstraints,
): { accepted: File[]; rejected: FileRejection[] } {
	const rejected: FileRejection[] = []
	const withinSize: File[] = []

	for (const file of files) {
		if (maxSize != null && file.size > maxSize) {
			rejected.push({ file, reason: 'size' })
		} else {
			withinSize.push(file)
		}
	}

	if (maxCount != null && withinSize.length > maxCount) {
		for (const file of withinSize.slice(maxCount)) rejected.push({ file, reason: 'count' })

		return { accepted: withinSize.slice(0, maxCount), rejected }
	}

	return { accepted: withinSize, rejected }
}
