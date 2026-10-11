import type { SearchEntry, SearchKind } from '../plugin/search.ts'

/** The order of the kinds in the results, for entries that match equally well. */
const KINDS: readonly SearchKind[] = ['page', 'tab', 'component', 'example', 'prop']

/** Lower case, with each run of other characters as one space: `<DialogPanel />` gives `dialogpanel`. */
function normalize(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
}

/**
 * How well `label` holds `text`: 0 when it is the same, 1 when it starts with
 * it, 2 when a word of it starts with it, 3 when it holds it elsewhere, and
 * `undefined` when it does not hold it.
 */
function fit(label: string, text: string): number | undefined {
	if (label === text) return 0

	if (label.startsWith(text)) return 1

	if (label.includes(` ${text}`)) return 2

	return label.includes(text) ? 3 : undefined
}

/**
 * The entries that match `query`, best first. Each word of the query must be
 * in the label or in the context of an entry, so `grid sort` finds the
 * Sorting tab of Grid. An entry whose label holds the whole query comes
 * before one that only its context matches. Then the kinds go in the order
 * of {@link KINDS}, and a shorter label goes first. An empty query gives each
 * page.
 */
export function matchEntries<T extends SearchEntry>(entries: readonly T[], query: string): T[] {
	const text = normalize(query)

	if (text === '') return entries.filter((entry) => entry.kind === 'page')

	const words = text.split(' ')

	return entries
		.flatMap((entry) => {
			const label = normalize(entry.label)

			const where = `${label} ${normalize(entry.context)}`

			if (!words.every((word) => where.includes(word))) return []

			return [{ entry, label, rank: fit(label, text) ?? 4 }]
		})
		.toSorted(
			(a, b) =>
				a.rank - b.rank ||
				KINDS.indexOf(a.entry.kind) - KINDS.indexOf(b.entry.kind) ||
				a.label.length - b.label.length ||
				a.label.localeCompare(b.label),
		)
		.map(({ entry }) => entry)
}
