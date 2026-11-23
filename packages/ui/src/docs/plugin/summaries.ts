import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Lexer, type Token } from 'marked'
import type { BarrelApi, ComponentApi } from './api.ts'
import { findPages, type Page, readApiImports } from './pages.ts'

/** A part of a summary: text, or the code of a code span. */
export type SummaryPart = string | { code: string }

/** The summary of each page that has one, by the path of the page, such as `/button`. */
export type Summaries = { readonly [path: string]: readonly SummaryPart[] }

// The end of a sentence: a period, a question mark, or an exclamation mark,
// and then a space. A mark at the end of the paragraph also ends a sentence.
const SENTENCE_END = /[.!?](?=\s)/

const PARAGRAPH_END = /[.!?](?=\s|$)/

/** The parts of inline Markdown tokens: each code span as code, and the text of each other token. */
function toParts(tokens: readonly Token[]): SummaryPart[] {
	return tokens.flatMap((token): SummaryPart[] => {
		if (token.type === 'codespan') return [{ code: token.text }]

		if ('tokens' in token && token.tokens) return toParts(token.tokens)

		return ['text' in token ? token.text : ' ']
	})
}

/** The parts with each run of whitespace as one space, and with each run of text as one part. */
function joinText(parts: readonly SummaryPart[]): SummaryPart[] {
	const joined: SummaryPart[] = []

	for (const part of parts) {
		const prev = joined.at(-1)

		if (typeof part !== 'string') joined.push(part)
		else if (typeof prev === 'string') joined[joined.length - 1] = prev + part
		else joined.push(part)
	}

	return joined
		.map((part) => (typeof part === 'string' ? part.replace(/\s+/g, ' ') : part))
		.filter((part) => part !== '')
}

/**
 * The first sentence of the TSDoc `markdown` of a symbol, which states what the
 * symbol is (CONVENTIONS.md §12.1). A code span stays code, and each other
 * Markdown token gives its text, such as the label of a link. A mark in a code
 * span does not end the sentence.
 */
export function summarize(markdown: string): SummaryPart[] {
	const [first] = Lexer.lex(markdown)

	if (first?.type !== 'paragraph' || !first.tokens) return []

	const parts = joinText(toParts(first.tokens))

	const sentence: SummaryPart[] = []

	for (const [index, part] of parts.entries()) {
		if (typeof part !== 'string') {
			sentence.push(part)

			continue
		}

		const end = (index === parts.length - 1 ? PARAGRAPH_END : SENTENCE_END).exec(part)

		if (end) {
			sentence.push(part.slice(0, end.index + 1))

			break
		}

		sentence.push(part)
	}

	return sentence
}

/** The text of `summary`, with the code of each code span. */
export function summaryText(summary: readonly SummaryPart[]): string {
	return summary.map((part) => (typeof part === 'string' ? part : part.code)).join('')
}

/**
 * The base component of `page` in the API data of its barrels: the component
 * with the name of the page, such as `Button`, or else the provider of that
 * name, such as `DensityProvider` for the Density page.
 */
function findBase(page: Page, apis: readonly BarrelApi[]): ComponentApi | undefined {
	for (const name of [page.name, `${page.name}Provider`]) {
		const api = apis.find((barrel) => Object.hasOwn(barrel, name))

		if (api) return api[name]
	}

	return undefined
}

/**
 * The summary of each page of the docs at `docs`: the first sentence of the
 * TSDoc of its base component ({@link summarize}). A page with no base
 * component, or with a base component that has no TSDoc, has no summary. The
 * base component is in a barrel whose API data the `index.tsx` of the page
 * imports. `readApi` gives the API data of a barrel.
 */
export async function pageSummaries(
	docs: string,
	readApi: (barrel: string) => Promise<BarrelApi>,
): Promise<Summaries> {
	const pages = path.join(docs, 'pages')

	const entries = await Promise.all(
		findPages(docs).map(async (page) => {
			const code = await readFile(path.join(pages, page.folder, 'index.tsx'), 'utf8')

			const apis = await Promise.all(readApiImports(code).map(readApi))

			const description = findBase(page, apis)?.description

			const summary = description ? summarize(description) : []

			return summary.length > 0 ? [[page.path, summary] as const] : []
		}),
	)

	return Object.fromEntries(entries.flat())
}
