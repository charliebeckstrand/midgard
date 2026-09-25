import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RULE_DOCUMENTS, rootDir } from '../helpers/controlled-language'

// CADENCE.md sets the spacing and the shape of authored text. CLAUDE.md §3.6
// once asked for a check by hand before each commit, but no tool made the
// check, and Biome does not read Markdown. This test holds the rule documents
// to the parts of the cadence that a reader can measure:
//
//   - Rule 1: one blank line before each numbered clause, and never two blank
//     lines in a row.
//   - Rule 3: the numbered sections run 1, 2, 3 with no gap, and the clauses of
//     section N run N.1, N.2, N.3 with no gap.
//   - Rule 4: each numbered clause ends with sentence punctuation.
//   - Rule 8: no trailing whitespace, and one newline at the end of the file.
//
// Rules 2, 5, 6, and 7 need judgment, so review keeps them.

const FENCE = /^\s*```/
const SECTION = /^## (\d+)\. /
const CLAUSE = /^(\d+)\.(\d+) /
const TERMINAL = /[.!?:]$/

/** Every measurable cadence break in one Markdown document. */
function cadenceBreaks(file: string, source: string): string[] {
	const breaks: string[] = []
	const report = (line: number, rule: number, text: string) =>
		breaks.push(`${file}:${line} rule ${rule} — ${text}`)

	if (!source.endsWith('\n') || source.endsWith('\n\n')) {
		report(source.split('\n').length, 8, 'the file must end with exactly one newline')
	}

	const lines = source.replace(/\n$/, '').split('\n')

	let fenced = false
	let section = 0
	let clause = 0

	lines.forEach((text, index) => {
		const line = index + 1

		if (/[ \t]$/.test(text)) report(line, 8, 'trailing whitespace')

		if (text === '' && lines[index - 1] === '') report(line, 1, 'two blank lines in a row')

		if (FENCE.test(text)) fenced = !fenced

		if (fenced) return

		const heading = SECTION.exec(text)

		if (heading) {
			const number = Number(heading[1])

			if (number !== section + 1) report(line, 3, `section ${number} follows section ${section}`)

			section = number
			clause = 0

			return
		}

		const numbered = CLAUSE.exec(text)

		if (!numbered) return

		const [major, minor] = [Number(numbered[1]), Number(numbered[2])]

		if (major !== section || minor !== clause + 1) {
			report(line, 3, `clause ${major}.${minor} follows ${section}.${clause}`)
		}

		clause = minor

		if (lines[index - 1] !== '') report(line, 1, `no blank line before clause ${major}.${minor}`)

		let end = index

		while (
			end + 1 < lines.length &&
			lines[end + 1] !== '' &&
			!CLAUSE.test(lines[end + 1] as string)
		) {
			end += 1
		}

		if (!TERMINAL.test((lines[end] as string).trim())) {
			report(end + 1, 4, `clause ${major}.${minor} ends without sentence punctuation`)
		}
	})

	return breaks
}

describe('cadence boundary', () => {
	it('the rule documents keep the measurable cadence (CADENCE.md rules 1, 3, 4, 8)', () => {
		const violations = RULE_DOCUMENTS.flatMap((file) =>
			cadenceBreaks(file, readFileSync(join(rootDir, file), 'utf8')),
		)

		expect(
			violations,
			`cadence break in a rule document (CADENCE.md):\n${violations.join('\n')}`,
		).toEqual([])
	})
})

// The gate is only as good as its reader, so each check has a probe.
describe('cadence reader', () => {
	const probe = (source: string) => cadenceBreaks('probe.md', source)

	it('passes a document that keeps the cadence', () => {
		expect(probe('# T\n\n## 1. A\n\n1.1 One.\n\n1.2 Two:\n\n## 2. B\n\n2.1 Three.\n')).toEqual([])
	})

	it('reports a gap in the clause numbers and in the section numbers', () => {
		expect(probe('## 1. A\n\n1.1 One.\n\n1.3 Three.\n\n## 3. C\n')).toEqual([
			'probe.md:5 rule 3 — clause 1.3 follows 1.1',
			'probe.md:7 rule 3 — section 3 follows section 1',
		])
	})

	it('reports a clause with no blank line before it, and a clause with no full stop', () => {
		expect(probe('## 1. A\n\n1.1 One.\n1.2 Two\n')).toEqual([
			'probe.md:4 rule 1 — no blank line before clause 1.2',
			'probe.md:4 rule 4 — clause 1.2 ends without sentence punctuation',
		])
	})

	it('reads the whole paragraph of a clause for its last word', () => {
		expect(probe('## 1. A\n\n1.1 One\nwraps here.\n')).toEqual([])
	})

	it('reads no clause inside a code fence', () => {
		expect(probe('## 1. A\n\n```md\n1.1 One\n1.2 Two\n```\n')).toEqual([])
	})

	it('reports stacked blank lines, trailing whitespace, and the end of the file', () => {
		expect(probe('# T \n\n\nText.')).toEqual([
			'probe.md:4 rule 8 — the file must end with exactly one newline',
			'probe.md:1 rule 8 — trailing whitespace',
			'probe.md:3 rule 1 — two blank lines in a row',
		])
	})
})
