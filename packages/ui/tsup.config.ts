import { globSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'tsup'

/**
 * The build entries of the folders in `root` that have an `index.ts`, each by
 * the name of its folder after `prefix`. Each component, provider, module, and
 * structure unit is an entry, and so are the hooks and the layouts.
 */
function discoverEntries(root: string, prefix = '') {
	return Object.fromEntries(
		globSync(`${root}/*/index.ts`).map((file) => [
			`${prefix}${path.basename(path.dirname(file))}`,
			file,
		]),
	)
}

const componentEntries = discoverEntries('src/components')

const providerEntries = discoverEntries('src/providers', 'providers/')

const moduleEntries = discoverEntries('src/modules', 'modules/')

const structureEntries = discoverEntries('src/structure', 'structure/')

const entry = {
	hooks: 'src/hooks/index.ts',
	layouts: 'src/layouts/index.ts',
	...componentEntries,
	...providerEntries,
	...moduleEntries,
	...structureEntries,
}

// No 'use client' banner: a blanket banner stamps the directive onto every
// output module and would mark the static (server-renderable) components as
// client the day dist ships. Consumers import source (the exports map points
// at ./src), where per-file directives are authoritative; dist is a build
// artifact, not the consumption surface. For the same reason, the script is
// `build:dist` and not `build`: the turbo `build` graph skips it.
export default defineConfig({
	entry,
	format: ['esm'],
	target: 'es2023',
	outDir: 'dist',
	clean: true,
	dts: false,
	sourcemap: true,
	splitting: true,
})
