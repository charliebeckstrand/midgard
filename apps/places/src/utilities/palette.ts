import type { ReactElement } from 'react'
import type { ContextMenuEntry } from 'ui/context-menu'

/** One row of the palette: what it shows, and what a pick does. */
export type PaletteCommand = {
	/** A key that is unique in its source. */
	id: string
	label: string
	/** The second line of text, after the label. */
	description?: string
	/** The mark before the label. It tells the kind of the row. */
	icon: ReactElement
	/** More text that the query can match, after the label. */
	keywords?: string
	run: () => void
	/** Starts the work that a pick needs. The palette calls it when the highlight stays on the row. */
	preload?: () => void
	/** The rows of the menu that a right-click or a long press on the row opens. */
	menu?: ContextMenuEntry[]
}

/** One group of the palette: a heading, and the commands under it in their default order. */
export type PaletteSource = {
	heading: string
	commands: readonly PaletteCommand[]
	/** How many commands show for an empty query. @defaultValue 0 */
	idle?: number
	/** How many commands show at most for a query. @defaultValue 8 */
	limit?: number
}

const DEFAULT_LIMIT = 8

/** The characters between two words. */
const WORD_BREAK = /[^\p{L}\p{N}]+/u

/**
 * The text in the form that the palette compares: lower case, with no accents.
 * With it, "sao" finds "São".
 */
export function foldText(text: string): string {
	return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/**
 * How well a command matches a folded query, from 5 to 0. A larger number is a
 * better match, and 0 is no match.
 *
 * The order is: the full label, the start of the label, the start of a word in
 * the label, the start of a word in the keywords, and text in the label.
 */
export function commandScore(command: PaletteCommand, query: string): number {
	const label = foldText(command.label)

	if (label === query) return 5

	if (label.startsWith(query)) return 4

	if (label.split(WORD_BREAK).some((word) => word.startsWith(query))) return 3

	const keywords = foldText(command.keywords ?? '').split(WORD_BREAK)

	if (keywords.some((word) => word.startsWith(query))) return 2

	return label.includes(query) ? 1 : 0
}

/**
 * The commands of a source that show for a query, best match first.
 *
 * An empty query shows the first `idle` commands in their default order. Two
 * commands with the same score keep their default order.
 */
export function matchCommands(source: PaletteSource, query: string): PaletteCommand[] {
	const folded = foldText(query.trim())

	if (folded === '') return source.commands.slice(0, source.idle ?? 0)

	return source.commands
		.map((command, index) => ({ command, index, score: commandScore(command, folded) }))
		.filter((match) => match.score > 0)
		.sort((a, b) => b.score - a.score || a.index - b.index)
		.slice(0, source.limit ?? DEFAULT_LIMIT)
		.map((match) => match.command)
}
