import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'tsup'

/**
 * Discover build entries from the filesystem. Each component / provider dir
 * that has an `index.ts` becomes a named entry; plus hooks and layouts.
 */
function discoverEntries(root: string, prefix = '') {
	return Object.fromEntries(
		readdirSync(root)
			.filter((name) => {
				const indexPath = join(root, name, 'index.ts')

				try {
					return statSync(indexPath).isFile()
				} catch {
					return false
				}
			})
			.map((name) => [`${prefix}${name}`, `${root}/${name}/index.ts`]),
	)
}

const componentEntries = discoverEntries('src/components')

const providerEntries = discoverEntries('src/providers', 'providers/')

const entry = {
	hooks: 'src/hooks/index.ts',
	layouts: 'src/layouts/index.ts',
	...componentEntries,
	...providerEntries,
}

// No 'use client' banner: a blanket banner stamps the directive onto every
// output module and would mark the static (server-renderable) components as
// client the day dist ships. Consumers import source (the exports map points
// at ./src), where per-file directives are authoritative; dist is a build
// artifact, not the consumption surface.
export default defineConfig({
	entry,
	format: ['esm'],
	target: 'es2022',
	outDir: 'dist',
	clean: true,
	dts: false,
	sourcemap: true,
	splitting: true,
})
