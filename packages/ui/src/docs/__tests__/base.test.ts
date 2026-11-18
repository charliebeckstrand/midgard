// @vitest-environment node
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { docsBase, moveUnderBase } from '../plugin/base.ts'

// The docs build can be for a path of a site other than the root, such as
// `/docs/`. With no base, the build does not change.

describe('docsBase', () => {
	it('gives the root path with no DOCS_BASE', () => {
		vi.stubEnv('DOCS_BASE', undefined)

		expect(docsBase()).toBe('/')

		vi.stubEnv('DOCS_BASE', '/')

		expect(docsBase()).toBe('/')
	})

	it.each(['docs', '/docs', '/docs/', 'docs/', '//docs//'])('gives /docs/ for %s', (value) => {
		vi.stubEnv('DOCS_BASE', value)

		expect(docsBase()).toBe('/docs/')
	})
})

describe('moveUnderBase', () => {
	/** A client folder as the build writes it with the base `/docs/`, before the move. */
	async function based(): Promise<string> {
		const clientDir = await mkdtemp(path.join(tmpdir(), 'docs-base-'))

		onTestFinished(() => rm(clientDir, { recursive: true, force: true }))

		for (const file of [
			'docs/index.html',
			'docs/button/index.html',
			'assets/app.js',
			'index.html',
		]) {
			await mkdir(path.dirname(path.join(clientDir, file)), { recursive: true })

			await writeFile(path.join(clientDir, file), file)
		}

		return clientDir
	}

	it('moves the assets and the fallback document into the folder of the base', async () => {
		const clientDir = await based()

		await moveUnderBase(clientDir, '/docs/')

		expect(await readdir(clientDir)).toEqual(['docs'])

		expect((await readdir(path.join(clientDir, 'docs'))).sort()).toEqual([
			'__spa-fallback.html',
			'assets',
			'button',
			'index.html',
		])

		expect(existsSync(path.join(clientDir, 'docs', 'assets', 'app.js'))).toBe(true)
	})

	it('does nothing with the root path', async () => {
		const clientDir = await based()

		await moveUnderBase(clientDir, '/')

		expect((await readdir(clientDir)).sort()).toEqual(['assets', 'docs', 'index.html'])
	})
})
