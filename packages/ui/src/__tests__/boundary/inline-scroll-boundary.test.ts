import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, workspaceRoot, workspaceSources } from '../helpers/walk-source'

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
//   3. No file reads or writes a scroll edge attribute: `data-overflow-start`
//      or `data-overflow-end` on the inline axis, `data-overflow-above` or
//      `data-overflow-below` on the block axis. A script stamps such an
//      attribute after the first paint, so a style that keys off it arrives
//      late, and the reader sees it appear. A block scroller takes
//      `fade.block`, which draws its fade in CSS as the rail does.

/** The one file that owns the rule. */
const HOME = 'recipes/kiso/omote/rail.ts'

/** The trees to scan: the ui source and the source of each app. */
const SCAN_ROOTS = [srcDir, join(workspaceRoot, 'apps')]

/** A class or a style that scrolls on the inline axis alone. */
const INLINE_SCROLL = /\boverflow-x-(?:auto|scroll)\b|\boverflowX:\s*['"](?:auto|scroll)['"]/

/** A read of the edge fade. */
const READS_FADE = /\bfade\.inline\b|\{[^}]*\binline\b[^}]*\}\s*=\s*fade\b/

/** A scroll edge attribute, as an attribute or as a Tailwind variant. */
const EDGE_ATTRIBUTE = /\bdata-overflow-(?:start|end|above|below)\b/

describe('inline-scroll boundary', () => {
	const files = workspaceSources(SCAN_ROOTS)

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

	it('keys no style off a script-stamped scroll edge', () => {
		const violations = [...files]
			.filter(([, code]) => EDGE_ATTRIBUTE.test(code))
			.map(([key]) => key)

		expect(
			violations,
			`files that read or write a \`data-overflow-*\` scroll edge attribute (\`omote.rail\` and \`fade.block\` draw the edge fade in CSS, with no attribute):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
