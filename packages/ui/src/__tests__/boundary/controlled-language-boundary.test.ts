import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
	extractComments,
	fileBreaks,
	LIVING_MARKDOWN,
	markdownBreaks,
	RULE_DOCUMENTS,
	scanPackage,
} from '../helpers/controlled-language'
import { startTypeScript } from '../helpers/ts-server'
import { uiRoot, workspaceRoot } from '../helpers/walk-source'

// STE.md is the project's controlled language, and CLAUDE.md §2.5 applies it to
// every authored statement. This test reads the breaks of the rules that a
// reader can count, in six shapes:
//
//   1. Rule 10 in the comments is pinned at zero. The rule admits no judgment —
//      "must" states a requirement and "can" states a possibility — so any site
//      is a break.
//   2. Rule 6 in the comments is not gated. `pnpm ste:report` lists the
//      breaks, and review decides what to fix.
//   3. The curated surface docs carry no debt in rules 3, 6, and 10, or in
//      cadence rule 5.
//   4. Neither do the rule documents at the repository root.
//   5. Rule 3 in the comments is pinned at zero: one spelling, the American one
//      that the identifiers use, so a search for `color` finds all the prose
//      about color.
//   6. Cadence rule 5 in the comments is pinned at zero. An em-dash in prose is
//      always the aside that the rule bans, so any site is a break. A code span
//      and an `@example` block are not prose, so they keep their em-dashes.
//
// Rule 4 is deliberately absent, and the reason is worth keeping. Its two
// halves behave differently. The descriptive half is conditional — the rule
// permits a passive where the active voice is longer or less clear — so a count
// of those has no correct value to reach. The instruction half is categorical
// but empty by construction: an imperative's main verb is its first word, which
// is active, so the only passives inside one sit in a subordinate clause that
// the rule allows. Gating it flagged more sites than anybody could drive to
// zero, and the flagged instructions that a reader could check were a
// suffix heuristic mistaking "is that" and "is honest" for participles. Rule 4
// stays a review concern.

// The TypeScript server parses each source that this file reads, and stops
// after the last case.
const server = startTypeScript()

afterAll(() => server.close())

describe('controlled-language boundary', () => {
	const breaks = scanPackage(server)

	it('no comment uses a banned modal (STE.md rule 10)', () => {
		const violations = breaks
			.filter((item) => item.rule === 10)
			.map((item) => `${item.file}:${item.line} — ${item.text}`)

		expect(
			violations,
			`banned modal in a comment — "must" for a requirement, "can" for a possibility (STE.md rule 10):\n${violations.join('\n')}`,
		).toEqual([])
	})

	it('no comment uses a British spelling (STE.md rule 3)', () => {
		const violations = breaks
			.filter((item) => item.rule === 3)
			.map((item) => `${item.file}:${item.line} — ${item.text}`)

		expect(
			violations,
			`British spelling in a comment — the prose uses the American form, as the identifiers do (STE.md rule 3):\n${violations.join('\n')}`,
		).toEqual([])
	})

	it('no comment sets an aside between em-dashes (STE.md cadence rule 5)', () => {
		const violations = breaks
			.filter((item) => item.rule === 'aside')
			.map((item) => `${item.file}:${item.line}: ${item.text}`)

		expect(
			violations,
			`em-dash aside in a comment. Put the aside in its own sentence or in parentheses, or use a colon or a comma (STE.md cadence rule 5):\n${violations.join('\n')}`,
		).toEqual([])
	})

	it('the living Markdown keeps rules 3, 6, and 10, and cadence rule 5 (CONVENTIONS.md §12.2)', () => {
		const violations: string[] = []

		for (const file of LIVING_MARKDOWN) {
			for (const item of markdownBreaks(file, readFileSync(join(uiRoot, file), 'utf8'))) {
				violations.push(`${item.file}:${item.line} rule ${item.rule} — ${item.text}`)
			}
		}

		expect(
			violations,
			`the curated surface docs are a quick-glance index, so they carry no debt — split the sentence, drop the modal, use the American spelling, or move the aside out of em-dashes (STE.md rules 3, 6, and 10, and cadence rule 5):\n${violations.join('\n')}`,
		).toEqual([])
	})

	it('the rule documents keep rules 3, 6, and 10, and cadence rule 5 (CLAUDE.md §2.5)', () => {
		const violations: string[] = []

		for (const file of RULE_DOCUMENTS) {
			for (const item of markdownBreaks(file, readFileSync(join(workspaceRoot, file), 'utf8'))) {
				violations.push(`${item.file}:${item.line} rule ${item.rule} — ${item.text}`)
			}
		}

		expect(
			violations,
			`the rule documents state the rules every package follows, so they carry no debt — split the sentence, drop the modal, use the American spelling, or move the aside out of em-dashes (STE.md rules 3, 6, and 10, and cadence rule 5):\n${violations.join('\n')}`,
		).toEqual([])
	})
})

// Each comment check reads through `extractComments`, so a comment it skips is
// a comment no check reads.
describe('comment reader', () => {
	const texts = (file: string, source: string) =>
		extractComments(server.parseText(file, source)).map((comment) => comment.text.trim())

	it('reads a comment after a regex literal that holds a quote', () => {
		expect(texts('probe.ts', "const quote = /name: '/\n// after\n")).toEqual(['after'])
	})

	it('reads a comment after an apostrophe in JSX text', () => {
		expect(texts('probe.tsx', "export const P = () => <p>Don't</p>\n// after\n")).toEqual(['after'])
	})

	it('reads a comment inside a JSX expression', () => {
		expect(texts('probe.tsx', 'export const P = () => <p>{/* note */}</p>\n')).toEqual(['note'])
	})

	it('opens no comment inside a literal or JSX text', () => {
		const source = [
			"const a = 'https://a.dev'",
			`const b = \`https://\${a}//b\``,
			'const c = /\\/\\//',
			'export const P = () => <p>https://c.dev</p>',
		].join('\n')

		expect(texts('probe.tsx', source)).toEqual([])
	})
})

// The aside gate reads every prose payload, a `@see` note included, and skips
// code and default values.
describe('aside reader', () => {
	const flagged = (source: string) =>
		fileBreaks('probe.ts', server.parseText('probe.ts', source))
			.filter((item) => item.rule === 'aside')
			.map((item) => item.text)

	it('reports an em-dash in prose and in a tag payload', () => {
		expect(
			flagged('// The row holds — for now — its height.\n/** @see Row — the owner. */\n'),
		).toEqual(['The row holds — for now — its height.', 'Row — the owner.'])
	})

	it('reads no default value, inline or not', () => {
		expect(flagged("/** An empty cell. @defaultValue '—' */\n")).toEqual([])
	})

	it('reads no code span and no example', () => {
		expect(
			flagged(
				"/**\n * An empty cell shows `'—'`.\n *\n * @example\n * ```ts\n * label(null) // '—'\n * ```\n */\n",
			),
		).toEqual([])
	})
})

// The rule 3 gate reads prose only, so a code span that names a key keeps its
// own spelling.
describe('spelling reader', () => {
	const flagged = (source: string) =>
		fileBreaks('probe.ts', server.parseText('probe.ts', source))
			.filter((item) => item.rule === 3)
			.map((item) => item.text)

	it('reports a British form, and a British form with a prefix', () => {
		expect(flagged('// The row keeps its colour.\n// The cell stays unlabelled.\n')).toEqual([
			'colour: The row keeps its colour.',
			'unlabelled: The cell stays unlabelled.',
		])
	})

	it('reads no code span, and passes the American form', () => {
		expect(flagged('// The `colour` key keeps the color of the row.\n')).toEqual([])
	})
})
