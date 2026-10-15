import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { API, type Project } from 'typescript/unstable/sync'
import { srcDir } from './walk-source'

/** The directory of the `ui` package, which holds `package.json`. */
export const uiRoot = join(srcDir, '..')

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

/** A checker over the public surface, and the call that stops its server. */
export type PublicProject = { project: Project; close: () => void }

/**
 * Opens a TypeScript 7 checker over the public barrels and each file that they
 * import, which is the shipped tree. The project file is not on disk: the API
 * reads its text through the `fs` callback.
 *
 * @param name - The name of the project file, unique to the test that opens it.
 */
export function openPublicProject(name: string): PublicProject {
	const projectConfig = join(uiRoot, `tsconfig.${name}.json`)

	const config = JSON.stringify({
		extends: './tsconfig.json',
		compilerOptions: { incremental: false, types: [] },
		files: publicBarrels(),
		include: [],
	})

	const api = new API({
		cwd: uiRoot,
		fs: { readFile: (file) => (file === projectConfig ? config : undefined) },
	})

	const project = api.updateSnapshot({ openProjects: [projectConfig] }).getProject(projectConfig)

	if (!project) {
		api.close()

		throw new Error(`the checker did not open ${projectConfig}`)
	}

	return { project, close: () => api.close() }
}
