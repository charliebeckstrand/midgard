import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Project } from 'typescript/unstable/sync'
import type { TypeScriptServer } from './ts-server'
import { uiRoot } from './walk-source'

/**
 * The barrels of the public surface: each `index.ts` that the `exports` map of
 * `package.json` names. A `*` in a target stands for each directory that holds
 * an `index.ts`.
 */
export function publicBarrels(): string[] {
	const pkg = JSON.parse(readFileSync(join(uiRoot, 'package.json'), 'utf8')) as {
		exports: Record<string, string | { default: string }>
	}

	const barrels = new Set<string>()

	for (const target of Object.values(pkg.exports)) {
		const path = typeof target === 'string' ? target : target.default

		if (!path.endsWith('/index.ts')) continue

		const [head, tail] = path.split('*')

		if (head === undefined) continue

		if (tail === undefined) {
			barrels.add(join(uiRoot, head))

			continue
		}

		for (const entry of readdirSync(join(uiRoot, head), { withFileTypes: true })) {
			const barrel = join(uiRoot, head, entry.name, tail)

			if (entry.isDirectory() && existsSync(barrel)) barrels.add(barrel)
		}
	}

	return [...barrels].sort()
}

/**
 * Opens a checker over the public barrels and each file that they import,
 * which is the shipped tree. The project extends the package config.
 *
 * @param server - The server of the calling test file.
 * @param files - More files for the project, such as the kata modules.
 */
export function openPublicProject(
	server: TypeScriptServer,
	files: readonly string[] = [],
): Project {
	return server.open(
		[...files, ...publicBarrels()],
		{ incremental: false, types: [] },
		'./tsconfig.json',
	)
}
