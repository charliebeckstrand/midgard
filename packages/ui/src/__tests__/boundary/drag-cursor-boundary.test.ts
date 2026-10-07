import { existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// Drag-cursor boundary.
//
// During a drag, the cursor must stay the drag cursor when the pointer crosses an
// element that sets its own cursor: a link, a field, a sibling handle. The
// element under the pointer decides the cursor, and pointer capture does not
// repair this in each browser. The rule has one home, `hooks/use-drag-cursor.ts`.
// It injects one universal `!important` rule for the span of the drag.
//
// Before, four drags called the rule and the others each kept a local fix or
// none. Two rules keep the one source of truth:
//
//   1. Each file that starts a drag calls the rule: `useDragCursor`,
//      `useDragCursorHold`, `holdDragCursor`, or `useSortableList`, which calls
//      it for each sortable list. A file on DELEGATED starts the drag, and the
//      reason names the file that holds the cursor for it.
//
//   2. No file but the home writes a cursor rule for the page or sets a cursor
//      from script. A cursor that is not a drag cursor comes from a class, which
//      can read a data attribute that script sets.

/** The one file that owns the rule. */
const HOME = 'hooks/use-drag-cursor.ts'

/** The workspace root, so the scan reaches the apps too. */
const workspaceRoot = join(srcDir, '..', '..', '..')

/** The trees to scan: the ui source and the source of each app. */
const SCAN_ROOTS = [srcDir, join(workspaceRoot, 'apps')].filter((root) => existsSync(root))

/**
 * What starts a drag: a pointer capture, a pointer listener that tracks moves
 * past the element, a dnd-kit context, or the sensors that arm one.
 */
const DRAG_START =
	/\.setPointerCapture\??\.?\(|addEventListener\(\s*['"]pointermove['"]|<DndContext\b|\buseSortableSensors\(/

/** A call of the rule, directly or through the sortable list that calls it. */
const CALLS_RULE = /\b(?:useDragCursor|useDragCursorHold|holdDragCursor|useSortableList)\(/

/** A cursor that script sets: an inline style write, or an injected `!important` rule. */
const SCRIPTED_CURSOR = /\.style\.cursor\s*=|cursor:[^;'"`]*!important/

/** Files that start a drag and leave the cursor to another file, each with the reason. */
const DELEGATED: Record<string, string> = {
	'hooks/use-sortable-sensors.ts': 'defines the sensors; each caller holds the cursor',
	'modules/dashboard/use-dashboard-drag.ts':
		'arms the sensors; dashboard.tsx holds the cursor from the drag gesture in the store',
	'hooks/use-hover-across-scroll.ts':
		'tracks the hover through a scroll; no press is held, so no drag starts',
}

/** The key of a file in the list above: relative to `src/` in ui, to the workspace root elsewhere. */
function keyOf(path: string): string {
	if (path.startsWith(srcDir + sep)) return srcRelative(path)

	return relative(workspaceRoot, path).split(sep).join('/')
}

/** Each source file outside the tests and the docs build output, keyed, with its code and no comments. */
function sourceFiles(): Map<string, string> {
	const files = new Map<string, string>()

	for (const root of SCAN_ROOTS) {
		walkSource(root, (path, source) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(path)) return

			const key = keyOf(path)

			if (key.startsWith('docs/dist/') || key === HOME) return

			// Prose that names a call is not a use of it.
			files.set(key, stripSourceComments(source))
		})
	}

	return files
}

describe('drag-cursor boundary', () => {
	const files = sourceFiles()

	const starts = [...files].filter(([, code]) => DRAG_START.test(code))

	it('holds the drag cursor through the rule for each drag', () => {
		const violations = starts
			.filter(([key, code]) => !CALLS_RULE.test(code) && !(key in DELEGATED))
			.map(([key]) => key)

		expect(
			violations,
			`files that start a drag without the drag-cursor rule (call \`useDragCursor\`, \`useDragCursorHold\`, or \`holdDragCursor\` from \`hooks/use-drag-cursor\`, or list the file in DELEGATED with the file that holds the cursor for it):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('sets a cursor from script only in the rule', () => {
		const violations = [...files]
			.filter(([, code]) => SCRIPTED_CURSOR.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that set a cursor from script (hold a drag cursor through \`useDragCursor\`, or set a data attribute and give it the cursor in the kata):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('lists only files that still need an entry', () => {
		const delegated = new Set(
			starts.filter(([, code]) => !CALLS_RULE.test(code)).map(([key]) => key),
		)

		const stale = Object.keys(DELEGATED).filter((key) => !delegated.has(key))

		expect(stale, `entries that no longer apply:\n  ${stale.join('\n  ')}`).toEqual([])
	})
})
