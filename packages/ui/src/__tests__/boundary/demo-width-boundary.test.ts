// @vitest-environment node
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// The docs frame gives each child of an example one instance box (`Example`).
// The box sets the width of the component, so an example sets no width on the
// component that it shows. A width in an example makes the same component show
// at two widths on one page, which is the defect that the box removes.
//
// A width that is not on the component that the example shows stays. This list
// is the one record of each such width, and a change to it shows in the diff of
// the commit that makes it:
//
//   - The layout in a module page: an error state, a template picker, and the
//     alerts of a board.
//   - A frame that an example draws to hold the component: the box of `Flex`.
//   - The `w-max` content of a `ScrollArea`, which overflows.
//   - The cap of the `Overflow` example of `Tabs`, which makes the tab list
//     overflow at each width of the frame.

const WIDTHS: Record<string, readonly string[]> = {
	'docs/pages/components/scroll-area/horizontal-with-extent.tsx': ['w-max'],
	'docs/pages/components/scroll-area/playground.tsx': ['w-max'],
	'docs/pages/components/tabs/overflow.tsx': ['max-w-sm'],
	'docs/pages/modules/dashboard/build-and-save.tsx': ['w-56', 'w-full'],
	'docs/pages/modules/dashboard/query.tsx': ['w-full'],
	'docs/pages/modules/grid/state/error.tsx': ['w-full'],
	'docs/pages/structure/flex/wrap.tsx': ['w-64'],
}

// The examples of the docs app.
const PAGES = join(srcDir, 'docs', 'pages')

// A width utility, with or without a variant, such as `w-48` or `sm:max-w-sm`.
const WIDTH = /(?<![\w-])(?:min-w|max-w|w)-[\w[\]./()%,-]+/g

// The `full` prop of `Flex` and `Stack`, which gives `w-full`.
const FULL = /<(?:Flex|Stack)\b[^>]*\sfull\b/g

describe('demo width boundary', () => {
	it('sets no width on the component that an example shows', () => {
		const found: Record<string, string[]> = {}

		walkSource(PAGES, (file, content) => {
			if (!isSourceFile(file)) return

			const source = stripSourceComments(content)

			const widths = [
				...(source.match(WIDTH) ?? []),
				...(source.match(FULL) ?? []).map(() => 'full'),
			].sort()

			if (widths.length > 0) found[srcRelative(file)] = widths
		})

		expect(found).toEqual(WIDTHS)
	})
})
