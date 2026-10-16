import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	LEDGER,
	type LedgerRow,
	parseLedger,
	parseOpen,
	parseScan,
	SCAN_FIELDS,
	STATES,
	TIERS,
	type Tier,
} from '../../../scripts/quality-ledger'
import { packageDir, rootDir } from '../helpers/controlled-language'

// The quality ledger has one row for each ui unit, and each row records the
// state of the unit against the definition of done (CONVENTIONS §12.6). This
// test makes the coverage of the ledger provable: a unit with no row, a row
// with no unit, and a cell that breaks the rules of the ledger each fail.

const SWEEPER = join(rootDir, '.claude/agents/bug-sweeper.md')

const NONE = '—'

const PULL = /^\[#(\d+)\]\(https:\/\/github\.com\/charliebeckstrand\/midgard\/pull\/\1\)$/

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** The shape of each value of the Scan section after the first scan. */
const SCAN_VALUE: Record<(typeof SCAN_FIELDS)[number], RegExp> = {
	Commit: /^`[0-9a-f]{10,40}`$/,
	Date: DATE,
	Recall: /^\d+ of \d+$/,
	Agreement: /^\d+ of \d+$/,
	'Lens coverage': /^\d+ of \d+$/,
	Unproved: /^\d+$/,
}

/** The units of one tier: each directory, and each layout file without its extension. */
function units(tier: Tier): string[] {
	return readdirSync(join(packageDir, 'src', tier), { withFileTypes: true })
		.filter((entry) => entry.isDirectory() || (tier === 'layouts' && entry.name !== 'index.ts'))
		.map((entry) => entry.name.replace(/\.tsx?$/, ''))
		.sort()
}

/** The lens ids of the fixed lens set, from the table in `bug-sweeper.md` §6.2. */
function lensIds(): Set<string> {
	const source = readFileSync(SWEEPER, 'utf-8')

	const section = source.slice(source.indexOf('## 6. Lenses'))

	return new Set([...section.matchAll(/^\| `([a-z-]+)` \|/gm)].map(([, id]) => id as string))
}

/** Each rule that one row breaks. */
function cellBreaks(row: LedgerRow, lenses: Set<string>): string[] {
	const breaks: string[] = []
	const notStarted = row.state === 'Not started'

	if (!(STATES as readonly string[]).includes(row.state))
		breaks.push(`unknown state "${row.state}"`)

	if (row.cleanIn !== NONE && !PULL.test(row.cleanIn))
		breaks.push('Clean in is not a pull request link')

	if (notStarted && row.cleanIn !== NONE) breaks.push('a Not started unit has a Clean in link')

	if (row.state === 'Clean' && row.cleanIn === NONE)
		breaks.push('a Clean unit has no Clean in link')

	if (row.lenses === NONE) {
		if (!notStarted) breaks.push(`a ${row.state} unit has no lens result`)
	} else if (row.lenses !== 'none') {
		const ids = row.lenses.split(',').map((id) => id.trim().replace(/^`|`$/g, ''))

		for (const id of ids) if (!lenses.has(id)) breaks.push(`unknown lens "${id}"`)
	}

	if (row.phone !== NONE && row.phone !== 'n/a' && !DATE.test(row.phone)) {
		breaks.push('Phone check is not a date, n/a, or —')
	}

	if (row.state === 'Clean' && row.phone === NONE) breaks.push('a Clean unit has no phone check')

	if (row.open !== NONE) {
		const counts = parseOpen(row.open)

		if (!counts)
			breaks.push('Open is not —, none, or counts in the order high, medium, correctness, polish')

		if (row.lenses === NONE) breaks.push('a scanned unit has no lens result')

		if (row.state === 'Clean' && counts && Object.values(counts).some(Boolean))
			breaks.push('a Clean unit has an open finding')
	}

	return breaks.map((text) => `${row.tier}/${row.unit} (line ${row.line}): ${text}`)
}

describe('quality ledger (CONVENTIONS §12.6)', () => {
	const source = readFileSync(LEDGER, 'utf-8')

	const ledger = parseLedger(source)

	it('parses every table of the ledger', () => {
		expect(ledger.errors).toEqual([])

		expect(ledger.rows.length).toBeGreaterThan(0)
	})

	it.each(TIERS)('has one row for each unit of %s', (tier) => {
		const expected = units(tier)

		expect(expected.length, `no units found under src/${tier}`).toBeGreaterThan(0)

		const rows = ledger.rows.filter((row) => row.tier === tier).map((row) => row.unit)

		expect(rows, `the rows of ${tier} must match the units, in order`).toEqual(expected)
	})

	it('reads the fixed lens set from bug-sweeper.md', () => {
		expect(lensIds().size).toBeGreaterThan(0)
	})

	it('keeps each cell to the rules of the ledger', () => {
		const lenses = lensIds()

		expect(ledger.rows.flatMap((row) => cellBreaks(row, lenses))).toEqual([])
	})

	it('records one scan: each row and the Scan section, or none of them', () => {
		const scanned = ledger.rows.filter((row) => row.open !== NONE).length

		const scan = parseScan(source)

		expect(Object.keys(scan), 'the Scan section names each measure, in order').toEqual([
			...SCAN_FIELDS,
		])

		if (scanned === 0) {
			expect(Object.values(scan).every((value) => value === NONE)).toBe(true)

			return
		}

		expect(scanned, 'a scan writes the Open cell of every unit').toBe(ledger.rows.length)

		for (const field of SCAN_FIELDS) expect(scan[field], field).toMatch(SCAN_VALUE[field])
	})

	it('names no audit and no plan (CONVENTIONS §12.4)', () => {
		expect(source).not.toMatch(/audits\/|plans\/|-AUDIT\b|-PLAN\b/)
	})
})
