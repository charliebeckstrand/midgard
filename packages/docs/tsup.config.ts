import { defineConfig } from 'tsup'

// Only the Node-side build entry (`docs/vite`) ships as bundled JS. A consumer's
// `vite.docs.config.ts` is loaded by Node (Vite externalizes bare package
// imports when bundling a config), and Node can't resolve the engine's
// extension-less relative graph. Bundling inlines that graph into one file;
// `ts-morph`, `typescript`, and the Vite plugins stay external. The browser
// entries (`.`, `./app`) remain source — the consumer's Vite build bundles them.
export default defineConfig({
	// `plugins` is the pure engine (plugin + barrel parser) — ts-morph only, no
	// bundler-plugin deps, so it loads under Vitest. `vite` is the config helper
	// and pulls in `@tailwindcss/vite` and the React plugin.
	entry: { vite: 'src/vite/index.ts', plugins: 'src/plugins/index.ts' },
	format: ['esm'],
	target: 'node20',
	outDir: 'dist',
	clean: true,
	dts: false,
	sourcemap: true,
	splitting: false,
})
