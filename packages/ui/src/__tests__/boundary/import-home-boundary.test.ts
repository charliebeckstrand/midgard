import { existsSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// Import a name from the file that declares it (CONVENTIONS §9.3). The shared
// folders hold many unrelated files, so each file is its own home. Their
// barrels are for the apps: `core` is `ui/core` and `hooks` is `ui/hooks`.
// Inside `ui`, an import of such a barrel ties internal wiring to the public
// surface, and it hides the real edge from the import-graph gates.
//
// `recipes/` keeps the rules of `recipes/README.md`: a kata and a kumi read the
// recipe engine and the density scale through their barrels, so the scan
// skips it.

const SHARED = ['core', 'hooks', 'types', 'utilities']

const NO_BARREL = ['types', 'utilities']

const SKIP = new Set(['recipes'])

const SPECIFIER = /(?:^|\n)\s*(?:import|export)\s[^'"]*?\sfrom\s+'(\.[^']+)'/g

function barrelDir(from: string, specifier: string): string | undefined {
	const target = resolve(dirname(from), specifier)

	if (!existsSync(target) || !statSync(target).isDirectory()) return undefined

	return existsSync(join(target, 'index.ts')) ? target : undefined
}

function isShared(dir: string): boolean {
	const rel = srcRelative(dir)

	return SHARED.some((root) => rel === root || rel.startsWith(`${root}/`))
}

describe('import home boundary', () => {
	it('no file in ui imports the barrel of a shared folder', () => {
		const violations: string[] = []

		walkSource(
			srcDir,
			(file, content) => {
				if (!isSourceFile(file)) return

				for (const match of stripSourceComments(content).matchAll(SPECIFIER)) {
					const specifier = match[1] as string

					const dir = barrelDir(file, specifier)

					if (dir && isShared(dir)) violations.push(`${srcRelative(file)} → ${specifier}`)
				}
			},
			SKIP,
		)

		expect(
			violations,
			`import each name from the file that declares it:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it.each(NO_BARREL)('%s has no barrel', (folder) => {
		expect(existsSync(join(srcDir, folder, 'index.ts'))).toBe(false)
	})
})
