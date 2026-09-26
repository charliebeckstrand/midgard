import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// Logical-arrow boundary.
//
// A horizontal arrow key that steps through the reading order swaps in a
// right-to-left layout. The rule has one home, `hooks/a11y/logical-arrow.ts`.
// `useA11yRoving` applies it for each of its users. Before, only the grid read
// the direction, and every other handler kept `ArrowRight` as "next".
//
// So each file that spells `ArrowLeft` or `ArrowRight` in code either imports
// the rule, or is on the list below with the reason its axis is physical. A new
// handler therefore cannot bypass the rule by accident.

/** The one file that owns the rule. */
const HOME = 'hooks/a11y/logical-arrow.ts'

/** Files whose horizontal arrows stay physical, each with the reason. */
const PHYSICAL: Record<string, string> = {
	'utilities/keyboard-navigation.ts':
		'index math only; useA11yRoving hands it the key after the rule has run',
	'components/date-picker/date-picker-content.tsx':
		'lists the navigation keys to take focus back; interprets none',
	'components/slider/range/use-range-keyboard.ts':
		'the track is placed with `left: %` and does not mirror',
	'components/color/color-slider.tsx': 'the track is placed with `left: %` and does not mirror',
	'components/color/color-area.tsx': 'the saturation axis is physical and does not mirror',
	'components/resizable/resizable-handle.tsx':
		'the panels are placed physically; ArrowRight moves the handle right',
	'hooks/use-panel-resize.ts': 'the panel docks to a physical side',
	'modules/chart/engine/use-chart-keyboard.ts': 'the chart axes do not mirror',
	'modules/chart/engine/chart-legend/range-legend.tsx':
		'the scale bar is placed with `left: %` and does not mirror',
	'modules/map/engine/map-keyboard/cursor.ts': 'ArrowRight moves the map cursor east',
	'modules/dashboard/use-dashboard-drag.ts':
		'moves in pixels; the drag turns pixels into columns with `inlineSign`',
	'modules/dashboard/dashboard-resize-handle.tsx':
		'moves the edge on screen; the resize applies `inlineSign`',
}

/** A horizontal arrow spelled as a string or as an object key. */
const HORIZONTAL_ARROW = /(['"`]Arrow(?:Left|Right)['"`]|^\s*Arrow(?:Left|Right)\s*:)/m

const IMPORTS_RULE = /from '(?:\.\.?\/)+(?:hooks\/)?a11y\/logical-arrow'|from '\.\/logical-arrow'/

/** Every source file that spells a horizontal arrow in code, and whether it imports the rule. */
function arrowFiles(): Map<string, boolean> {
	const files = new Map<string, boolean>()

	walkSource(srcDir, (path, source) => {
		if (!/\.(?:tsx?|mts|cts)$/.test(path)) return

		const rel = srcRelative(path)

		if (rel.startsWith('__tests__/') || rel.startsWith('docs/') || rel === HOME) return

		// Prose that names the key is not a use of it.
		if (HORIZONTAL_ARROW.test(stripSourceComments(source)))
			files.set(rel, IMPORTS_RULE.test(source))
	})

	return files
}

describe('logical-arrow boundary', () => {
	it('routes every reading-order arrow through the rule', () => {
		const violations = [...arrowFiles()]
			.filter(([rel, imports]) => !imports && !(rel in PHYSICAL))
			.map(([rel]) => rel)

		expect(
			violations,
			`files reading ArrowLeft/ArrowRight without \`logicalArrowKey\` (import it from \`hooks/a11y/logical-arrow\`, or list the file in PHYSICAL with the reason its axis does not mirror):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('lists only files that still read a physical arrow', () => {
		const files = arrowFiles()

		const stale = Object.keys(PHYSICAL).filter((rel) => files.get(rel) !== false)

		expect(stale, `PHYSICAL entries that no longer apply:\n  ${stale.join('\n  ')}`).toEqual([])
	})
})
