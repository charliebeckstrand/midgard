// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { inlinePageStyles } from '../../vite/inline-styles'

let dir = ''

afterEach(() => rmSync(dir, { recursive: true, force: true }))

function site(body: string) {
	dir = mkdtempSync(path.join(tmpdir(), 'inline-styles-'))

	const stylesheet = path.join(dir, 'app.css')

	writeFileSync(
		stylesheet,
		`@import 'tailwindcss';\n@custom-variant dark (&:where(.dark, .dark *));\n@font-face { font-family: Local; src: url('./local.woff2'); }`,
	)

	mkdirSync(path.join(dir, 'client/assets'), { recursive: true })

	mkdirSync(path.join(dir, 'client/page'))

	writeFileSync(
		path.join(dir, 'client/assets/app.css'),
		'@font-face{font-family:Local;src:url(/assets/local-abc.woff2)}.p-4{padding:1rem}',
	)

	const page = path.join(dir, 'client/page/index.html')

	writeFileSync(
		page,
		`<html class="antialiased"><head><link rel="stylesheet" href="/assets/app.css"/></head><body>${body}</body></html>`,
	)

	return { clientDir: path.join(dir, 'client'), stylesheet, page }
}

describe('inlinePageStyles', () => {
	it('inlines the rules of the classes on the page, with their dark variants', async () => {
		const { page, ...options } = site('<div class="p-4 dark:bg-black [&amp;&gt;p]:m-2"></div>')

		await inlinePageStyles(options)

		const style = readFileSync(page, 'utf8').match(/<style>([\s\S]*)<\/style>/)?.[1] ?? ''

		expect(style).toContain('.p-4{')

		expect(style).toContain('.dark\\:bg-black:where(.dark,.dark *){')

		expect(style).toContain('>p{')

		expect(style).not.toContain('.m-4')
	})

	it('keeps the font faces of the full stylesheet, with the hashed URL', async () => {
		const { page, ...options } = site('<p class="p-4"></p>')

		await inlinePageStyles(options)

		const html = readFileSync(page, 'utf8')

		expect(html.match(/@font-face/g)).toHaveLength(1)

		expect(html).toContain('url(/assets/local-abc.woff2)')
	})

	it('loads the full stylesheet without a block on the first paint', async () => {
		const { page, ...options } = site('<p class="p-4"></p>')

		await inlinePageStyles(options)

		const html = readFileSync(page, 'utf8')

		expect(html).toContain(
			`<link rel="preload" as="style" href="/assets/app.css" onload="this.onload=null;this.rel='stylesheet'"/>`,
		)

		expect(html).toContain('<noscript><link rel="stylesheet" href="/assets/app.css"/></noscript>')
	})
})
