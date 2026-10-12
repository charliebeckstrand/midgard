import type { TestProject } from 'vitest/node'

declare module 'vitest' {
	interface ProvidedContext {
		/** The shard of the run, from `--shard`. A run with no `--shard` is the shard `1/1`. */
		shard: { index: number; count: number }
	}
}

/**
 * A global setup that gives the tests the shard of the run as `shard`. A file
 * that the sequencer of `split-sequencer.ts` runs in each shard reads it with
 * `inject('shard')`.
 */
export function setup(project: TestProject): void {
	project.provide('shard', project.vitest.config.shard ?? { index: 1, count: 1 })
}
