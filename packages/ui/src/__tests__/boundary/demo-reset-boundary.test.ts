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

// The docs kit gives the button that resets an example (`ResetButton` and
// `resetButtonProps` in `docs/kit/reset-button.tsx`). The kit is the one source
// of the look and the label of that button, so an example writes no "Reset"
// label of its own. A label of its own lets the look of one reset button drift
// from the look of the others.
//
// A "Reset" that is not a reset button of an example stays. This list is the
// one record of each such label:
//
//   - The "Reset" item of the zoom menu in the `Keep open` example of `Menu`.

const LABELS: Record<string, number> = {
	'docs/pages/components/menu/keep-open.tsx': 1,
}

// The examples of the docs app.
const PAGES = join(srcDir, 'docs', 'pages')

// A "Reset" label: JSX text, or a string literal such as a `children` value.
const LABEL = />\s*Reset\s*<|(['"`])Reset\1/g

describe('demo reset boundary', () => {
	it('gets each reset button of an example from the docs kit', () => {
		const found: Record<string, number> = {}

		walkSource(PAGES, (file, content) => {
			if (!isSourceFile(file)) return

			const count = stripSourceComments(content).match(LABEL)?.length ?? 0

			if (count > 0) found[srcRelative(file)] = count
		})

		expect(found).toEqual(LABELS)
	})
})
