import { globSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { compile, optimize } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import { noop } from '../../utilities/noop.ts'
import { builtStylesheet, FONT_FACE } from './stylesheet.ts'

// The characters that React escapes in the HTML that it renders, by reference.
const REFERENCES: Readonly<Record<string, string>> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#x27;': "'",
}

const REFERENCE = /&(?:amp|lt|gt|quot|#x27);/g

/**
 * Returns the class candidates in the HTML of a page. React writes `&`, `<`,
 * `>`, `"`, and `'` in an attribute as a character reference, and the scanner
 * reads the reference as text. The scanner thus reads the HTML with each
 * reference changed back to its character. Otherwise it does not find a class
 * such as `[:root[data-debug]_&]:contents` or `has-[>:disabled]:opacity-50`.
 */
export function scanClasses(html: string): string[] {
	const text = html.replace(REFERENCE, (reference) => REFERENCES[reference] ?? reference)

	return new Scanner({}).scanFiles([{ content: text, extension: 'html' }])
}

/**
 * Writes the critical CSS of each prerendered page into the head of its HTML.
 *
 * Tailwind's `Scanner` finds the classes in the HTML of the page, and
 * Tailwind compiles `stylesheet` for those classes only. The `dark:` and
 * density variants of a class come with it, so each appearance paints
 * correctly before the full stylesheet loads. The full stylesheet loads after
 * hydration (`app/root.tsx`).
 *
 * The `<style>` takes the `default` precedence of React, so React puts the
 * full stylesheet after it, and a rule of the full stylesheet wins over the
 * same rule here. Only Vite knows the hashed URL of a font file, so the
 * `@font-face` rules come from the built stylesheet.
 */
export async function inlineCriticalCss(clientDir: string, stylesheet: string): Promise<void> {
	const fontFaces = builtStylesheet(clientDir, stylesheet).match(FONT_FACE)?.join('') ?? ''

	const source = readFileSync(stylesheet, 'utf8')

	const base = path.dirname(stylesheet)

	for (const page of globSync('**/*.html', { cwd: clientDir })) {
		const file = path.join(clientDir, page)

		const html = readFileSync(file, 'utf8')

		const classes = scanClasses(html)

		// A compiler keeps each class that it builds, so each page gets its own.
		const compiler = await compile(source, { base, onDependency: noop })

		const css =
			fontFaces + optimize(compiler.build(classes), { minify: true }).code.replace(FONT_FACE, '')

		if (css.includes('</')) throw new Error(`docs: ${page}: the CSS can close its <style>`)

		const style = `<style data-precedence="default" data-href="critical">${css}</style>`

		writeFileSync(file, html.replace('</head>', `${style}</head>`))
	}
}
