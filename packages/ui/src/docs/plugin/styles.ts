import { globSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { compile, optimize } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import { noop } from '../../utilities/noop.ts'

// A `@font-face` rule of a minified stylesheet. The rule holds no nested block.
const FONT_FACE = /@font-face\{[^}]*\}/g

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
	const [built, ...others] = globSync(`assets/${path.basename(stylesheet, '.css')}-*.css`, {
		cwd: clientDir,
	})

	if (!built || others.length > 0) throw new Error(`docs: no single built copy of ${stylesheet}`)

	const fontFaces =
		readFileSync(path.join(clientDir, built), 'utf8').match(FONT_FACE)?.join('') ?? ''

	const source = readFileSync(stylesheet, 'utf8')

	const base = path.dirname(stylesheet)

	for (const page of globSync('**/*.html', { cwd: clientDir })) {
		const file = path.join(clientDir, page)

		const html = readFileSync(file, 'utf8')

		const classes = new Scanner({}).scanFiles([{ content: html, extension: 'html' }])

		// A compiler keeps each class that it builds, so each page gets its own.
		const compiler = await compile(source, { base, onDependency: noop })

		const css =
			fontFaces + optimize(compiler.build(classes), { minify: true }).code.replace(FONT_FACE, '')

		if (css.includes('</')) throw new Error(`docs: ${page}: the CSS can close its <style>`)

		const style = `<style data-precedence="default" data-href="critical">${css}</style>`

		writeFileSync(file, html.replace('</head>', `${style}</head>`))
	}
}
