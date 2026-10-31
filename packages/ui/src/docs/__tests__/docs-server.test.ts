// @vitest-environment node
import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pickEncoding, readBody } from '../../../scripts/docs-server.ts'

// The server of the docs compresses each text file of the build, as a CDN
// does, so a page does not cost the reader its full size.

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
