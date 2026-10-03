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
// The box sets the width of the component, so a demo sets no width on the
// component that it shows. A width in a demo makes the same component show at
// two widths on one page, which is the defect that the box removes.
//
// A width that is not on the component that the example shows stays. This list
// is the one record of each such width, and a change to it shows in the diff of
// the commit that makes it:
//
//   - The layout in a module demo: an editor in a grid cell, an error state, a
//     template picker, and the alerts of a board.
//   - A frame that a demo draws to hold the component: the mock page of
//     `Sidebar` and of `Drawer`, and the boxes of `Flex` and `Stack`.
//   - The expiry and CVV fields of `CreditCardInput`, which share their row.
//   - A link in the static `Drawer`, which fills its row.
//   - The `Block` example of `Alert`, which shows the `w-full` override.
//   - The cap of a `ScrollArea`, which makes its content overflow, and the
//     `w-max` content that overflows.
//   - The fit of the mini `Sidebar` at `lg`, which is a prop of the demo.

const WIDTHS: Record<string, readonly string[]> = {
	'docs/demos/components/alert.tsx': ['w-full'],
	'docs/demos/components/credit-card-input.tsx': ['w-full', 'w-full'],
	'docs/demos/components/drawer.tsx': ['w-60', 'w-full'],
	'docs/demos/components/scroll-area.tsx': ['max-w-96', 'max-w-96', 'max-w-96', 'w-max', 'w-max'],
	'docs/demos/components/sidebar.tsx': ['w-72', 'w-fit'],
	'docs/demos/modules/dashboard/index.tsx': ['w-56', 'w-full', 'w-full'],
	'docs/demos/modules/grid/editable.tsx': ['w-full', 'w-full', 'w-full'],
	'docs/demos/modules/grid/index.tsx': ['w-full'],
	'docs/demos/structure/flex.tsx': ['w-64', 'w-64'],
	'docs/demos/structure/stack.tsx': ['w-64'],
}

// A width utility, with or without a variant, such as `w-48` or `sm:max-w-sm`.
const WIDTH = /(?<![\w-])(?:min-w|max-w|w)-[\w[\]./()%,-]+/g

// The `full` prop of `Flex` and `Stack`, which gives `w-full`.
const FULL = /<(?:Flex|Stack)\b[^>]*\sfull\b/g

describe('demo width boundary', () => {
	it('sets no width on the component that an example shows', () => {
		const found: Record<string, string[]> = {}

		walkSource(join(srcDir, 'docs', 'demos'), (file, content) => {
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
