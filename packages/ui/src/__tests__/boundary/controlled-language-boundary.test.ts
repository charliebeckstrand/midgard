import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	advise,
	extractComments,
	fileBreaks,
	LIVING_MARKDOWN,
	markdownBreaks,
	packageDir,
	RULE_DOCUMENTS,
	rootDir,
	scanPackage,
} from '../helpers/controlled-language'

// STE.md is the project's controlled language, and CLAUDE.md §2.5 applies it to
// every authored statement. This test reports the breaks of the rules that a
// reader can count. It is advisory: it writes each break to the log and does
// not fail the run, so a comment does not stop a build. Review decides what to
// fix.
//
// It reports in five shapes:
//
//   1. Rule 10 in the comments. The rule admits no judgment — "must" states a
//      requirement and "can" states a possibility — so any site is a break.
//   2. Rule 6 in the comments.
//   3. Rules 3, 6, and 10 in the curated surface docs.
//   4. Rules 3, 6, and 10 in the rule documents at the repository root.
//   5. Rule 3 in the comments: one spelling, the American one that the
//      identifiers use, so a search for `color` finds all the prose about color.
//
// Rule 4 is deliberately absent, and the reason is worth keeping. Its two
// halves behave differently. The descriptive half is conditional — the rule
// permits a passive where the active voice is longer or less clear — so a count
// of those has no correct value to reach. The instruction half is categorical
// but empty by construction: an imperative's main verb is its first word, which
// is active, so the only passives inside one sit in a subordinate clause that
// the rule allows. Gating it measured about 1,600 sites nobody could drive to
// zero, against 33 flagged instructions of which the readable ones were a
// suffix heuristic mistaking "is that" and "is honest" for participles. Rule 4
// stays a review concern.

describe('controlled-language boundary', () => {
	const breaks = scanPackage()

	it('reports a banned modal in a comment (STE.md rule 10)', () => {
		const violations = breaks
			.filter((item) => item.rule === 10)
			.map((item) => `${item.file}:${item.line} — ${item.text}`)

		advise(
			`banned modal in a comment — "must" for a requirement, "can" for a possibility (STE.md rule 10)`,
			violations,
		)
	})

	it('reports a British spelling in a comment (STE.md rule 3)', () => {
		const violations = breaks
			.filter((item) => item.rule === 3)
			.map((item) => `${item.file}:${item.line} — ${item.text}`)

		advise(
			`British spelling in a comment — the prose uses the American form, as the identifiers do (STE.md rule 3)`,
			violations,
		)
	})

	it('reports a comment past the sentence cap (STE.md rule 6)', () => {
		const violations = breaks
			.filter((item) => item.rule === 6)
			.map((item) => `${item.file}:${item.line} — ${item.text}`)

		advise(
			`sentence past the cap — 20 words for an instruction, 25 for a description (STE.md rule 6)`,
			violations,
		)
	})

	it('reports breaks of rules 3, 6, and 10 in the living Markdown (CONVENTIONS.md §12.2)', () => {
		const violations: string[] = []

		for (const file of LIVING_MARKDOWN) {
			for (const item of markdownBreaks(file, readFileSync(join(packageDir, file), 'utf8'))) {
				violations.push(`${item.file}:${item.line} rule ${item.rule} — ${item.text}`)
			}
		}

		advise(
			`the curated surface docs are a quick-glance index, so they carry no debt — split the sentence, drop the modal, or use the American spelling (STE.md rules 3, 6, and 10)`,
			violations,
		)
	})

	it('reports breaks of rules 3, 6, and 10 in the rule documents (CLAUDE.md §2.5)', () => {
		const violations: string[] = []

		for (const file of RULE_DOCUMENTS) {
			for (const item of markdownBreaks(file, readFileSync(join(rootDir, file), 'utf8'))) {
				violations.push(`${item.file}:${item.line} rule ${item.rule} — ${item.text}`)
			}
		}

		advise(
			`the rule documents state the rules every package follows, so they carry no debt — split the sentence, drop the modal, or use the American spelling (STE.md rules 3, 6, and 10)`,
			violations,
		)
	})
})

// Both comment reports read through `extractComments`, so a comment it skips
// is a comment neither report checks.
describe('comment reader', () => {
	const texts = (file: string, source: string) =>
		extractComments(file, source).map((comment) => comment.text.trim())

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

// The rule 3 report reads prose only, so a code span that names a key keeps its
// own spelling.
describe('spelling reader', () => {
	const flagged = (source: string) =>
		fileBreaks('probe.ts', source)
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
