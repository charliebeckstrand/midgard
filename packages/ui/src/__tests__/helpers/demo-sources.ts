import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** One demo source file: its path and its text. */
export type DemoSource = { file: string; source: string }

/** The `.tsx` files of a demo directory, and of each directory in it. */
function tsxFilesIn(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
		.map((entry) => join(entry.parentPath, entry.name))
}

/**
 * The demo sources of a barrel. `components/button` reads
 * `demos/components/button.tsx`, and `modules/grid` reads each file under
 * `demos/modules/grid/`. A few components have their page under `providers/`.
 *
 * @param demos - The `docs-legacy/demos` directory.
 * @param rel - The path of the barrel directory under `src`, such as `components/button`.
 */
export function demoSourcesOf(demos: string, rel: string): DemoSource[] {
	const name = rel.slice(rel.indexOf('/') + 1)

	const files = [join(demos, `${rel}.tsx`), join(demos, 'providers', `${name}.tsx`)].filter(
		existsSync,
	)

	const dir = join(demos, rel)

	if (existsSync(dir)) files.push(...tsxFilesIn(dir))

	return files.map((file) => ({ file, source: readFileSync(file, 'utf8') }))
}
