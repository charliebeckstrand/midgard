// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// A `'use no memo'` directive keeps the React Compiler off one function. The
// compiler reports such a function only when it also breaks a rule, so the skip
// ledger (`compiler/react-compiler-skips.json`) does not show each one. This list
// does. Each function states its reason in its TSDoc, and a change to the list
// shows in the diff of the commit that makes it. `useVirtualWindow` is in the
// ledger too: it writes to the virtualizer during render.
//
//   - `useVirtualWindow`: the virtualizer keeps one identity, and its reads are
//     live, so a compiled read of the window goes stale.
//   - `useGridEditSourceSync` and `useGridIndexSync`: each writes refs during
//     render, which the grid cells read in the same pass.

const OPT_OUTS = {
	'hooks/use-virtual-window.ts': 1,
	'modules/grid/use-grid-data-cursor.ts': 2,
}

const OPT_OUT = /(['"])use no memo\1/g

describe('React Compiler opt-outs', () => {
	it('only the listed functions keep the compiler off', () => {
		const found: Record<string, number> = {}

		walkSource(srcDir, (file, content) => {
			if (!isSourceFile(file)) return

			const count = stripSourceComments(content).match(OPT_OUT)?.length ?? 0

			if (count > 0) found[srcRelative(file)] = count
		})

		expect(found).toEqual(OPT_OUTS)
	})
})
