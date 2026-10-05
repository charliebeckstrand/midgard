import { existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// Inline-scroll boundary.
//
// A box that scrolls on the inline axis hides content past its edge. Each such
// box in `ui` shows the same overflow indicator: the edge with more content
// behind it fades. The rule has one home, the `rail` in
// `recipes/kiso/omote/rail.ts`. The rail sets the scroll and the fade. The
// fade is CSS only: scroll-driven animations draw it, so the first paint shows
// it, and no script stamps the state of an edge.
//
// Before, three scrollers wired the fade by hand and nine had none. Three rules
// keep the one source of truth:
//
//   1. No file but the home writes `overflow-x-auto` or `overflow-x-scroll`.
//      A box that scrolls on both axes, such as the Grid, keeps `overflow-auto`
//      and is not a rail, because its pinned columns sit at the edges.
//
//   2. No file but the home reads `fade.inline`.
//
//   3. No file reads or writes `data-overflow-start` or `data-overflow-end`.
//      A script stamps such an attribute after the first paint, so a style
//      that keys off it arrives late, and the reader sees it appear.

/** The one file that owns the rule. */
const HOME = 'recipes/kiso/omote/rail.ts'

/** The workspace root, so the scan reaches the apps too. */
const workspaceRoot = join(srcDir, '..', '..', '..')

/** The trees to scan: the ui source and the source of each app. */
const SCAN_ROOTS = [srcDir, join(workspaceRoot, 'apps')].filter((root) => existsSync(root))

/** A class or a style that scrolls on the inline axis alone. */
const INLINE_SCROLL = /\boverflow-x-(?:auto|scroll)\b|\boverflowX:\s*['"](?:auto|scroll)['"]/

/** A read of the edge fade. */
const READS_FADE = /\bfade\.inline\b|\{[^}]*\binline\b[^}]*\}\s*=\s*fade\b/

/** An inline edge attribute, as an attribute or as a Tailwind variant. */
const INLINE_EDGE_ATTRIBUTE = /\bdata-overflow-(?:start|end)\b/

/** The key of a file: relative to `src/` in ui, to the workspace root elsewhere. */
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

			if (key.startsWith('docs/dist/')) return

			// Prose that names a class is not a use of it.
			files.set(key, stripSourceComments(source))
		})
	}

	return files
}

describe('inline-scroll boundary', () => {
	const files = sourceFiles()

	it('scrolls on the inline axis only through the rail', () => {
		const violations = [...files]
			.filter(([key, code]) => key !== HOME && INLINE_SCROLL.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that scroll on the inline axis outside the rail (spread \`rail\` from \`omote\` in the kata):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('reads the edge fade only in the rail', () => {
		const violations = [...files]
			.filter(([key, code]) => key !== HOME && READS_FADE.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that read \`fade.inline\` outside the rail (read \`omote.rail\`):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('keys no style off a script-stamped inline edge', () => {
		const violations = [...files]
			.filter(([, code]) => INLINE_EDGE_ATTRIBUTE.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that read or write \`data-overflow-start\` or \`data-overflow-end\` (the rail draws the edge fade in CSS, with no attribute):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
