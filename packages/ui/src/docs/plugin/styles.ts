import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
import { compile, optimize } from '@tailwindcss/node'
import { Scanner } from '@tailwindcss/oxide'
import { noop } from '../../utilities/noop.ts'

// A `@font-face` rule of a minified stylesheet. The rule holds no nested block.
const FONT_FACE = /@font-face\{[^}]*\}/g

// The text of the built copy of `stylesheet` in `clientDir`.
function builtStylesheet(clientDir: string, stylesheet: string): string {
	const [built, ...others] = globSync(`assets/${path.basename(stylesheet, '.css')}-*.css`, {
		cwd: clientDir,
	})

	if (!built || others.length > 0) throw new Error(`docs: no single built copy of ${stylesheet}`)

	return readFileSync(path.join(clientDir, built), 'utf8')
}

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

// A comment of a stylesheet.
const COMMENT = /\/\*[\s\S]*?\*\//g

// The list of a `@source inline(...)` rule. A `@source not inline(...)` rule does not match.
const SOURCE_INLINE = /@source\s+inline\(\s*(['"])(.*?)\1\s*\)/g

// An `@import` of a stylesheet by a relative path.
const RELATIVE_IMPORT = /@import\s+(['"])(\.{1,2}\/[^'"]+\.css)\1/g

/**
 * Expands the braces of a class of `@source inline(...)`, as Tailwind does.
 * `{one,two}-{a,b}` gives `one-a`, `one-b`, `two-a`, and `two-b`. A brace can
 * hold a brace. A range, such as `{1..6}`, stays as it is. The docs
 * stylesheet scans this folder, so the examples are not Tailwind classes.
 */
export function expandBraces(pattern: string): string[] {
	const open = pattern.indexOf('{')

	if (open < 0) return [pattern]

	const options: string[] = []

	let depth = 0

	let start = open + 1

	for (let index = open; index < pattern.length; index++) {
		const char = pattern[index]

		if (char === '{') depth++
		else if (char === ',' && depth === 1) {
			options.push(pattern.slice(start, index))

			start = index + 1
		} else if (char === '}' && --depth === 0) {
			options.push(pattern.slice(start, index))

			const [head, tail] = [pattern.slice(0, open), pattern.slice(index + 1)]

			if (options.length === 1)
				return expandBraces(tail).map((rest) => `${head}{${options[0]}}${rest}`)

			return options.flatMap((option) => expandBraces(`${head}${option}${tail}`))
		}
	}

	return [pattern]
}

/**
 * Returns each class that a `@source inline(...)` rule adds, in `stylesheet`
 * and in each stylesheet that it imports by a relative path.
 */
export function inlineClasses(stylesheet: string): string[] {
	const classes = new Set<string>()

	const read = new Set<string>()

	const visit = (file: string) => {
		if (read.has(file)) return

		read.add(file)

		const text = readFileSync(file, 'utf8').replace(COMMENT, '')

		for (const [, , list = ''] of text.matchAll(SOURCE_INLINE)) {
			for (const pattern of list.split(/\s+/).filter(Boolean)) {
				for (const name of expandBraces(pattern)) classes.add(name)
			}
		}

		for (const [, , relative = ''] of text.matchAll(RELATIVE_IMPORT)) {
			visit(path.resolve(path.dirname(file), relative))
		}
	}

	visit(stylesheet)

	return [...classes]
}

/**
 * Compiles `source` for a page whose HTML holds `classes`, and minifies the
 * result. `base` is the folder of `source`, and `inline` holds the classes of
 * its `@source inline(...)` rules ({@link inlineClasses}).
 *
 * Tailwind builds each class of `@source inline(...)` in each compile. The
 * HTML holds each class that the page uses, so the compile leaves out the
 * others. A class with a quote cannot go in the rule, so it stays.
 */
export async function compilePage(
	source: string,
	base: string,
	inline: readonly string[],
	classes: string[],
): Promise<string> {
	const used = new Set(classes)

	const unused = inline.filter((name) => !used.has(name) && !/['"]/.test(name))

	const input = unused.length > 0 ? `${source}\n@source not inline('${unused.join(' ')}');` : source

	// A compiler keeps each class that it builds, so each page gets its own.
	const compiler = await compile(input, { base, onDependency: noop })

	return optimize(compiler.build(classes), { minify: true }).code
}

/** The pages that one worker of {@link inlineCriticalCss} writes. */
export type CriticalCssJob = {
	clientDir: string
	stylesheet: string
	/** The `@font-face` rules of the built stylesheet. */
	fontFaces: string
	/** The classes of the `@source inline(...)` rules of `stylesheet` ({@link inlineClasses}). */
	inline: string[]
	/** The paths of the HTML files, relative to `clientDir`. */
	pages: string[]
}

/**
 * Writes the critical CSS of each page of `job` into the head of its HTML.
 * Each worker of {@link inlineCriticalCss} runs this function
 * (`styles-worker.ts`).
 */
export async function inlinePages({
	clientDir,
	stylesheet,
	fontFaces,
	inline,
	pages,
}: CriticalCssJob): Promise<void> {
	const source = readFileSync(stylesheet, 'utf8')

	const base = path.dirname(stylesheet)

	for (const page of pages) {
		const file = path.join(clientDir, page)

		const html = readFileSync(file, 'utf8')

		const css =
			fontFaces +
			(await compilePage(source, base, inline, scanClasses(html))).replace(FONT_FACE, '')

		if (css.includes('</')) throw new Error(`docs: ${page}: the CSS can close its <style>`)

		const style = `<style data-precedence="default" data-href="critical">${css}</style>`

		writeFileSync(file, html.replace('</head>', `${style}</head>`))
	}
}

/** Runs `job` in a worker thread. The promise rejects when the worker fails. */
function runWorker(job: CriticalCssJob): Promise<void> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./styles-worker.ts', import.meta.url), { workerData: job })

		worker.once('error', reject)

		worker.once('exit', (code) => {
			if (code === 0) resolve()
			else reject(new Error(`docs: a critical CSS worker stopped with the code ${code}`))
		})
	})
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
 *
 * The `@source inline(...)` rules of `ui` add the breakpoint classes that a
 * structure unit makes at run time. The full stylesheet needs each of them,
 * but the CSS of a page needs only those in its HTML. With the others, the
 * CSS of the Button page was 497 KB, and without them it is 176 KB.
 *
 * The compile of one page takes about 0.3 s on one core, and the docs have
 * about 150 pages. So one worker thread for each core writes a part of the
 * pages. On a four-core container the step took 51 s on the main thread.
 */
export async function inlineCriticalCss(clientDir: string, stylesheet: string): Promise<void> {
	const fontFaces = builtStylesheet(clientDir, stylesheet).match(FONT_FACE)?.join('') ?? ''

	const pages = globSync('**/*.html', { cwd: clientDir })

	const inline = inlineClasses(stylesheet)

	const count = Math.min(availableParallelism(), pages.length)

	await Promise.all(
		Array.from({ length: count }, (_, index) =>
			runWorker({
				clientDir,
				stylesheet,
				fontFaces,
				inline,
				pages: pages.filter((_, page) => page % count === index),
			}),
		),
	)
}
