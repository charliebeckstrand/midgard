// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { valuesByStep } from '../../core/density/steps'
import {
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// A ramp is the one place that writes a value for each density step, and a
// size scale (`defineScale`) reads its steps from the ramps. Three rules hold
// that design:
//
//   - Each ramp has three or five values. The utility writes no rule for a list
//     of another length, so such a list fails with no sign.
//   - A ramp lives in `recipes/kiso/ramp/`. A kata, a skeleton dimension, or a
//     component imports the ramp and writes no list of its own.
//   - No file outside the density core picks or clamps steps by hand. A `size`
//     prop takes `ScaleStep<typeof scale>`, and a JS reader snaps its step
//     through `useStep`.
//
// The backlog maps below hold the files of today, with the count of each
// pattern in each file. A new list or a new hand step fails the gate, and so
// does a count that a change makes too high. The rollout of the size scales
// lowers each count to zero.
//
// The scan reads the code of the `ui` package with the comments removed. It
// leaves out the density core, which defines the steps, and the docs site,
// which is a consumer of the package.

/** The code of each source file of the package, with the comments removed. */
const sources: { file: string; code: string }[] = []

walkSource(srcDir, (file, content) => {
	const path = srcRelative(file)

	if (!isSourceFile(file) || path.startsWith('docs/') || path.startsWith('core/density/')) return

	sources.push({ file: path, code: stripSourceComments(content) })
})

/** The count of the matches of `pattern` in each file, for the files with a match. */
function countsOf(pattern: RegExp, files = sources): Record<string, number> {
	return Object.fromEntries(
		files
			.map(({ file, code }) => [file, code.match(pattern)?.length ?? 0] as const)
			.filter(([, count]) => count > 0)
			.sort(([a], [b]) => a.localeCompare(b)),
	)
}

/** A stepped utility with its list, such as `density-p-[2,3,4]`. */
const RAMP = /\bdensity-[a-z]+(?:-[a-z]+)*-\[([^\]\s'"`]*)\]/g

/** The home of the ramps. */
const RAMP_HOME = 'recipes/kiso/ramp/'

/** The files outside the home of the ramps that write a ramp today, with the count of each. */
const RAMP_BACKLOG: Record<string, number> = {
	'layouts/sidebar/variants.ts': 6,
	'recipes/kata/alert.ts': 2,
	'recipes/kata/avatar.ts': 1,
	'recipes/kata/badge.ts': 5,
	'recipes/kata/button.ts': 6,
	'recipes/kata/calendar.ts': 4,
	'recipes/kata/card.ts': 5,
	'recipes/kata/checkbox.ts': 2,
	'recipes/kata/color-panel.ts': 4,
	'recipes/kata/color-picker.ts': 1,
	'recipes/kata/dashboard.ts': 1,
	'recipes/kata/date-picker.ts': 3,
	'recipes/kata/description-list.ts': 7,
	'recipes/kata/grid.ts': 3,
	'recipes/kata/heading.ts': 6,
	'recipes/kata/kbd.ts': 3,
	'recipes/kata/list.ts': 3,
	'recipes/kata/loading.ts': 7,
	'recipes/kata/menu.ts': 4,
	'recipes/kata/nav.ts': 2,
	'recipes/kata/option.ts': 4,
	'recipes/kata/popover.ts': 1,
	'recipes/kata/progress.ts': 1,
	'recipes/kata/query-chips.ts': 5,
	'recipes/kata/radio.ts': 1,
	'recipes/kata/sidebar.ts': 5,
	'recipes/kata/slider-range.ts': 2,
	'recipes/kata/slider.ts': 1,
	'recipes/kata/switch.ts': 2,
	'recipes/kata/table.ts': 2,
	'recipes/kata/tabs.ts': 4,
	'recipes/kata/tag-input.ts': 1,
	'recipes/kata/timeline.ts': 5,
	'recipes/kata/tooltip.ts': 2,
	'recipes/kata/tree.ts': 4,
	'recipes/kiso/control/affix.ts': 6,
	'recipes/kiso/control/density.ts': 4,
	'recipes/kiso/ji/size.ts': 1,
	'recipes/kiso/kokkaku/badge.ts': 2,
	'recipes/kiso/kokkaku/button.ts': 2,
	'recipes/kiso/kokkaku/calendar.ts': 1,
	'recipes/kiso/kokkaku/chart.ts': 1,
	'recipes/kiso/kokkaku/checkbox.ts': 1,
	'recipes/kiso/kokkaku/color-panel.ts': 2,
	'recipes/kiso/kokkaku/control.ts': 2,
	'recipes/kiso/kokkaku/description-list.ts': 2,
	'recipes/kiso/kokkaku/heading.ts': 6,
	'recipes/kiso/kokkaku/nav.ts': 1,
	'recipes/kiso/kokkaku/pagination.ts': 1,
	'recipes/kiso/kokkaku/progress.ts': 2,
	'recipes/kiso/kokkaku/radio.ts': 1,
	'recipes/kiso/kokkaku/rating.ts': 2,
	'recipes/kiso/kokkaku/segment.ts': 2,
	'recipes/kiso/kokkaku/slider.ts': 2,
	'recipes/kiso/kokkaku/sparkline.ts': 2,
	'recipes/kiso/kokkaku/switch.ts': 2,
	'recipes/kiso/kokkaku/tabs.ts': 7,
	'recipes/kiso/kokkaku/timeline.ts': 2,
	'recipes/kiso/kokkaku/toggle-icon-button.ts': 1,
	'recipes/kiso/kokkaku/tree.ts': 1,
	'recipes/kiso/narabi/inset.ts': 2,
	'recipes/kiso/segment/control.ts': 1,
	'recipes/kiso/segment/item.ts': 3,
	'recipes/kiso/shaku/icon.ts': 2,
}

/**
 * A step picked by hand: a comparison with an outer step, a clamp outside the
 * core, or a `size` prop typed with a step type or with step literals.
 */
const HAND_STEP = new RegExp(
	[
		String.raw`[=!]==\s*'(?:xs|xl)'`,
		String.raw`'(?:xs|xl)'\s*[=!]==`,
		String.raw`\b(?:toInnerStep|stepDown|slotStep)\(`,
		String.raw`\bsize\??:\s*(?:DensityStep|ControlStep|InnerStep)\b`,
		String.raw`\bsize\??:\s*'(?:xs|sm|md|lg|xl)'(?:\s*\|\s*'(?:xs|sm|md|lg|xl)')+`,
	].join('|'),
	'g',
)

/** The files that pick a step by hand today, with the count of each. */
const HAND_STEP_BACKLOG: Record<string, number> = {
	'components/calendar/calendar-range.tsx': 1,
	'components/calendar/calendar.tsx': 2,
	'components/card/card-title.tsx': 1,
	'components/card/card.tsx': 1,
	'components/color/color-panel.tsx': 1,
	'components/color/color-picker-content.tsx': 1,
	'components/color/color-picker-trigger.tsx': 1,
	'components/color/color-picker.tsx': 1,
	'components/combobox/combobox-panel.tsx': 1,
	'components/combobox/combobox.tsx': 1,
	'components/control/control-skeleton.tsx': 1,
	'components/control/control.tsx': 1,
	'components/date-picker/date-picker-content.tsx': 1,
	'components/date-picker/date-picker-trigger.tsx': 1,
	'components/date-picker/date-picker.tsx': 1,
	'components/drawer/drawer-static.tsx': 1,
	'components/drawer/drawer.tsx': 1,
	'components/file-upload/file-upload-state.ts': 2,
	'components/group/group.tsx': 1,
	'components/heading/heading-skeleton.tsx': 1,
	'components/heading/heading.tsx': 1,
	'components/icon/icon.tsx': 1,
	'components/input/input.tsx': 1,
	'components/listbox/listbox-panel.tsx': 1,
	'components/listbox/listbox.tsx': 1,
	'components/menu/context.ts': 1,
	'components/menu/menu.tsx': 1,
	'components/menu/use-menu-state.ts': 1,
	'components/pivot-table/pivot-table.tsx': 1,
	'components/placeholder/placeholder-skeleton.ts': 1,
	'components/popover/popover-content.tsx': 1,
	'components/progress/progress-bar.tsx': 1,
	'components/rating/rating-skeleton.tsx': 1,
	'components/rating/rating.tsx': 1,
	'components/sidebar/sidebar-item.tsx': 1,
	'components/sparkline/sparkline.tsx': 1,
	'components/table/table.tsx': 1,
	'components/tabs/tab-list-skeleton.tsx': 1,
	'components/tabs/tabs.tsx': 1,
	'components/textarea/textarea-skeleton.tsx': 1,
	'components/textarea/textarea.tsx': 1,
	'components/tooltip/tooltip-anchor.tsx': 1,
	'components/tooltip/tooltip-content.tsx': 1,
	'components/tooltip/tooltip-pointer.tsx': 1,
	'components/tree/tree-skeleton.tsx': 1,
	'components/tree/tree.tsx': 1,
	'modules/chart/engine/chart-skeleton.tsx': 1,
	'modules/chart/engine/types.ts': 1,
	'modules/chart/engine/use-chart-cartesian.ts': 1,
	'modules/chart/scatter-chart/scatter-chart.tsx': 2,
	'modules/grid/engine/grid-data/classes.ts': 1,
	'modules/grid/grid-data-types.ts': 1,
	'primitives/select-trigger/select-trigger.tsx': 1,
	'recipes/kata/badge.ts': 1,
	'recipes/kata/button.ts': 1,
	'recipes/kata/checkbox.ts': 1,
	'recipes/kata/loading.ts': 2,
	'recipes/kata/progress.ts': 2,
	'recipes/kata/radio.ts': 1,
	'recipes/kata/sidebar.ts': 1,
	'recipes/kata/slider-range.ts': 1,
	'recipes/kata/slider.ts': 1,
	'recipes/kata/switch.ts': 1,
}

describe('size scale', () => {
	it('reads the source of the package', () => {
		// A walk that read no file would pass each case below with an empty map.
		expect(sources.length).toBeGreaterThan(500)
	})

	it('gives each ramp three or five values', () => {
		const broken = sources.flatMap(({ file, code }) =>
			Array.from(code.matchAll(RAMP), ([ramp, list]) =>
				valuesByStep(list ?? '') ? [] : [`${file}: ${ramp}`],
			).flat(),
		)

		expect(broken).toEqual([])
	})

	it('writes a ramp only in the home of the ramps, less the backlog', () => {
		const outside = sources.filter(({ file }) => !file.startsWith(RAMP_HOME))

		expect(countsOf(RAMP, outside)).toEqual(RAMP_BACKLOG)
	})

	it('picks no step by hand outside the density core, less the backlog', () => {
		expect(countsOf(HAND_STEP)).toEqual(HAND_STEP_BACKLOG)
	})
})
