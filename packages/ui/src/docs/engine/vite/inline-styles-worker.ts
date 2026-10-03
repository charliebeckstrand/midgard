import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { workerData } from 'node:worker_threads'
import { compile, optimize } from '@tailwindcss/node'

// The worker of `inlinePageStyles`. It puts the styles of each page in
// `files` in the HTML of that page. Node runs this file without Vite, so it
// imports only Node modules and packages.

// The `class` attribute of an element in the HTML.
const CLASS_ATTRIBUTE = / class="([^"]*)"/g

// The entities that React writes in the value of an attribute.
const ENTITY = /&(amp|lt|gt|quot|#x27);/g

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#x27': "'" }

// A `@font-face` rule of a minified stylesheet. The rule has no nested block.
const FONT_FACE = /@font-face\{[^}]*\}/g

// The link to the full stylesheet that the build writes in the head.
const STYLESHEET_LINK = /<link rel="stylesheet" href="([^"]+\.css)"\/>/

const { clientDir, stylesheet, files }: { clientDir: string; stylesheet: string; files: string[] } =
	workerData

const source = readFileSync(stylesheet, 'utf8')

const base = path.dirname(stylesheet)

const fontFaces = new Map<string, string>()

for (const file of files) {
	const target = path.join(clientDir, file)

	const html = readFileSync(target, 'utf8')

	const [tag, href] = html.match(STYLESHEET_LINK) ?? []

	if (!tag || !href) throw new Error(`${file}: no stylesheet link`)

	let faces = fontFaces.get(href)

	if (faces === undefined) {
		faces = readFileSync(path.join(clientDir, href), 'utf8').match(FONT_FACE)?.join('') ?? ''

		fontFaces.set(href, faces)
	}

	const classes = new Set<string>()

	for (const [, value = ''] of html.matchAll(CLASS_ATTRIBUTE)) {
		for (const name of value
			.replace(ENTITY, (match, entity) => ENTITIES[entity] ?? match)
			.split(/\s+/)) {
			if (name) classes.add(name)
		}
	}

	// A compiler keeps each class that it builds, so each page gets its own.
	const compiler = await compile(source, { base, onDependency: () => {} })

	const css =
		faces + optimize(compiler.build([...classes]), { minify: true }).code.replace(FONT_FACE, '')

	if (css.includes('</')) throw new Error(`${file}: the styles cannot go in a <style>`)

	const swap = `<style>${css}</style><link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'"/><noscript>${tag}</noscript>`

	writeFileSync(target, html.replace(tag, swap))
}
