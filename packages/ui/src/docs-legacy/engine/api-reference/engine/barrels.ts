import fs from 'node:fs'
import path from 'node:path'

// The barrels list reads the file system only. The docs plugin reads it in the
// main process of Vite and of Vitest, so this module must not import ts-morph.

/**
 * The documented roots and the key prefix each barrel takes. Components key by
 * bare directory name. Modules and structure units namespace their key as
 * `<root>-<name>` to match the demo id (`pathToId('demos/modules/<name>')`).
 */
export const DOCUMENTED_ROOTS = [
	['components', ''],
	['modules', 'modules-'],
	['structure', 'structure-'],
] as const

/** One documentable barrel: its result key and the `index.ts` that exports it. */
export type Barrel = { key: string; indexPath: string }

/**
 * List every documentable barrel under `<srcDir>/components`,
 * `<srcDir>/modules`, and `<srcDir>/structure` in a stable order, keyed to match the demo ids. Missing
 * roots and directories without an `index.ts` are skipped.
 */
export function listBarrels(srcDir: string): Barrel[] {
	const barrels: Barrel[] = []

	for (const [root, prefix] of DOCUMENTED_ROOTS) {
		const rootDir = path.join(srcDir, root)

		if (!fs.existsSync(rootDir)) continue

		for (const dir of fs.readdirSync(rootDir, { withFileTypes: true })) {
			if (!dir.isDirectory()) continue

			const indexPath = path.join(rootDir, dir.name, 'index.ts')

			if (fs.existsSync(indexPath)) barrels.push({ key: `${prefix}${dir.name}`, indexPath })
		}
	}

	return barrels
}
