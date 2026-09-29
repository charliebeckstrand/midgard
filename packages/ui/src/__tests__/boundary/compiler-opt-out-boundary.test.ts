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
// skip gate (`compiler/react-compiler-skips.test.ts`) does not report such a
// function, so this list is the one record of each opt-out. Each function
// states its reason in its TSDoc, and a change to the list shows in the diff of
// the commit that makes it.
//
//   - `useWindowVirtualizer`: the virtualizer keeps one identity, and its reads
//     are live, so a compiled read of the window goes stale. It gives each
//     render its window as plain values, so `useVirtualWindow` compiles. The
//     opt-out is permanent, because the compiler marks react-virtual as
//     incompatible.
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
