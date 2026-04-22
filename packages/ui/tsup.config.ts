import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'tsup'

/**
 * Discover build entries from the filesystem. Each component dir that has an
 * `index.ts` becomes a named entry; plus the package root, hooks, and layouts.
 */
const componentsDir = 'src/components'

const componentEntries = Object.fromEntries(
	readdirSync(componentsDir)
		.filter((name) => {
			const indexPath = join(componentsDir, name, 'index.ts')

			try {
				return statSync(indexPath).isFile()
			} catch {
				return false
			}
		})
		.map((name) => [name, `${componentsDir}/${name}/index.ts`]),
)

const entry = {
	index: 'src/index.ts',
	hooks: 'src/hooks/index.ts',
	layouts: 'src/layouts/index.ts',
	...componentEntries,
}

export default defineConfig({
	entry,
	format: ['esm'],
	target: 'es2022',
	outDir: 'dist',
	clean: true,
	dts: false,
	sourcemap: true,
	splitting: true,
	banner: { js: "'use client'" },
})
