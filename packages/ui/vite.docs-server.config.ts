import type { UserConfig } from 'vite'

// The server of the docs build (`scripts/docs-server.ts`) as one JavaScript
// file, with each module that it imports. The image of the docs service runs
// the file with Node, with no `node_modules` and no `tsx` (`Dockerfile.docs`).
export default {
	build: {
		ssr: 'scripts/docs-server.ts',
		outDir: 'src/docs/dist/docs-server',
		target: 'node24',
		rolldownOptions: {
			output: { entryFileNames: 'docs-server.js' },
			// The barrels of ui hold `'use client'` modules. The server uses none of them.
			checks: { moduleLevelDirective: false },
		},
	},
	ssr: { noExternal: true },
} satisfies UserConfig
