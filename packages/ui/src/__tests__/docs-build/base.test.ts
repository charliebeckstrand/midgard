import { execFile } from 'node:child_process'
import { existsSync, globSync, readdirSync, readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// The docs build can be for a path of a site other than the root, such as
// `/docs/` (`src/docs/plugin/base.ts`). This file builds the docs again with
// that base, next to the build that the suite serves, and reads the files.
// The other files of the suite test the build with no base.

const BASE = '/docs/'

/** The folder of the package. */
const PACKAGE_DIR = path.resolve(import.meta.dirname, '..', '..', '..')

/** The folder of the build with the base, relative to the folder of the docs app. */
const BUILD_DIRECTORY = path.join('dist', 'based')

const BUILD_DIR = path.join(PACKAGE_DIR, 'src', 'docs', BUILD_DIRECTORY)

const CLIENT_DIR = path.join(BUILD_DIR, 'client')

/** The folder of the base in the client folder, where each file of the build goes. */
const BASE_DIR = path.join(CLIENT_DIR, BASE)

// The value of each `href` and `src` attribute that starts with one slash: a
// path of the site, not a URL of another host.
const SITE_PATH = /\s(?:href|src)="(\/(?!\/)[^"]*)"/g

beforeAll(async () => {
	// The build sets `NODE_ENV` only when it has no value, and the prerender
	// runs only in production. The value of the run is `test`.
	await promisify(execFile)('pnpm', ['run', 'docs:build'], {
		cwd: PACKAGE_DIR,
		env: {
			...process.env,
			NODE_ENV: 'production',
			DOCS_BASE: BASE,
			DOCS_BUILD_DIRECTORY: BUILD_DIRECTORY,
		},
		maxBuffer: 64 * 1024 * 1024,
	})
}, 600_000)

afterAll(() => rm(BUILD_DIR, { recursive: true, force: true }))

describe('the docs build with a base', () => {
	it('puts each file in the folder of the base', () => {
		expect(readdirSync(CLIENT_DIR)).toEqual(['docs'])
	})

	it('writes each page in each locale', () => {
		expect(existsSync(path.join(BASE_DIR, 'button', 'index.html'))).toBe(true)

		expect(existsSync(path.join(BASE_DIR, 'button', 'index.es.html'))).toBe(true)
	})

	it('writes the fallback document in each locale', () => {
		expect(existsSync(path.join(BASE_DIR, '__spa-fallback.html'))).toBe(true)

		expect(existsSync(path.join(BASE_DIR, '__spa-fallback.es.html'))).toBe(true)
	})

	it('puts the chunks in the assets folder of the base', () => {
		expect(globSync('assets/*.js', { cwd: BASE_DIR }).length).toBeGreaterThan(100)
	})

	it('gives each path of the site in each HTML file the base', () => {
		const files = globSync('**/*.html', { cwd: BASE_DIR })

		const outside = files.flatMap((file) =>
			[...readFileSync(path.join(BASE_DIR, file), 'utf8').matchAll(SITE_PATH)]
				.map(([, value = '']) => value)
				.filter((value) => !value.startsWith(BASE))
				.map((value) => `${file}: ${value}`),
		)

		expect(files.length).toBeGreaterThan(100)

		expect([...new Set(outside)]).toEqual([])
	})

	it('links each page with the base', () => {
		const html = readFileSync(path.join(BASE_DIR, 'button', 'index.html'), 'utf8')

		expect(html).toContain(`href="${BASE}menu"`)
	})
})
