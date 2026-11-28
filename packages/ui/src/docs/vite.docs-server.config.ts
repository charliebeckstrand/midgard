import path from 'node:path'
import type { UserConfig } from 'vite'

// The server of the docs build (`scripts/docs/server.ts`) as one JavaScript
// file, with each module that it imports. The image of the docs service runs
// the file with Node, with no `node_modules` and no `tsx` (`Dockerfile.docs`).
// A config of its own, not a mode of `vite.config.ts`: `react-router build`
// loads that config, and its plugins build the app, not a Node server.
export default {
	build: {
		ssr: path.join(import.meta.dirname, '..', '..', 'scripts', 'docs', 'server.ts'),
		outDir: path.join(import.meta.dirname, '..', '..', 'dist', 'docs-server'),
		target: 'node26',
		rolldownOptions: {
			output: { entryFileNames: 'docs-server.js' },
			// The server runs no client code. A `'use client'` module in its graph
			// stops the build, so an import that reaches a client module, such as
			// a barrel of ui, cannot enter the server.
			onLog(level, log, handler) {
				if (log.code === 'MODULE_LEVEL_DIRECTIVE') throw new Error(log.message)

				handler(level, log)
			},
		},
	},
	ssr: { noExternal: true },
} satisfies UserConfig
