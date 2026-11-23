import type { ReactNode } from 'react'
import type { IntlShape } from '../../primitives/intl/types'
import { fileUploadMessages } from './file-upload-messages'

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
 * Joins file names into a comma-separated label, e.g. for an input's display
 * value.
 *
 * @returns The joined names, or `undefined` when there are no files.
 */
export function formatFileNames(files: File[]): string | undefined {
	if (files.length === 0) return undefined

	return files.map((file) => file.name).join(', ')
}

/**
 * Selection status text for the `drop` and `input` variants. It is the file
 * name for a single pick. Once `multiple` yields more than one, it is an
 * "x files selected" summary, in the language of `intl`.
 *
 * @returns The status text, or `undefined` when there are no files.
 * @internal
 */
export function selectionSummary(
	intl: IntlShape,
	files: File[],
	multiple?: boolean,
): string | undefined {
	if (files.length === 0) return undefined

	if (multiple && files.length > 1) {
		return intl.formatMessage(fileUploadMessages.selected, { count: files.length })
	}

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

/** The limits of a selection, which `partitionFiles` applies and `describeSelection` speaks. @internal */
export type FileConstraints = {
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
 * @returns `{ accepted, rejected }`: the kept files and the `FileRejection`s,
 * each tagged with the constraint it tripped.
 *
 * @internal
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

/** The units of a file size, from the smallest, with the number of bytes in each. */
const SIZE_UNITS = [
	['byte', 1],
	['kilobyte', 1e3],
	['megabyte', 1e6],
	['gigabyte', 1e9],
] as const

/**
 * Formats a number of bytes in the largest unit that holds at least one of it,
 * with one decimal at most, such as "1 MB" for `1_000_000`. The units are
 * decimal, as `maxSize` in the docs uses them.
 *
 * @internal
 */
export function formatFileSize(intl: IntlShape, bytes: number): string {
	const [unit, size] = SIZE_UNITS.findLast(([, size]) => bytes >= size) ?? SIZE_UNITS[0]

	return intl.formatNumber(bytes / size, {
		style: 'unit',
		unit,
		unitDisplay: 'short',
		maximumFractionDigits: 1,
	})
}

/**
 * The live-region text of one pick or drop: the accepted files, then the
 * refused files of each reason, in the order of `partitionFiles`. Each refusal
 * also gives the limit that it enforces: the accepted types, the size limit, or
 * the file limit (WCAG 3.3.3).
 *
 * A batch gets one message, because a second write to the region replaces the
 * first before a screen reader speaks it (WCAG 4.1.3).
 *
 * @returns The text, or `''` when the batch holds no file.
 * @internal
 */
export function describeSelection(
	intl: IntlShape,
	{ accepted, rejected }: { accepted: File[]; rejected: readonly FileRejection[] },
	{ accept, maxSize, maxCount }: FileConstraints,
): string {
	const said: string[] = []

	const refused = (reason: FileRejection['reason']) => {
		const files = rejected.filter((rejection) => rejection.reason === reason)

		return { count: files.length, names: formatFileNames(files.map(({ file }) => file)) }
	}

	const picked = formatFileNames(accepted)

	if (picked !== undefined) {
		said.push(
			intl.formatMessage(fileUploadMessages.announced, { count: accepted.length, names: picked }),
		)
	}

	// A refusal of a reason comes only from its limit, so each limit is set here.
	const type = refused('type')

	if (type.names !== undefined) {
		const types = (accept ?? '')
			.split(',')
			.map((token) => token.trim())
			.filter(Boolean)

		said.push(
			intl.formatMessage(fileUploadMessages.refusedType, {
				count: type.count,
				names: type.names,
				accept: intl.formatList(types, { type: 'unit' }),
			}),
		)
	}

	const size = refused('size')

	if (size.names !== undefined) {
		said.push(
			intl.formatMessage(fileUploadMessages.refusedSize, {
				count: size.count,
				names: size.names,
				limit: formatFileSize(intl, maxSize ?? 0),
			}),
		)
	}

	const count = refused('count')

	if (count.names !== undefined) {
		said.push(
			intl.formatMessage(fileUploadMessages.refusedCount, {
				count: count.count,
				names: count.names,
				max: maxCount ?? 0,
			}),
		)
	}

	return said.join('. ')
}
