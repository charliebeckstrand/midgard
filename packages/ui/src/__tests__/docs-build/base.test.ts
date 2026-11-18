import { execFile } from 'node:child_process'
import { existsSync, globSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type DocsTarget, docsTarget } from '../../docs/plugin/target.ts'

// The docs build can be for a path of a site other than the root, such as
// `/docs/` (`src/docs/plugin/target.ts`). This file builds the docs again with
// that base, in a folder of its own, and reads the files. The other files of
// the suite test the build with no base, which `docs:build` writes.

const BASE = '/docs/'

/** The folder of the package. */
const PACKAGE_DIR = path.resolve(import.meta.dirname, '..', '..', '..')

let target: DocsTarget

/** The folder of the base in the client folder, where each file of the build goes. */
let baseDir: string

// The value of each `href` and `src` attribute that starts with one slash: a
// path of the site, not a URL of another host.
const SITE_PATH = /\s(?:href|src)="(\/(?!\/)[^"]*)"/g

beforeAll(async () => {
	// The folder is in the package, where the server build finds its packages.
	const cache = path.join(PACKAGE_DIR, 'node_modules', '.cache')

	await mkdir(cache, { recursive: true })

	const env = {
		...process.env,
		// The build sets `NODE_ENV` only when it has no value, and the prerender
		// runs only in production. The value of the run is `test`.
		NODE_ENV: 'production',
		DOCS_BASE: BASE,
		DOCS_BUILD_DIRECTORY: await mkdtemp(path.join(cache, 'docs-base-')),
	}

	target = docsTarget(env)

	baseDir = path.join(target.clientDir, target.base)

	await promisify(execFile)('pnpm', ['run', 'docs:build'], {
		cwd: PACKAGE_DIR,
		env,
		maxBuffer: 64 * 1024 * 1024,
	})
}, 600_000)

afterAll(() => target && rm(target.buildDirectory, { recursive: true, force: true }))

describe('the docs build with a base', () => {
	it('puts each file in the folder of the base', () => {
		expect(readdirSync(target.clientDir)).toEqual(['docs'])
	})

	it('writes each page in each locale', () => {
		expect(existsSync(path.join(baseDir, 'button', 'index.html'))).toBe(true)

		expect(existsSync(path.join(baseDir, 'button', 'index.es.html'))).toBe(true)
	})

	it('writes the fallback document in each locale', () => {
		expect(existsSync(path.join(baseDir, '__spa-fallback.html'))).toBe(true)

		expect(existsSync(path.join(baseDir, '__spa-fallback.es.html'))).toBe(true)
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
