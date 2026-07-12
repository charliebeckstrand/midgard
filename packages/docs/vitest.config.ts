import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		// The canary suite builds a real ts.Program over packages/ui; give it
		// room without loosening the fixture suites' failure signal too far.
		testTimeout: 10_000,
	},
})
