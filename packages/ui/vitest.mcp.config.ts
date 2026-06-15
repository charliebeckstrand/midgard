import { defineConfig } from 'vitest/config'
import { docsPlugin } from './src/docs/plugins'
import { baseTest, setupFiles, testIsolation } from './vitest.base.config'

// Project for MCP-server-backing harnesses under src/__tests__/mcp. The default
// project (vitest.config.ts) excludes that directory, so these never surface in
// `test`, `test:a11y`, or CI; the owning MCP server runs them through this
// config. Mirrors the default project's jsdom env + setup so a harness renders
// components exactly as the real gates do.
export default defineConfig({
	plugins: [docsPlugin({ vitest: true })],
	test: {
		...baseTest,
		...testIsolation,
		setupFiles,
		include: ['src/__tests__/mcp/**/*.test.{ts,tsx}'],
	},
})
