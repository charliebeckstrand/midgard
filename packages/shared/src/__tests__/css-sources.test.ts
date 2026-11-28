import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
	appEntries,
	graphSources,
	SOURCE_DIRS,
	SOURCES_FILE,
	sourcesText,
} from '../../scripts/sources/css'

// `scripts/sources/css.ts` writes the Tailwind sources of `shared` and
// `ui` for each app: each file of the import graph of the app, from esbuild. A
// file that the list does not have loses its classes in production only,
// because `next dev` scans all of `ui/src`. This test walks the graph again
// with no bundler: it reads each import of each module and resolves it as Node
// does. The list in `app/sources.css` must hold the same files as that walk.
// The test reads the apps and `ui/src`, so they are inputs of the test tasks of
// this package (`turbo.json`).

const APPS_DIR = fileURLToPath(new URL('../../../../apps', import.meta.url))

const APPS = readdirSync(APPS_DIR).filter((name) =>
	existsSync(join(APPS_DIR, name, 'package.json')),
)

/** A comment, which can hold an example import. */
const COMMENT = /\/\*[\s\S]*?\*\/|(?<![:'"`\\])\/\/.*$/gm

/** A static import or re-export of values, with its specifier. A type-only one is erased. */
const STATIC_IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[^'"`;]*?\bfrom\s*)?(['"])([^'"]+)\1/gm

/** A dynamic import with a literal path: a string, or a template with no substitution. */
const DYNAMIC_IMPORT = /\bimport\(\s*(['"`])([^'"`$]+)\1\s*\)/g

/** A source module that a worker or an asset URL names. */
const URL_REFERENCE =
	/new URL\(\s*(['"])(\.{1,2}\/[^'"]+\.[cm]?[jt]sx?)\1\s*,\s*import\.meta\.url\s*\)/g

const FOLLOWED = /^(?:shared|ui)(?:\/|$)/

const SOURCE_FILE = /\.[cm]?[jt]sx?$/

const RELATIVE_CANDIDATES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']

function specifiers(text: string): string[] {
	const code = text.replace(COMMENT, '')

	return [STATIC_IMPORT, DYNAMIC_IMPORT, URL_REFERENCE].flatMap((pattern) =>
		[...code.matchAll(pattern)].map((match) => match[2] ?? ''),
	)
}

/** The file that an import of `from` names, or `undefined` for a package that the graph does not follow. */
function resolveImport(from: string, specifier: string): string | undefined {
	if (specifier.startsWith('.')) {
		const base = resolve(dirname(from), specifier)

		const file = RELATIVE_CANDIDATES.map((suffix) => base + suffix).find(
			(candidate) => SOURCE_FILE.test(candidate) && existsSync(candidate),
		)

		if (file === undefined && SOURCE_FILE.test(base)) throw new Error(`${from}: ${specifier}`)

		return file
	}

	return FOLLOWED.test(specifier) ? createRequire(from).resolve(specifier) : undefined
}

/** Each file of `shared/src` and `ui/src` that a walk from the entries of the app reaches. */
function walkGraph(appDir: string): string[] {
	const seen = new Set<string>()

	const queue = appEntries(appDir)

	for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
		if (seen.has(file)) continue

		seen.add(file)

		for (const specifier of specifiers(readFileSync(file, 'utf8'))) {
			const target = resolveImport(file, specifier)

			if (target !== undefined && !seen.has(target)) queue.push(target)
		}
	}

	return [...seen].filter((file) => SOURCE_DIRS.some((dir) => file.startsWith(dir + sep))).sort()
}

/** The files that the text of `app/sources.css` names, as absolute paths. */
function listedFiles(appDir: string, text: string): string[] {
	const from = dirname(join(appDir, SOURCES_FILE))

	return [...text.matchAll(/^@source '([^']+)';$/gm)].map((match) => resolve(from, match[1] ?? ''))
}

// The graph and the walk of each app run at collection, which has no budget
// (CONVENTIONS.md §10.14). esbuild and the walk read some thousand files.
const lists = await Promise.all(
	APPS.map(async (app) => {
		const appDir = join(APPS_DIR, app)

		const text = sourcesText(appDir, await graphSources(appDir))

		return [app, listedFiles(appDir, text), walkGraph(appDir)] as const
	}),
)

describe('css sources of each app', () => {
	it.each(lists)(
		'%s lists each module of shared and ui that it imports',
		(_app, listed, walked) => {
			expect(listed).toEqual(walked)
		},
	)

	it.each([
		['a path in a variable', 'export const load = (name: string) => import(name)\n', 'import(name'],
		[
			'a template with a substitution',
			`export const load = (name: string) => import(\`ui/modules/\${name}\`)\n`,
			`import(\`ui/modules/\${name}\``,
		],
	])(
		'stops on a dynamic import with %s, which the graph cannot follow',
		async (_case, text, call) => {
			const appDir = mkdtempSync(join(tmpdir(), 'css-sources-'))

			try {
				writeFileSync(join(appDir, 'page.ts'), text)

				await expect(graphSources(appDir)).rejects.toThrow(call)
			} finally {
				rmSync(appDir, { recursive: true })
			}
		},
	)
})
