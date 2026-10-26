import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Project } from 'typescript/unstable/sync'
import type { TypeScriptServer } from './ts-server'
import { srcDir, uiRoot } from './walk-source'

/** The folders of `src/<layer>` that hold a barrel (`index.ts`), by name, in order. */
export function units(layer: string): string[] {
	return readdirSync(join(srcDir, layer), { withFileTypes: true })
		.filter(
			(entry) => entry.isDirectory() && existsSync(join(srcDir, layer, entry.name, 'index.ts')),
		)
		.map((entry) => entry.name)
		.sort()
}

/** Each barrel of the layers `layers`, such as `components/button`. */
export function barrels(layers: readonly string[]): string[] {
	return layers.flatMap((layer) => units(layer).map((name) => `${layer}/${name}`))
}

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
