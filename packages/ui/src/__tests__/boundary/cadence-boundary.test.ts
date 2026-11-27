import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import {
	isAwaitExpression,
	isBlock,
	isCallExpression,
	isCaseClause,
	isDefaultClause,
	isElementAccessExpression,
	isExpressionStatement,
	isIdentifier,
	isModuleBlock,
	isNonNullExpression,
	isParenthesizedExpression,
	isPropertyAccessExpression,
	isSourceFile,
	type Node,
	type SourceFile,
	type Statement,
} from 'typescript/unstable/ast'
import { afterAll, describe, expect, it } from 'vitest'
import { RULE_DOCUMENTS } from '../helpers/controlled-language'
import { startTypeScript } from '../helpers/ts-server'
import { workspaceRoot } from '../helpers/walk-source'

// The cadence rules of STE.md set the spacing and the shape of authored text.
// CLAUDE.md once asked for a check by hand before each commit, but no tool made
// the check, and Biome does not read Markdown. This test reads the parts of the
// cadence that a reader can measure in the rule documents, and a break fails the
// run.
//
//   - Rule 1: one blank line before each numbered clause, and never two blank
//     lines in a row.
//   - Rule 3: the numbered sections run 1, 2, 3 with no gap, and the clauses of
//     section N run N.1, N.2, N.3 with no gap.
//   - Rule 4: each numbered clause ends with sentence punctuation.
//   - Rule 7: no trailing whitespace, and one newline at the end of the file.
//
// Rules 2, 5, and 6 need judgment, so review keeps them.
//
// In code, rule 1 puts a blank line between logical blocks. An assertion is
// one statement, so the test also reads each test file of the workspace, and
// two `expect` statements in a row with no blank line between them fail the
// run.

const FENCE = /^\s*```/
const SECTION = /^## (\d+)\. /
const CLAUSE = /^(\d+)\.(\d+) /
const TERMINAL = /[.!?:]$/

/** Every measurable cadence break in one Markdown document. */
function cadenceBreaks(file: string, source: string): string[] {
	const breaks: string[] = []
	const report = (line: number, rule: number, text: string) =>
		breaks.push(`${file}:${line} rule ${rule}: ${text}`)

	if (!source.endsWith('\n') || source.endsWith('\n\n')) {
		report(source.split('\n').length, 7, 'the file must end with exactly one newline')
	}

	const lines = source.replace(/\n$/, '').split('\n')

	let fenced = false
	let section = 0
	let clause = 0

	lines.forEach((text, index) => {
		const line = index + 1

		if (/[ \t]$/.test(text)) report(line, 7, 'trailing whitespace')

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

/** The statements of a node that holds a list of statements, or none. */
function readStatements(node: Node): readonly Statement[] {
	if (isSourceFile(node) || isBlock(node) || isModuleBlock(node)) return node.statements

	if (isCaseClause(node) || isDefaultClause(node)) return node.statements

	return []
}

/** True when `statement` is an assertion: a call chain on `expect` or `expectTypeOf`. */
function isAssertion(statement: Statement): boolean {
	if (!isExpressionStatement(statement)) return false

	let node: Node = statement.expression

	if (isAwaitExpression(node)) node = node.expression

	while (
		isCallExpression(node) ||
		isPropertyAccessExpression(node) ||
		isElementAccessExpression(node) ||
		isNonNullExpression(node) ||
		isParenthesizedExpression(node)
	) {
		node = node.expression
	}

	return isIdentifier(node) && (node.text === 'expect' || node.text === 'expectTypeOf')
}

/** Each assertion that follows an assertion on the next line, with no blank line between them. */
function assertionBreaks(file: string, source: SourceFile): string[] {
	const breaks: string[] = []

	const visit = (node: Node): void => {
		const statements = readStatements(node)

		for (let index = 1; index < statements.length; index++) {
			const [previous, next] = [statements[index - 1] as Statement, statements[index] as Statement]

			if (!isAssertion(previous) || !isAssertion(next)) continue

			const gap = source.text.slice(previous.end, next.getStart())

			if (!gap.includes('\n') || /\n[ \t]*\n/.test(gap)) continue

			const line = source.getLineAndCharacterOfPosition(next.getStart()).line + 1

			breaks.push(`${file}:${line} rule 1: no blank line between two assertions`)
		}

		node.forEachChild(visit)
	}

	visit(source)

	return breaks
}

/** The roots of the workspace that hold test files. */
const TEST_ROOTS = ['apps', 'packages']

const OUTSIDE = new Set(['node_modules', 'dist', 'coverage'])

const TEST_FILE = /\.test(?:-d)?\.tsx?$/

/** Every test file under `dir`, with no entry of {@link OUTSIDE}. */
function testFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		if (entry.name.startsWith('.') || OUTSIDE.has(entry.name)) return []

		const path = join(dir, entry.name)

		if (entry.isDirectory()) return testFiles(path)

		return entry.isFile() && TEST_FILE.test(entry.name) ? [path] : []
	})
}

describe('cadence boundary', () => {
	const server = startTypeScript()

	afterAll(() => server.close())

	it('the rule documents keep the cadence (STE.md cadence rules 1, 3, 4, 7)', () => {
		const violations = RULE_DOCUMENTS.flatMap((file) =>
			cadenceBreaks(file, readFileSync(join(workspaceRoot, file), 'utf8')),
		)

		expect(violations, `cadence break in a rule document:\n${violations.join('\n')}`).toEqual([])
	})

	it('each test file puts a blank line between two assertions (STE.md cadence rule 1)', () => {
		const files = TEST_ROOTS.flatMap((root) => testFiles(join(workspaceRoot, root)))

		const violations = [...server.parse(files)].flatMap(([file, source]) =>
			assertionBreaks(relative(workspaceRoot, file).split(sep).join('/'), source),
		)

		expect(violations, `cadence break in a test file:\n${violations.join('\n')}`).toEqual([])
	})
})

// The report is only as good as its reader, so each check has a probe.
describe('cadence reader', () => {
	const probe = (source: string) => cadenceBreaks('probe.md', source)

	it('passes a document that keeps the cadence', () => {
		expect(probe('# T\n\n## 1. A\n\n1.1 One.\n\n1.2 Two:\n\n## 2. B\n\n2.1 Three.\n')).toEqual([])
	})

	it('reports a gap in the clause numbers and in the section numbers', () => {
		expect(probe('## 1. A\n\n1.1 One.\n\n1.3 Three.\n\n## 3. C\n')).toEqual([
			'probe.md:5 rule 3: clause 1.3 follows 1.1',
			'probe.md:7 rule 3: section 3 follows section 1',
		])
	})

	it('reports a clause with no blank line before it, and a clause with no full stop', () => {
		expect(probe('## 1. A\n\n1.1 One.\n1.2 Two\n')).toEqual([
			'probe.md:4 rule 1: no blank line before clause 1.2',
			'probe.md:4 rule 4: clause 1.2 ends without sentence punctuation',
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
			'probe.md:4 rule 7: the file must end with exactly one newline',
			'probe.md:1 rule 7: trailing whitespace',
			'probe.md:3 rule 1: two blank lines in a row',
		])
	})

	describe('between assertions', () => {
		const server = startTypeScript()

		afterAll(() => server.close())

		const assertions = (text: string) =>
			assertionBreaks('probe.test.ts', server.parseText('probe.test.ts', text))

		it('passes assertions that a blank line separates', () => {
			expect(assertions('expect(a).toBe(1)\n\nawait expect(b).resolves.toBe(2)\n')).toEqual([])
		})

		it('reports two assertions in a row, in each spelling', () => {
			expect(
				assertions(
					"it('a', async () => {\n\texpect(a).toBe(1)\n\tawait expect.soft(b).resolves.toBe(2)\n\texpectTypeOf(c).toBeString()\n})\n",
				),
			).toEqual([
				'probe.test.ts:3 rule 1: no blank line between two assertions',
				'probe.test.ts:4 rule 1: no blank line between two assertions',
			])
		})

		it('reads the end of an assertion that spans lines, and a comment before the next', () => {
			expect(assertions('expect(\n\ta,\n).toBe(1)\n// Why.\nexpect(b).toBe(2)\n')).toEqual([
				'probe.test.ts:5 rule 1: no blank line between two assertions',
			])
		})

		it('passes two assertions on one line, and an assertion after another statement', () => {
			expect(
				assertions('expect(a).toBe(1); expect(b).toBe(2)\nrender()\nexpect(c).toBe(3)\n'),
			).toEqual([])
		})
	})
})
