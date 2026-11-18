// @vitest-environment node
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'
import { docsTarget, moveUnderBase } from '../plugin/target.ts'

// The docs build can be for a path of a site other than the root, such as
// `/docs/`. With no variable, the target is the target of the deploy of this
// repository.

/** The folder of the docs app. */
const APP_DIR = path.resolve(import.meta.dirname, '..')

describe('docsTarget', () => {
	it('gives the root path and the `dist` folder with no variable', () => {
		expect(docsTarget({})).toEqual({
			base: '/',
			buildDir: path.join(APP_DIR, 'dist'),
			clientDir: path.join(APP_DIR, 'dist', 'client'),
		})

		expect(docsTarget({ DOCS_BASE: '/', DOCS_BUILD_DIR: '' }).base).toBe('/')
	})

	it.each(['docs', '/docs', '/docs/', 'docs/', '//docs//'])('gives /docs/ for %s', (value) => {
		expect(docsTarget({ DOCS_BASE: value }).base).toBe('/docs/')
	})

	it('reads the folder of the build from the folder of the docs app', () => {
		const target = docsTarget({ DOCS_BUILD_DIR: '../../node_modules/.cache/docs' })

		expect(target.clientDir).toBe(
			path.resolve(APP_DIR, '..', '..', 'node_modules', '.cache', 'docs', 'client'),
		)
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

	it('moves the assets and the fallback into the folder of the base', async () => {
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
