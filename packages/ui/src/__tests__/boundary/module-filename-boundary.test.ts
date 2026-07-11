import { readdirSync } from 'node:fs'
import { basename, join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkFolder, listLeafFolders, type Violation } from '../helpers/filename-rules'
import { srcDir } from '../helpers/walk-source'

// Enforces the file-naming convention documented in CLAUDE.md → "File naming"
// for the modules tree. Module folders follow the component grammar — files
// prefixed with their leaf folder's name — plus the engine layout.
//
// A module's `engine/` directory is its pure functional core, laid out
// d3-style (see the module ROADMAP's "Engine" section), and carries its own
// naming contract:
//
//   - files directly under `engine/` are named for the module — `<module>-*`
//     or `use-<module>-*` — as if the folder were the module itself
//   - a multi-kind concept becomes a `<module>-<concept>/` directory whose
//     files take short kind names (`allocate.ts`, `csv.ts`): the directory
//     supplies the context, so the folder-prefix and symbol-match rules do
//     not apply inside one (files stay kebab-case)
//   - engine concept directories never nest further and never carry an
//     `index.ts(x)` barrel — the engine is imported file-by-file

const modulesDir = join(srcDir, 'modules')

const KEBAB_FILE = /^[a-z0-9]+(-[a-z0-9]+)*\.tsx?$/

type EnginePosition = { module: string; conceptDir: string | null; depth: number }

// Locates a folder inside a `modules/<module>/engine/` subtree: depth 0 is
// `engine/` itself, depth 1 a concept directory. Null outside any engine.
function enginePosition(folderPath: string): EnginePosition | null {
	const rel = relative(modulesDir, folderPath)

	if (rel === '' || rel.startsWith('..')) return null

	const [moduleName, engineSegment, conceptSegment] = rel.split(sep)

	if (!moduleName || engineSegment !== 'engine') return null

	return {
		module: moduleName,
		conceptDir: conceptSegment ?? null,
		depth: rel.split(sep).length - 2,
	}
}

function checkEngineConceptFolder(folderPath: string, engine: EnginePosition): Violation[] {
	const violations: Violation[] = []

	if (engine.depth > 1) {
		violations.push({
			path: relative(modulesDir, folderPath),
			reason: 'engine concept directories must not nest further',
		})

		return violations
	}

	if (!engine.conceptDir?.startsWith(`${engine.module}-`)) {
		violations.push({
			path: relative(modulesDir, folderPath),
			reason: `engine concept directory must be named \`${engine.module}-<concept>\``,
		})

		return violations
	}

	for (const entry of readdirSync(folderPath, { withFileTypes: true })) {
		if (!entry.isFile()) continue

		const file = entry.name

		if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue

		if (file.endsWith('.d.ts')) continue

		const path = relative(modulesDir, join(folderPath, file))

		if (file === 'index.ts' || file === 'index.tsx') {
			violations.push({ path, reason: 'engine concept directories carry no `index` barrel' })

			continue
		}

		if (!KEBAB_FILE.test(file)) {
			violations.push({ path, reason: 'engine concept files must be kebab-case `.ts(x)`' })
		}
	}

	return violations
}

function checkModuleFolder(folderPath: string): Violation[] {
	const engine = enginePosition(folderPath)

	if (engine && engine.depth > 0) {
		return checkEngineConceptFolder(folderPath, engine)
	}

	// Files directly under `engine/` are named for the module, not the folder.
	const folderName = engine ? engine.module : basename(folderPath)

	return checkFolder(folderPath, folderName, modulesDir)
}

describe('module filename boundary', () => {
	const folders = listLeafFolders(modulesDir)

	const violations = folders.flatMap(checkModuleFolder)

	it('every module file matches the filename convention', () => {
		expect(
			violations,
			`filename violation(s) in packages/ui/src/modules — see CLAUDE.md → "File naming":\n${violations
				.map((v) => `  ${v.path}\n    ${v.reason}`)
				.join('\n')}`,
		).toEqual([])
	})
})
