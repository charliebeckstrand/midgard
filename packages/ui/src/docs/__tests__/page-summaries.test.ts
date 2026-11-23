// @vitest-environment node
import path from 'node:path'
import { describe, expect } from 'vitest'
import { findPages } from '../plugin/pages.ts'
import { pageSummaries, summarize, summaryText } from '../plugin/summaries.ts'
import { it } from './extractor.ts'

// The header of each page shows the first sentence of the TSDoc of its base
// component under the title (`plugin/summaries.ts`). The sentence states what
// the component is (CONVENTIONS.md §12.1), so it stays short.

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

describe('page summaries', () => {
	it('gives the TSDoc of the component or the provider with the name of the page', {
		timeout: 120_000,
	}, async ({ extractor }) => {
		const summaries = await pageSummaries(DOCS, (barrel) => extractor.extract(barrel))

		expect(summaries['/button']).toEqual([
			'Polymorphic action control: renders a ',
			{ code: '<button>' },
			' or, when ',
			{ code: 'href' },
			' is set, a ',
			{ code: '<Link>' },
			' anchor.',
		])

		expect(summaryText(summaries['/providers/density'] ?? [])).toMatch(/^A provider that opens/)
	})

	it('keeps each summary to one sentence that fits on one line', {
		timeout: 120_000,
	}, async ({ extractor }) => {
		const summaries = await pageSummaries(DOCS, (barrel) => extractor.extract(barrel))

		const long = findPages(DOCS).flatMap(({ path: route }) => {
			const text = summaryText(summaries[route] ?? [])

			return text.length > MAX_SUMMARY ? [`${route}: ${text}`] : []
		})

		expect(long).toEqual([])
	})
})
