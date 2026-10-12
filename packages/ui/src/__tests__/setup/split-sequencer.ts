import { shuffle } from '@vitest/utils/helpers'
import { BaseSequencer, type TestSpecification } from 'vitest/node'

// The global setup `shard.ts` gives each test file the shard of the run. This
// module holds no declaration of the context, so a config can import it.

/**
 * Makes a sequencer for `--shard` that runs each file whose path ends in one
 * of `split` in each shard. Such a file holds more work than a shard can take
 * as a whole, so it reads the shard (`inject('shard')`) and does only its part.
 * Vitest divides the other files between the shards, as it does with no
 * sequencer.
 *
 * A custom sequencer replaces the `RandomSequencer` that `sequence.shuffle`
 * selects. So with `shuffle`, this sequencer shuffles the files as that one
 * does, with the seed of the run.
 */
export function splitSequencer(split: readonly string[]): typeof BaseSequencer {
	const isSplit = (file: TestSpecification) => split.some((end) => file.moduleId.endsWith(end))

	return class SplitSequencer extends BaseSequencer {
		override async shard(files: TestSpecification[]): Promise<TestSpecification[]> {
			const whole = await super.shard(files.filter((file) => !isSplit(file)))

			return [...files.filter(isSplit), ...whole]
		}

		override async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
			const { shuffle: shuffled, seed } = this.ctx.config.sequence

			return shuffled ? shuffle(files, seed) : super.sort(files)
		}
	}
}
