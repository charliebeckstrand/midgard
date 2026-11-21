import { defineConfig } from 'vitest/config'
import { splitSequencer } from './src/__tests__/setup/split-sequencer.ts'
import { env } from './vitest.base.ts'

/** The file that asserts the bytes of each grid gesture, not the time. */
const CHURN = 'src/__benchmarks__/grid-churn.bench.tsx'

// A mount bench of the largest kanban board or query tree reaches the default
// heap limit of a worker before the garbage of its earlier samples is gone.
// Vitest 4 ran it just under that limit, and Vitest 5 takes a little more.
// `--expose-gc` gives `gc`, which the churn assertions of `grid-churn.bench.tsx`
// run before each measure.
const execArgv = ['--max-old-space-size=4096', '--expose-gc']

/** The options of the two projects. */
const project = {
	environment: 'jsdom' as const,
	globals: true,
	// The pinned zone of `vitest.shared.mts`.
	env,
	setupFiles: ['./src/__benchmarks__/setup.ts'],
}

export default defineConfig({
	test: {
		// CI runs the suite in two shards. The two files of the editing benches hold
		// a large part of its time, so they go to different shards, and the
		// sequencer deals the other files in the order of their paths.
		sequence: {
			sequencer: splitSequencer([], ['grid-editing-session.bench.tsx', 'grid-editing.bench.tsx']),
		},
		projects: [
			{
				test: {
					...project,
					name: 'bench',
					execArgv,
					benchmark: {
						// The browser-mode suite (vitest.bench.browser.config.ts) needs real
						// layout and scroll geometry, so it can't run under jsdom.
						exclude: ['**/node_modules/**', 'src/__benchmarks__/browser/**', CHURN],
					},
				},
			},
			{
				test: {
					...project,
					name: 'churn',
					// The optimizing tiers of V8 remove some allocations, but only after
					// a function becomes hot, and the time of that compile changes from
					// run to run. Without them, each gesture allocates the same bytes on
					// each run, so the churn budgets are exact.
					execArgv: [...execArgv, '--no-opt', '--no-maglev'],
					benchmark: { include: [CHURN] },
				},
			},
		],
	},
})
