// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { isSpecialLang } from 'shiki/core'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LANG, DEFAULT_THEME } from '../../components/code/code-shiki.ts'
import { DOCS_THEMES, formatLanguages, formatThemes } from '../plugin/shiki-set.ts'

// The docs bundle a set of the grammars and the themes of Shiki
// (`plugin/shiki-set.ts`). A fence or a `CodeBlock` of a language that is not
// in the set shows as plain text in the build, but the dev server highlights
// it. These tests make sure that the set holds each language that the docs
// name.

const DOCS = path.resolve(import.meta.dirname, '..')

/** The exports of the module source `code`. */
function load(code: string): Promise<Record<string, unknown>> {
	return import(`data:text/javascript,${encodeURIComponent(code)}`)
}

/** Each source file of the docs app, with no test and no build output. */
function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const file = path.join(dir, entry.name)

		if (entry.isDirectory()) {
			return entry.name === '__tests__' || entry.name === 'dist' ? [] : sourceFiles(file)
		}

		return /\.tsx?$/.test(entry.name) ? [file] : []
	})
}

// The language of a Markdown fence: three backticks or tildes, also the
// escaped backticks of a template literal, and then the language.
const FENCE = /(?:```|(?:\\`){3}|~~~)([\w#+-]+)/g

// The `lang` of a `CodeBlock` element.
const CODE_BLOCK_LANG = /<CodeBlock\b[^>]*?\blang="([^"]+)"/g

/** Each language that a fence or a `CodeBlock` of the docs names. */
function docsLanguages(): Set<string> {
	const langs = new Set<string>([DEFAULT_LANG])

	for (const file of sourceFiles(DOCS)) {
		const code = readFileSync(file, 'utf8')

		for (const [, lang] of code.matchAll(FENCE)) if (lang) langs.add(lang)

		for (const [, lang] of code.matchAll(CODE_BLOCK_LANG)) if (lang) langs.add(lang)
	}

	return langs
}

describe('the Shiki set of the docs', () => {
	it('has a grammar for each language of the docs', async () => {
		const { bundledLanguages } = await load(formatLanguages())

		const named = [...docsLanguages()]

		// The scan finds the fences of the Markdown demos.
		expect(named).toEqual(expect.arrayContaining(['tsx', 'ts', 'sh']))

		const missing = named.filter(
			(lang) => !isSpecialLang(lang) && !Object.hasOwn(bundledLanguages as object, lang),
		)

		expect(missing, 'Add the grammar of each language to DOCS_LANGUAGES').toEqual([])
	})

	it('gives an import for each grammar and each alias', async () => {
		const { bundledLanguages, bundledLanguagesInfo } = await load(formatLanguages())

		const info = bundledLanguagesInfo as { id: string; aliases?: string[] }[]

		expect(Object.keys(bundledLanguages as object).sort()).toEqual(
			info.flatMap(({ id, aliases = [] }) => [id, ...aliases]).sort(),
		)

		for (const importGrammar of Object.values(bundledLanguages as object)) {
			expect(importGrammar).toBeTypeOf('function')
		}
	})

	it('has the default theme of CodeBlock', async () => {
		const { bundledThemes } = await load(formatThemes())

		expect(Object.keys(bundledThemes as object)).toEqual([...DOCS_THEMES])

		expect(DOCS_THEMES).toContain(DEFAULT_THEME)
	})
})
