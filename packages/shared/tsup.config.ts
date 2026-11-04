import { defineConfig } from 'tsup'

// The server of a Next app in its image (`src/server/serve-next.ts`) as one
// file, with each module that it imports but `next`. The image runs the file
// with Node beside the `server.js` of the standalone output, whose
// `node_modules` holds `next` (`Dockerfile`).
export default defineConfig({
	entry: { 'serve-next': 'src/server/main.ts' },
	format: ['esm'],
	platform: 'node',
	target: 'node24',
	outDir: 'dist',
	clean: true,
	sourcemap: false,
	splitting: false,
	external: [/^next(?:\/|$)/],
	noExternal: [/^ui(?:\/|$)/],
})
