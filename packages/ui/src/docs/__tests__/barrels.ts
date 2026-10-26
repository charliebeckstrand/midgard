import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { srcDir } from '../../__tests__/helpers/walk-source.ts'

/**
 * Each barrel in the folders `roots`, such as `components/button`. A barrel is
 * a folder `src/<root>/<name>` that holds an `index.ts`.
 */
export function barrels(roots: readonly string[]): string[] {
	return roots.flatMap((root) =>
		readdirSync(join(srcDir, root), { withFileTypes: true })
			.filter(
				(entry) => entry.isDirectory() && existsSync(join(srcDir, root, entry.name, 'index.ts')),
			)
			.map((entry) => `${root}/${entry.name}`),
	)
}
