import { defineConfig } from 'vitest/config'
import { sharedTest } from '../../vitest.shared.mts'

export default defineConfig({
	test: { ...sharedTest, setupFiles: ['src/__tests__/setup.ts'] },
})
