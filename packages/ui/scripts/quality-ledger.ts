/**
 * Reads the quality ledger, `docs/LEDGER.md`.
 *
 * The ledger has one table for each tier of units, under a `## <Tier>`
 * heading. Each table has one row for each unit. `quality-report.ts` counts
 * the states of the rows and ranks the open findings, and
 * `ledger-boundary.test.ts` checks the rows against the unit directories and
 * against the rules of each cell. The Scan section holds the measures of the
 * last quality scan.
 */

import { fileURLToPath } from 'node:url'

/** The path of the ledger. */
export const LEDGER = fileURLToPath(new URL('../docs/LEDGER.md', import.meta.url))

/** The path of the ledger from the root of the repository, for `git show`. */
export const LEDGER_REPO_PATH = 'packages/ui/docs/LEDGER.md'

/** The tiers of the ledger, in the order of their tables. The name is the name of the `src` directory. */
export const TIERS = [
	'components',
	'modules',
	'layouts',
	'primitives',
	'structure',
	'providers',
] as const

export type Tier = (typeof TIERS)[number]

/** The states of a unit. */
export const STATES = ['Not started', 'In pass', 'Clean', 'Reopened'] as const

/** The column headers of each table, in order. */
export const COLUMNS = [
	'Unit',
	'State',
	'Clean in',
	'Lenses',
	'Open',
	'Phone check',
	'Known, not chasing',
] as const

/** One row of the ledger, with each cell as written. */
export type LedgerRow = {
	tier: Tier
	unit: string
	state: string
	cleanIn: string
	lenses: string
	open: string
	phone: string
	known: string
	/** The line of the row in the ledger, from 1. */
	line: number
}

/** The parse of the ledger: the rows, and each line that breaks the table shape. */
export type Ledger = {
	rows: LedgerRow[]
	errors: string[]
}

/** The levels of an open finding, in the order of the rank: the two bug levels, then the kinds. */
export const OPEN_LEVELS = ['high', 'medium', 'correctness', 'polish'] as const

type OpenLevel = (typeof OPEN_LEVELS)[number]

/** The counts of an Open cell, or `undefined` when the unit has no scan or the cell breaks its shape. */
export function parseOpen(cell: string): Record<OpenLevel, number> | undefined {
	const counts: Record<OpenLevel, number> = { high: 0, medium: 0, correctness: 0, polish: 0 }

	if (cell === 'none') return counts

	let last = -1

	for (const part of cell.split(', ')) {
		const match = /^([1-9]\d*) ([a-z]+)$/.exec(part)

		const index = OPEN_LEVELS.indexOf(match?.[2] as OpenLevel)

		// Each level comes once, in the order of the rank.
		if (!match || index <= last) return undefined

		counts[OPEN_LEVELS[index] as OpenLevel] = Number(match[1])

		last = index
	}

	return counts
}

/** The names of the measures in the Scan section, in order. */
export const SCAN_FIELDS = [
	'Commit',
	'Date',
	'Recall',
	'Agreement',
	'Lens coverage',
	'Unproved',
] as const

/** The values of the Scan section by name, as written. A missing field has no key. */
export function parseScan(source: string): Partial<Record<(typeof SCAN_FIELDS)[number], string>> {
	const start = source.indexOf('\n## Scan\n')

	if (start === -1) return {}

	const section = source.slice(start + 1).split(/\n## /)[0] ?? ''

	const scan: Partial<Record<(typeof SCAN_FIELDS)[number], string>> = {}

	for (const [, name, value] of section.matchAll(/^- \*\*(.+?)\.\*\* (.+)$/gm)) {
		const field = SCAN_FIELDS.find((candidate) => candidate === name)

		if (field) scan[field] = (value as string).trim()
	}

	return scan
}

const TIER_HEADING = /^## (.+)$/

function cells(line: string): string[] {
	return line
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((cell) => cell.trim())
}

/** Parses the text of the ledger. A table outside a tier heading is an error. */
export function parseLedger(source: string): Ledger {
	const ledger: Ledger = { rows: [], errors: [] }

	let tier: Tier | undefined
	let header = false

	source.split('\n').forEach((text, index) => {
		const heading = TIER_HEADING.exec(text)

		if (heading) {
			const name = (heading[1] ?? '').toLowerCase()

			tier = TIERS.find((candidate) => candidate === name)
			header = false
		} else if (text.startsWith('|')) {
			readRow(ledger, cells(text), index + 1, tier, header)

			header = true
		}
	})

	return ledger
}

/** Adds one table line to the ledger: the header, the divider, or a row. */
function readRow(
	ledger: Ledger,
	row: string[],
	line: number,
	tier: Tier | undefined,
	header: boolean,
) {
	if (!tier) {
		ledger.errors.push(`line ${line}: a table outside a tier heading`)

		return
	}

	if (!header) {
		if (row.join('|') !== COLUMNS.join('|')) {
			ledger.errors.push(`line ${line}: the header must be | ${COLUMNS.join(' | ')} |`)
		}

		return
	}

	if (row.every((cell) => /^:?-+:?$/.test(cell))) return

	if (row.length !== COLUMNS.length) {
		ledger.errors.push(`line ${line}: ${row.length} cells, not ${COLUMNS.length}`)

		return
	}

	const [unit = '', state = '', cleanIn = '', lenses = '', open = '', phone = '', known = ''] = row

	ledger.rows.push({
		tier,
		unit: unit.replace(/^`|`$/g, ''),
		state,
		cleanIn,
		lenses,
		open,
		phone,
		known,
		line,
	})
}
