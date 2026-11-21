import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runtimePathsTo } from '../helpers/import-graph'
import { srcDir, srcRelative } from '../helpers/walk-source'

// The events load the recorder, the sources, the store, and the two views only
// through an `import()`, while the events run or a view opens. A bundler keeps
// each static import, so one runtime import of such a file from the barrel or
// from `server/root-marks.ts` loads it on each page of each app. This test walks
// the static module graph of the two entries (CONVENTIONS.md §9.4).

const events = join(srcDir, 'modules', 'events')

const ENTRIES = [join(events, 'index.ts'), join(srcDir, 'server', 'root-marks.ts')]

/** Whether `file` loads only through an `import()`. */
function isLazy(file: string): boolean {
	const rel = srcRelative(file)

	return (
		/^modules\/events\/engine\/(events-recorder|events-store)\.ts$/.test(rel) ||
		rel.startsWith('modules/events/engine/events-sources/') ||
		/^modules\/events\/(events-sheet|events-panel)\.tsx$/.test(rel)
	)
}

describe('events lazy boundary', () => {
	for (const entry of ENTRIES) {
		it(`${srcRelative(entry)} reaches no lazy part of the events`, () => {
			const paths = runtimePathsTo(entry, isLazy)

			expect(
				paths,
				`A lazy part of the events loads only through an \`import()\`:\n  ${paths.join('\n  ')}`,
			).toEqual([])
		})
	}

	it('detects a static import of a lazy part', () => {
		// The control: the recorder imports the store and the sources statically.
		expect(runtimePathsTo(join(events, 'engine', 'events-recorder.ts'), isLazy)).not.toEqual([])
	})
})
