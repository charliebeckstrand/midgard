import { describe, expect, it } from 'vitest'
import {
	docsSites,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// Exit-inert boundary.
//
// `AnimatePresence` keeps an exiting child in the DOM until its exit animation
// ends, with the props of its last render. A roving container outside the child
// can then move focus to a row in it. The row unmounts at the end of the exit,
// and focus falls to the body. The fix has one home,
// `primitives/mount/use-mount-exit-inert.ts`. The exiting element gives its
// value to `inert`, and `useA11yRoving` skips each item under an `inert`
// ancestor.
//
// A scan of the source cannot tell which exiting child holds the items of a
// roving container outside it. So the gate makes each site decide:
//
//   1. Each file that renders `AnimatePresence` calls the home, or is on EXEMPT
//      with the reason that no roving container reaches into its exiting child.
//      A new site therefore cannot skip the decision by accident.
//
//   2. No file but the home reads `useIsPresent`. Then an exit has one mark, and
//      no component keeps its own copy, such as a `data-exiting` attribute.
//
// The gate does not prove that the call sits in the exiting element. The browser
// tests `tree-exit-focus.test.tsx` and `json-tree-exit-focus.test.tsx` prove that
// for the two trees.

/** The one file that owns the rule. */
const HOME = 'primitives/mount/use-mount-exit-inert.ts'

/** Files that render `AnimatePresence` without the home, each with the reason. */
const EXEMPT: Record<string, string> = {
	'components/accordion/accordion-panel.tsx':
		'the roving of the accordion reaches only its triggers, which are outside the panel',
	'components/collapse/collapse-panel.tsx':
		'the panel holds consumer content, and no roving container in ui spans the trigger and the panel',
	'components/toast/toast.tsx': 'no roving container reaches the toasts',
	'modules/chart/engine/chart-marks/layer.tsx':
		'the exiting generation holds SVG marks and value labels, which take no focus',
	'primitives/portal/portal.tsx':
		'the floating panel or the overlay inside the portal owns its exit, and Overlay makes its node inert while it closes',
}

/** A render of `AnimatePresence`. */
const RENDERS_PRESENCE = /<AnimatePresence\b/

/** A call of the home. */
const CALLS_HOME = /\buseMountExitInert\(/

/** A read of the presence of an exit. */
const READS_PRESENCE = /\buseIsPresent\b/

/** Each shipped source file outside the home, keyed, with its code and no comments. */
function sourceFiles(): Map<string, string> {
	const files = new Map<string, string>()

	walkSource(
		srcDir,
		(path, source) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(path)) return

			const key = srcRelative(path)

			if (key === HOME) return

			// Prose that names a call is not a use of it.
			files.set(key, stripSourceComments(source))
		},
		docsSites,
	)

	return files
}

describe('exit-inert boundary', () => {
	const files = sourceFiles()

	const sites = [...files].filter(([, code]) => RENDERS_PRESENCE.test(code))

	it('makes each exiting child inert through the home, or states why not', () => {
		const violations = sites
			.filter(([key, code]) => !CALLS_HOME.test(code) && !(key in EXEMPT))
			.map(([key]) => key)

		expect(
			violations,
			`files that render \`AnimatePresence\` without the exit-inert rule (give \`inert={useMountExitInert()}\` to the exiting element, or list the file in EXEMPT with the reason that no roving container reaches into its exiting child):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('reads the presence of an exit only in the home', () => {
		const violations = [...files]
			.filter(([, code]) => READS_PRESENCE.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that read \`useIsPresent\` (call \`useMountExitInert\` from \`${HOME}\`):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('lists only files that still need an entry', () => {
		const exempt = new Set(sites.filter(([, code]) => !CALLS_HOME.test(code)).map(([key]) => key))

		const stale = Object.keys(EXEMPT).filter((key) => !exempt.has(key))

		expect(stale, `entries that no longer apply:\n  ${stale.join('\n  ')}`).toEqual([])
	})

	it('finds the sites that call the home', () => {
		// A scan that finds no site proves nothing, so the two trees anchor it.
		const calls = sites.filter(([, code]) => CALLS_HOME.test(code)).map(([key]) => key)

		expect(calls).toEqual(
			expect.arrayContaining([
				'components/json-tree/json-tree-node.tsx',
				'components/tree/tree-item-children.tsx',
			]),
		)
	})
})
