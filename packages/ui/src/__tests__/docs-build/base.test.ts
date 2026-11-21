import { execFile } from 'node:child_process'
import { existsSync, globSync, readdirSync, readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { LOCALES, localeFile } from '../../docs/app/language.ts'
import { docsTarget } from '../../docs/plugin/target.ts'

// The docs build can be for a path of a site other than the root, such as
// `/docs/` (`src/docs/plugin/target.ts`). This file builds the docs again with
// that base, in a folder of its own, and reads the files. The other files of
// the suite test the build with no base, which `docs:build` writes.

const BASE = '/docs/'

/** The folder of the package. */
const PACKAGE_DIR = path.resolve(import.meta.dirname, '..', '..', '..')

// The folder is in the package, where the server build finds its packages.
const target = docsTarget({
	DOCS_BASE: BASE,
	DOCS_BUILD_DIR: path.join(PACKAGE_DIR, 'node_modules', '.cache', 'docs-base'),
})

/** The folder of the base in the client folder, where each file of the build goes. */
const baseDir = path.join(target.clientDir, target.base)

// The value of each `href` and `src` attribute that starts with one slash: a
// path of the site, not a URL of another host.
const SITE_PATH = /\s(?:href|src)="(\/(?!\/)[^"]*)"/g

beforeAll(async () => {
	// The build empties only a folder in the docs app, so a failed run can leave
	// files here.
	await rm(target.buildDir, { recursive: true, force: true })

	await promisify(execFile)('pnpm', ['run', 'docs:build'], {
		cwd: PACKAGE_DIR,
		env: {
			...process.env,
			// The build sets `NODE_ENV` only when it has no value, and the prerender
			// runs only in production. The value of the run is `test`.
			NODE_ENV: 'production',
			DOCS_BASE: target.base,
			DOCS_BUILD_DIR: target.buildDir,
		},
		maxBuffer: 64 * 1024 * 1024,
	})
}, 600_000)

afterAll(() => rm(target.buildDir, { recursive: true, force: true }))

describe('the docs build with a base', () => {
	it('puts each file in the folder of the base', () => {
		expect(readdirSync(target.clientDir)).toEqual(['docs'])
	})

	it('writes each page in each locale', () => {
		for (const locale of LOCALES) {
			expect(existsSync(path.join(baseDir, 'button', localeFile('index.html', locale)))).toBe(true)
		}
	})

	it('writes the fallback document in each locale', () => {
		for (const locale of LOCALES) {
			expect(existsSync(path.join(baseDir, localeFile('__spa-fallback.html', locale)))).toBe(true)
		}
	})

	it('puts the chunks in the assets folder of the base', () => {
		expect(globSync('assets/*.js', { cwd: baseDir }).length).toBeGreaterThan(100)
	})

	it('gives each path of the site in each HTML file the base', () => {
		const files = globSync('**/*.html', { cwd: baseDir })

		const outside = files.flatMap((file) =>
			[...readFileSync(path.join(baseDir, file), 'utf8').matchAll(SITE_PATH)]
				.map(([, value = '']) => value)
				.filter((value) => !value.startsWith(BASE))
				.map((value) => `${file}: ${value}`),
		)

		expect(files.length).toBeGreaterThan(100)

		expect([...new Set(outside)]).toEqual([])
	})

	it('links each page with the base', () => {
		const html = readFileSync(path.join(baseDir, 'button', 'index.html'), 'utf8')

		expect(html).toContain(`href="${BASE}menu"`)
	})
})
