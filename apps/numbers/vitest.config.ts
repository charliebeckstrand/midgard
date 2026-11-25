import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

/**
 * The test harness of the app. The tests of the rules of the game touch no DOM,
 * so the environment is node. A test of a hook or a component sets the jsdom
 * environment in its file.
 */
export default defineConfig({
	// The `@/` paths of the tsconfig, which `proxy.ts` and the pages use.
	resolve: { tsconfigPaths: true },
	test: {
		...sharedTest,
		environment: 'node',
		setupFiles: ['src/__tests__/setup.ts'],
	},
})
