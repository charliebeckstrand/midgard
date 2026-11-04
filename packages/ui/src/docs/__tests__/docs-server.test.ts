// @vitest-environment node
import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
	entityTag,
	isFallback,
	isFresh,
	markRoot,
	pickEncoding,
	readBody,
	rootMarks,
} from '../../../scripts/docs-server.ts'

// The server of the docs compresses each text file of the build, as a CDN
// does, so a page does not cost the reader its full size. A path with no file
// and no page gets the not-found page with status 404. A client with a current
// copy of a file gets 304 and no body.

describe('pickEncoding', () => {
	it('takes brotli, else gzip, for a text file', () => {
		expect(pickEncoding('/a/index.html', 'gzip, deflate, br, zstd')).toBe('br')

		expect(pickEncoding('/a/entry.js', 'gzip, deflate')).toBe('gzip')

		expect(pickEncoding('/a/app.css', 'deflate')).toBeUndefined()

		expect(pickEncoding('/a/index.html', undefined)).toBeUndefined()
	})

	it('reads the weights of the header', () => {
		expect(pickEncoding('/a/index.html', 'br;q=0, gzip;q=0.5')).toBe('gzip')

		expect(pickEncoding('/a/index.html', 'BR;Q=1')).toBe('br')

		expect(pickEncoding('/a/index.html', '*')).toBe('br')

		expect(pickEncoding('/a/index.html', 'br;q=0, *')).toBe('gzip')

		expect(pickEncoding('/a/index.html', 'identity, *;q=0')).toBeUndefined()
	})

	it('does not compress a file that has a compressed format', () => {
		expect(pickEncoding('/a/font.woff2', 'br')).toBeUndefined()

		expect(pickEncoding('/a/sample.pdf', 'gzip')).toBeUndefined()
	})
})

describe('isFallback', () => {
	it('finds the fallback page in each locale, which the server sends with 404', () => {
		expect(isFallback('/client/__spa-fallback.html')).toBe(true)

		expect(isFallback('/client/__spa-fallback.es.html')).toBe(true)

		expect(isFallback('/client/button/index.html')).toBe(false)

		expect(isFallback('/client/assets/entry.client-Bef1esA1.js')).toBe(false)
	})
})

describe('entityTag', () => {
	it('gives a weak tag that changes with the size and the time of the file', () => {
		const tag = entityTag({ size: 314_306, mtimeMs: 1_793_416_000_123.456 })

		expect(tag).toMatch(/^W\/"[\da-f]+-[\da-f]+"$/)

		expect(entityTag({ size: 314_306, mtimeMs: 1_793_416_000_123.456 })).toBe(tag)

		expect(entityTag({ size: 314_307, mtimeMs: 1_793_416_000_123.456 })).not.toBe(tag)

		expect(entityTag({ size: 314_306, mtimeMs: 1_793_416_000_124 })).not.toBe(tag)

		// A copy with other settings of the reader is not current.
		expect(
			entityTag({ size: 314_306, mtimeMs: 1_793_416_000_123.456 }, rootMarks('theme=dark')),
		).not.toBe(tag)
	})
})

describe('rootMarks', () => {
	it('reads the stored settings of the reader from the cookies of the request', () => {
		expect(rootMarks()).toEqual({ classes: [], attributes: [] })

		expect(
			rootMarks('locale=es; theme=system; density=snug; motion=system; sidebar=locked'),
		).toEqual({
			classes: [],
			attributes: [],
		})

		expect(
			rootMarks(
				'theme=dark; density=compact; motion=reduced; sidebar=offcanvas; events-on=1; events-pinned=1',
			),
		).toEqual({
			classes: ['dark', 'density-root-sm', 'reduced-motion', 'sidebar-offcanvas'],
			attributes: ['data-events', 'data-events-pinned'],
		})

		// A light theme on a dark OS needs its own class, and a pin with the events
		// off shows no panel.
		expect(rootMarks('theme=light; density=loose; events-on=0; events-pinned=1')).toEqual({
			classes: ['light', 'density-root-lg'],
			attributes: [],
		})

		// A value that is not one of the values of a setting reads as the default.
		expect(rootMarks('theme=%3Cscript%3E; density=__proto__')).toEqual({
			classes: [],
			attributes: [],
		})
	})
})

describe('markRoot', () => {
	const html = '<!DOCTYPE html><html lang="en" class="antialiased"><head></head></html>'

	it('adds the classes after the classes of the build, and the attributes after them', () => {
		expect(
			markRoot(html, { classes: ['dark', 'reduced-motion'], attributes: ['data-events'] }),
		).toBe(
			'<!DOCTYPE html><html lang="en" class="antialiased dark reduced-motion" data-events=""><head></head></html>',
		)
	})

	it('adds a class attribute to a root that has none, and leaves a page with no marks as it is', () => {
		expect(markRoot('<html lang="es">', { classes: ['light'], attributes: [] })).toBe(
			'<html lang="es" class="light">',
		)

		expect(markRoot(html, { classes: [], attributes: [] })).toBe(html)
	})
})

describe('isFresh', () => {
	const tag = 'W/"4cbc2-19a3b1c2d3e"'

	it('takes a header that names the tag, with or without W/', () => {
		expect(isFresh(tag, tag)).toBe(true)

		expect(isFresh('"4cbc2-19a3b1c2d3e"', tag)).toBe(true)

		expect(isFresh('W/"old", W/"4cbc2-19a3b1c2d3e"', tag)).toBe(true)

		expect(isFresh('*', tag)).toBe(true)
	})

	it('refuses a missing header or another tag', () => {
		expect(isFresh(undefined, tag)).toBe(false)

		expect(isFresh('', tag)).toBe(false)

		expect(isFresh('W/"4cbc2-19a3b1c2d3f"', tag)).toBe(false)
	})
})

describe('readBody', () => {
	let root = ''

	beforeAll(async () => {
		root = await mkdtemp(path.join(tmpdir(), 'docs-server-'))
	})

	afterAll(() => rm(root, { recursive: true, force: true }))

	it('gives the file in each coding, and with no coding', async () => {
		const file = path.join(root, 'index.html')

		await writeFile(file, '<p>Button</p>'.repeat(100))

		expect(String(brotliDecompressSync(await readBody(file, 'br')))).toBe(
			'<p>Button</p>'.repeat(100),
		)

		expect(String(gunzipSync(await readBody(file, 'gzip')))).toBe('<p>Button</p>'.repeat(100))

		expect(String(await readBody(file))).toBe('<p>Button</p>'.repeat(100))
	})

	it('keeps a compressed body until the file changes', async () => {
		const file = path.join(root, 'page.html')

		await writeFile(file, 'first')

		const first = await readBody(file, 'br')

		expect(await readBody(file, 'br')).toBe(first)

		await writeFile(file, 'second build')

		await utimes(file, new Date(), new Date(Date.now() + 1000))

		expect(String(brotliDecompressSync(await readBody(file, 'br')))).toBe('second build')
	})
})
