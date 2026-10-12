// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { compilePage, expandBraces, inlineClasses, scanClasses } from '../plugin/styles.ts'

describe('scanClasses', () => {
	it.each([
		'[:root[data-debug]_&]:contents',
		'has-[>:disabled]:opacity-50',
		"after:content-['']",
		'[&>[data-slot=field]+[data-slot]]:mt-2',
	])('finds %s in the HTML that React renders', (name) => {
		const html = renderToStaticMarkup(<span className={`hidden ${name}`} />)

		expect(scanClasses(html)).toEqual(expect.arrayContaining(['hidden', name]))
	})
})

describe('expandBraces', () => {
	it.each([
		['plain', ['plain']],
		['{one,two}-{a,b}', ['one-a', 'one-b', 'two-a', 'two-b']],
		['{one,two-{a,b}}-end', ['one-end', 'two-a-end', 'two-b-end']],
		['token-[1,2]', ['token-[1,2]']],
		['range-{1..6}', ['range-{1..6}']],
	])('expands %s', (pattern, names) => {
		expect(expandBraces(pattern)).toEqual(names)
	})
})

describe('the critical CSS of a page', { timeout: 30_000 }, () => {
	const stylesheet = path.join(import.meta.dirname, '..', 'app', 'app.css')

	const source = readFileSync(stylesheet, 'utf8')

	const base = path.dirname(stylesheet)

	const inline = inlineClasses(stylesheet)

	it('finds the classes of the `@source inline(...)` rules of ui', () => {
		expect(inline).toEqual(expect.arrayContaining(['sm:p-0', '2xl:grid-cols-6', 'md:flex-col']))
	})

	// Tailwind expands each rule itself. When the list misses a class of a rule,
	// Tailwind builds that class for a page with no classes.
	it('builds no utility for a page with no classes', async () => {
		expect(await compilePage(source, base, inline, [])).not.toMatch(/@layer utilities\s*\{/)
	})

	it('keeps each class of a rule that the page uses', async () => {
		const css = await compilePage(source, base, inline, ['sm:grid-cols-2'])

		expect(css).toContain('.sm\\:grid-cols-2{')

		expect(css).not.toContain('.sm\\:grid-cols-3{')
	})
})
