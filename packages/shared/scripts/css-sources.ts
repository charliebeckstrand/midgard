/**
 * Writes `app/sources.css` of the app in the current directory. The file names
 * the sources of `shared` and `ui` that Tailwind scans for the CSS of the app.
 *
 * `next build` gets each file of `shared/src` and `ui/src` that the app imports,
 * and no other file. An app uses a part of `ui`, and the classes of the other
 * modules, such as Wysiwyg or Kanban, are then not in the CSS of each route.
 * `next dev` gets all of `shared/src` and `ui/src` (`--full`), so a new import
 * shows its classes with no new run. The `build` and the `dev` scripts of each
 * app run this script first. The file is not in git.
 *
 * The import graph comes from esbuild. The entries are each module of the app,
 * other than its tests and its configs. The graph follows each import of
 * `shared` and `ui`, the dynamic imports included, and each source module that
 * a `new URL(…, import.meta.url)` names, such as a worker. Each other package is
 * external, because its classes are not in the CSS of the app. A dynamic import
 * that the graph cannot follow stops the run, because its classes would be lost
 * in production only. `css-sources-boundary.test.ts` of ui compares the list with the graph.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, type Plugin } from 'esbuild'

const ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)))

/** The source trees that the CSS of an app takes classes from, other than its own. */
export const SOURCE_DIRS = ['packages/shared/src', 'packages/ui/src'].map((dir) => join(ROOT, dir))

/** The folders that never ship with an app: the tests, the benchmarks, and the ui docs. */
const FULL_SKIPPED = ['packages/shared/src/__tests__', 'packages/ui/src/__tests__']
	.concat(['packages/ui/src/__benchmarks__', 'packages/ui/src/docs'])
	.map((dir) => join(ROOT, dir))

/** The file that this script writes, from the folder of the app. */
export const SOURCES_FILE = join('app', 'sources.css')

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?)$/

const SKIPPED_FILE = /\.(?:test|spec|d)\.[cm]?tsx?$|\.config\.[cm]?ts$/

const SKIPPED_DIR = new Set(['__tests__', 'node_modules', '.next'])

/** A specifier of a package that the graph follows. */
const FOLLOWED = /^(?:shared|ui)(?:\/|$)/

/**
 * A dynamic import in the output whose path is not a literal, so esbuild did not
 * follow it: a variable, or a template with a substitution. esbuild follows a
 * relative template as a glob, and it writes a literal in place of a template
 * with no substitution.
 */
const UNFOLLOWED_IMPORT = /\b(?:import|require)\(\s*(?:(?!['"`])|`[^`]*\$\{)[^)]{0,80}/g

/** A `new URL('…', import.meta.url)` with a relative literal path. */
const URL_REFERENCE = /new URL\(\s*(['"`])(\.{1,2}\/[^'"`]+)\1\s*,\s*import\.meta\.url\s*\)/g

function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name)

		if (entry.isDirectory()) return SKIPPED_DIR.has(entry.name) ? [] : walk(path)

		return SOURCE_FILE.test(entry.name) && !SKIPPED_FILE.test(entry.name) ? [path] : []
	})
}

/** Each module of the app that Next compiles: each module but its tests and its configs. */
export function appEntries(appDir: string): string[] {
	return walk(appDir).sort()
}

const externalPackages: Plugin = {
	name: 'external-packages',
	setup(pluginBuild) {
		pluginBuild.onResolve({ filter: /^[^./]/ }, ({ path }) =>
			FOLLOWED.test(path) ? undefined : { path, external: true },
		)
	},
}

/** The source modules that each `new URL(…, import.meta.url)` of a module names. */
function urlReferences(file: string, text: string): string[] {
	return [...text.matchAll(URL_REFERENCE)]
		.map((match) => resolve(dirname(file), match[2] ?? ''))
		.filter((target) => SOURCE_FILE.test(target) && existsSync(target))
}

/**
 * Each file of `shared/src` and `ui/src` that the app at `appDir` reaches, as an
 * absolute path, in order.
 *
 * @throws When esbuild cannot follow an import, such as a dynamic import with no
 * literal path.
 */
export async function graphSources(appDir: string): Promise<string[]> {
	const entries = new Set(appEntries(appDir))

	const reached = new Set<string>()

	for (let size = 0; entries.size !== size; ) {
		size = entries.size

		const result = await build({
			absWorkingDir: appDir,
			bundle: true,
			entryPoints: [...entries],
			format: 'esm',
			jsx: 'automatic',
			loader: { '.css': 'empty', '.json': 'empty' },
			logLevel: 'silent',
			metafile: true,
			outdir: 'out',
			platform: 'neutral',
			plugins: [externalPackages],
			splitting: true,
			write: false,
		})

		const unfollowed = result.outputFiles.flatMap((output) =>
			[...output.text.matchAll(UNFOLLOWED_IMPORT)].map((match) => match[0]),
		)

		if (unfollowed.length > 0) {
			throw new Error(
				`The import graph is not complete. esbuild cannot follow:\n${unfollowed.join('\n')}`,
			)
		}

		for (const input of Object.keys(result.metafile.inputs)) {
			const file = resolve(appDir, input)

			reached.add(file)

			for (const target of urlReferences(file, readFileSync(file, 'utf8'))) entries.add(target)
		}
	}

	return [...reached].filter((file) => SOURCE_DIRS.some((dir) => file.startsWith(dir + sep))).sort()
}

function sourceLine(from: string, path: string, negated = false): string {
	return `@source ${negated ? 'not ' : ''}'${relative(from, path).split(sep).join('/')}';`
}

/** The text of `app/sources.css`: the full scan, or each file of the graph. */
export function sourcesText(appDir: string, files: string[] | 'full'): string {
	const from = dirname(join(appDir, SOURCES_FILE))

	const lines =
		files === 'full'
			? [
					...SOURCE_DIRS.map((dir) => sourceLine(from, dir)),
					...FULL_SKIPPED.map((dir) => sourceLine(from, dir, true)),
				]
			: files.map((file) => sourceLine(from, file))

	const kind =
		files === 'full' ? 'all of `shared/src` and `ui/src`' : 'the files that the app imports'

	return `/* Written by \`shared/scripts/css-sources.ts\`: ${kind}. Not in git. */\n${lines.join('\n')}\n`
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const appDir = process.cwd()

	const files = process.argv.includes('--full') ? 'full' : await graphSources(appDir)

	writeFileSync(join(appDir, SOURCES_FILE), sourcesText(appDir, files))
}
