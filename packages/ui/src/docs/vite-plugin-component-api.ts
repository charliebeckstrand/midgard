import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import type { ComponentApi } from './parse-props'
import { buildResolutionContext, parsePublicExports, parseSource } from './parse-props'

const VIRTUAL_ID = 'virtual:component-api'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

/** Recursively collect files matching an extension regex. */
function collectFiles(dir: string, ext: RegExp, recursive: boolean): string[] {
	if (!fs.existsSync(dir)) return []

	const result: string[] = []

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)

		if (entry.isFile() && ext.test(entry.name)) {
			result.push(full)
		} else if (entry.isDirectory() && recursive) {
			result.push(...collectFiles(full, ext, true))
		}
	}

	return result
}

function generate(srcDir: string): Record<string, ComponentApi[]> {
	const ts = /\.tsx?$/
	const tsOnly = /\.ts$/

	const files = [
		...collectFiles(path.join(srcDir, 'components'), ts, true),
		...collectFiles(path.join(srcDir, 'layouts'), ts, false),
		...collectFiles(path.join(srcDir, 'pages'), ts, false),
		...collectFiles(path.join(srcDir, 'primitives'), ts, false),
		...collectFiles(path.join(srcDir, 'recipes'), tsOnly, true),
	]

	const cvaFile = path.join(srcDir, 'core', 'color-cva.ts')

	if (fs.existsSync(cvaFile)) files.push(cvaFile)

	// Group component sources by directory name
	const componentsDir = path.join(srcDir, 'components')
	const byDir: Record<string, string[]> = {}
	const allSources: string[] = []

	for (const file of files) {
		const source = fs.readFileSync(file, 'utf-8')

		allSources.push(source)

		if (file.startsWith(componentsDir + path.sep)) {
			const rel = path.relative(componentsDir, file)
			const dir = rel.split(path.sep)[0]

			if (dir) {
				if (!byDir[dir]) byDir[dir] = []
				byDir[dir].push(source)
			}
		}
	}

	const ctx = buildResolutionContext(allSources)

	// Read barrel files for public export filtering
	const indexByDir: Record<string, string> = {}

	for (const dir of Object.keys(byDir)) {
		const indexFile = path.join(componentsDir, dir, 'index.ts')

		if (fs.existsSync(indexFile)) {
			indexByDir[dir] = fs.readFileSync(indexFile, 'utf-8')
		}
	}

	// Parse each component directory
	const result: Record<string, ComponentApi[]> = {}

	for (const [dir, sources] of Object.entries(byDir)) {
		const combined = sources.join('\n')
		const parsed = parseSource(combined, ctx)
		const parsedByName = new Map(parsed.map((api) => [api.name, api]))

		const indexSource = indexByDir[dir]
		const publicNames = indexSource
			? parsePublicExports(indexSource)
			: parsed.map((api) => api.name)

		const entries: ComponentApi[] = []

		for (const name of publicNames) {
			entries.push(parsedByName.get(name) ?? { name, props: [] })
		}

		if (entries.length > 0) result[dir] = entries
	}

	return result
}

/**
 * Vite plugin that pre-computes component API reference data at build time.
 *
 * Exposes a `virtual:component-api` module containing the parsed prop
 * definitions for every component — small enough to include in the main
 * bundle, eliminating the runtime source-loading + parsing cost.
 */
export function componentApiPlugin(): Plugin {
	let srcDir: string
	let cachedJson: string | null = null

	return {
		name: 'component-api-data',

		configResolved(config) {
			srcDir = path.resolve(config.root, '..')
		},

		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_ID
		},

		load(id) {
			if (id === RESOLVED_ID) {
				cachedJson ??= JSON.stringify(generate(srcDir))
				return `export default ${cachedJson}`
			}
		},

		handleHotUpdate({ file, server }) {
			if (!file.startsWith(srcDir) || !/\.tsx?$/.test(file)) return
			if (file.includes(`${path.sep}docs${path.sep}`)) return

			cachedJson = null

			const mod = server.moduleGraph.getModuleById(RESOLVED_ID)

			if (mod) {
				server.moduleGraph.invalidateModule(mod)
				return [mod]
			}
		},
	}
}
