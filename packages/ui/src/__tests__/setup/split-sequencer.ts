import { shuffle } from '@vitest/utils/helpers'
import { BaseSequencer, type TestSpecification } from 'vitest/node'

// The global setup `shard.ts` gives each test file the shard of the run. This
// module holds no declaration of the context, so a config can import it.

/** Orders two files by path, so that each shard sees the same order. */
function byPath(a: TestSpecification, b: TestSpecification): number {
	return a.moduleId < b.moduleId ? -1 : a.moduleId > b.moduleId ? 1 : 0
}

/**
 * Makes a sequencer for `--shard` that runs each file whose path ends in one
 * of `split` in each shard. Such a file holds more work than a shard can take
 * as a whole, so it reads the shard (`inject('shard')`) and does only its part.
 *
 * A file whose path ends in one of `dealt` goes to one shard. The sequencer
 * deals these files to the shards in turn, in the order of their paths. Use it
 * for a family of long files that Vitest would put in one shard. Vitest gives
 * a file to a shard by the hash of its path, so such files can land together.
 *
 * Vitest divides the other files between the shards, as it does with no
 * sequencer.
 *
 * A custom sequencer replaces the `RandomSequencer` that `sequence.shuffle`
 * selects. So with `shuffle`, this sequencer shuffles the files as that one
 * does, with the seed of the run.
 */
export function splitSequencer(
	split: readonly string[],
	dealt: readonly string[] = [],
): typeof BaseSequencer {
	const endsIn = (ends: readonly string[]) => (file: TestSpecification) =>
		ends.some((end) => file.moduleId.endsWith(end))

	const isSplit = endsIn(split)

	const isDealt = endsIn(dealt)

	return class SplitSequencer extends BaseSequencer {
		override async shard(files: TestSpecification[]): Promise<TestSpecification[]> {
			const { index, count } = this.ctx.config.shard ?? { index: 1, count: 1 }

			const mine = files
				.filter((file) => isDealt(file) && !isSplit(file))
				.toSorted(byPath)
				.filter((_, at) => at % count === index - 1)

			const whole = await super.shard(files.filter((file) => !isSplit(file) && !isDealt(file)))

			return [...files.filter(isSplit), ...mine, ...whole]
		}

		override async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
			const { shuffle: shuffled, seed } = this.ctx.config.sequence

			return shuffled ? shuffle(files, seed) : super.sort(files)
		}
	}
}
