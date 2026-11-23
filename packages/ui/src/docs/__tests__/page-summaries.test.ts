// @vitest-environment node
import path from 'node:path'
import { describe, expect } from 'vitest'
import { findPages } from '../plugin/pages.ts'
import { pageSummaries, readPackageDoc, summarize, summaryText } from '../plugin/summaries.ts'
import { it } from './extractor.ts'

// Each page shows a summary under its title (`plugin/summaries.ts`): the first
// sentence of the package documentation of its barrel, or else of the TSDoc
// of its base component. The sentence states what the page shows
// (CONVENTIONS.md §12.1), so it stays short.

const DOCS = path.resolve(import.meta.dirname, '..')

/** The most characters in the text of a summary, so that it fits on one line of a wide header. */
const MAX_SUMMARY = 100

describe('summarize', () => {
	it('gives the first sentence of the first paragraph', () => {
		expect(summarize('A button. It submits a form.\n\nMore text.')).toEqual(['A button.'])
	})

	it('keeps each code span as code, and a mark in a code span does not end the sentence', () => {
		expect(summarize('Calls `a.b()` with `x`. Then stops.')).toEqual([
			'Calls ',
			{ code: 'a.b()' },
			' with ',
			{ code: 'x' },
			'.',
		])
	})

	it('gives the text of a link and of an emphasis, and one space for each line break', () => {
		expect(summarize('A **non-modal** dialog\nwith [marked](https://marked.js.org).')).toEqual([
			'A non-modal dialog with marked.',
		])
	})

	it('gives the whole paragraph when no mark ends a sentence', () => {
		expect(summarize('A button')).toEqual(['A button'])
	})
})

describe('readPackageDoc', () => {
	it('gives the text of a leading package comment before its first tag', () => {
		const code = [
			'/**',
			' * Progress indicators: a {@link ProgressBar | bar}',
			' * and a gauge.',
			' *',
			' * @packageDocumentation',
			' */',
			'',
			"export { ProgressBar } from './progress-bar'",
		].join('\n')

		expect(readPackageDoc(code)).toBe('Progress indicators: a bar\nand a gauge.')
	})

	it('gives nothing for a leading comment with no package tag, or for no comment', () => {
		expect(readPackageDoc("/** A note. */\nexport { A } from './a'")).toBeUndefined()

		expect(readPackageDoc("export { A } from './a'")).toBeUndefined()
	})
})

describe('page summaries', () => {
	it('gives the package documentation of the barrel, or the TSDoc of the base component', {
		timeout: 120_000,
	}, async ({ extractor }) => {
		const summaries = await pageSummaries(DOCS, (barrel) => extractor.extract(barrel))

		expect(summaries['/button']).toEqual([
			'An action control that renders a ',
			{ code: '<button>' },
			', or a ',
			{ code: '<Link>' },
			' anchor when ',
			{ code: 'href' },
			' is set.',
		])

		expect(summaryText(summaries['/providers/density'] ?? [])).toMatch(/^A provider that opens/)

		expect(summaryText(summaries['/progress'] ?? [])).toMatch(/^Progress indicators/)
	})

	it('gives each page a summary of one sentence that fits on one line', {
		timeout: 120_000,
	}, async ({ extractor }) => {
		const summaries = await pageSummaries(DOCS, (barrel) => extractor.extract(barrel))

		const wrong = findPages(DOCS).flatMap(({ path: route }) => {
			const text = summaryText(summaries[route] ?? [])

			return text === '' || text.length > MAX_SUMMARY ? [`${route}: ${text}`] : []
		})

		expect(wrong).toEqual([])
	})
})
