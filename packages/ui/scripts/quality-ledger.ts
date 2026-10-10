/**
 * Reads the quality ledger, `docs/LEDGER.md`.
 *
 * The ledger has one table for each tier of units, under a `## <Tier>`
 * heading. Each table has one row for each unit. `quality-report.ts` counts
 * the states of the rows, and `ledger-boundary.test.ts` checks the rows
 * against the unit directories and against the rules of each cell.
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

	const [unit = '', state = '', cleanIn = '', lenses = '', phone = '', known = ''] = row

	ledger.rows.push({
		tier,
		unit: unit.replace(/^`|`$/g, ''),
		state,
		cleanIn,
		lenses,
		phone,
		known,
		line,
	})
}
