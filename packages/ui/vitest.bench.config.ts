import { defineConfig } from 'vitest/config'
import { splitSequencer } from './src/__tests__/setup/split-sequencer.ts'
import { env } from './vitest.base.ts'

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		// The pinned zone of `vitest.shared.mts`.
		env,
		setupFiles: ['./src/__benchmarks__/setup.ts'],
		// A mount bench of the largest kanban board or query tree reaches the
		// default heap limit of a worker before the garbage of its earlier
		// samples is gone. Vitest 4 ran it just under that limit, and Vitest 5
		// takes a little more.
		execArgv: ['--max-old-space-size=4096'],
		// CI runs the suite in two shards. The two files of the editing benches hold
		// a large part of its time, so they go to different shards, and the
		// sequencer deals the other files in the order of their paths.
		sequence: {
			sequencer: splitSequencer([], ['grid-editing-session.bench.tsx', 'grid-editing.bench.tsx']),
		},
		benchmark: {
			// The browser-mode suite (vitest.bench.browser.config.ts) needs real
			// layout and scroll geometry, so it can't run under jsdom.
			exclude: ['**/node_modules/**', 'src/__benchmarks__/browser/**'],
		},
	},
})
