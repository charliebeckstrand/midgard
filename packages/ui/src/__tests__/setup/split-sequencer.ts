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
 * The sequencer deals each other file to one shard, in turn, in the order of
 * the paths. Vitest gives a file to a shard by the hash of its path, so the
 * work of a shard depends on chance. A family of long files, such as the page
 * smoke files of the docs, could land in one shard. In the order of the paths,
 * the files of a family are next to each other, so they go to the shards in
 * turn. Thus the shards take about the same time.
 *
 * A new file moves the files after it to the other shard. Each shard keeps a
 * module cache of its own on CI. The shards import most of the same modules,
 * so a moved file misses only its own entries.
 *
 * A custom sequencer replaces the `RandomSequencer` that `sequence.shuffle`
 * selects. So with `shuffle`, this sequencer shuffles the files as that one
 * does, with the seed of the run.
 */
export function splitSequencer(split: readonly string[]): typeof BaseSequencer {
	const isSplit = (file: TestSpecification) => split.some((end) => file.moduleId.endsWith(end))

	return class SplitSequencer extends BaseSequencer {
		override async shard(files: TestSpecification[]): Promise<TestSpecification[]> {
			const { index, count } = this.ctx.config.shard ?? { index: 1, count: 1 }

			const mine = files
				.filter((file) => !isSplit(file))
				.toSorted(byPath)
				.filter((_, at) => at % count === index - 1)

			return [...files.filter(isSplit), ...mine]
		}

		override async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
			const { shuffle: shuffled, seed } = this.ctx.config.sequence

			return shuffled ? shuffle(files, seed) : super.sort(files)
		}
	}
}
