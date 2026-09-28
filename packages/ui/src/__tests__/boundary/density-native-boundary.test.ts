// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { k as sidebarLayout } from '../../layouts/sidebar/variants'
import { k as badge } from '../../recipes/kata/badge'
import { k as button } from '../../recipes/kata/button'
import { k as checkbox } from '../../recipes/kata/checkbox'
import { k as colorPanel } from '../../recipes/kata/color-panel'
import { k as colorPicker } from '../../recipes/kata/color-picker'
import { k as combobox } from '../../recipes/kata/combobox'
import { k as datePicker } from '../../recipes/kata/date-picker'
import { k as fieldset } from '../../recipes/kata/fieldset'
import { k as heading } from '../../recipes/kata/heading'
import { k as input } from '../../recipes/kata/input'
import { k as list } from '../../recipes/kata/list'
import { k as listbox } from '../../recipes/kata/listbox'
import { k as loading } from '../../recipes/kata/loading'
import { k as menu } from '../../recipes/kata/menu'
import { k as progress } from '../../recipes/kata/progress'
import { k as radio } from '../../recipes/kata/radio'
import { k as rating } from '../../recipes/kata/rating'
import { k as sidebar } from '../../recipes/kata/sidebar'
import { k as slider } from '../../recipes/kata/slider'
import { k as rangeSlider } from '../../recipes/kata/slider-range'
import { k as sparkline } from '../../recipes/kata/sparkline'
import { k as switchRecipe } from '../../recipes/kata/switch'
import { k as table } from '../../recipes/kata/table'
import { k as tabs } from '../../recipes/kata/tabs'
import { k as textarea } from '../../recipes/kata/textarea'
import { k as tree } from '../../recipes/kata/tree'
import { srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// A density-native component takes its step from the nearest density scope.
// Its kata writes each step in a stepped `density-*` utility, so the DOM selects the
// step and no JS code selects it. Two rules hold that design:
//
//   - No recipe of the component has a `size` or a `density` axis.
//   - The component reads no density context. An explicit `size` becomes a
//     scope (the `density` prop of PolymorphicStatic or Box), not a lookup.
//
// To move a component onto the variants, add its recipes and its files here.
// Then the gate stops a later change that selects the step in JS again.

const NATIVE_RECIPES = {
	badge,
	button,
	checkbox,
	'color panel': colorPanel,
	'color picker button': colorPicker.button,
	combobox,
	'date picker button': datePicker.button,
	description: fieldset.description,
	heading,
	input,
	label: fieldset.label,
	'list item': list.item,
	listbox,
	'loading spinner': loading.spinner,
	'menu viewport': menu.viewport,
	message: fieldset.message,
	'progress bar': progress,
	'progress gauge': progress.gauge.root,
	'progress gauge label': progress.gauge.label,
	radio,
	'range slider': rangeSlider.root,
	'range slider thumb': rangeSlider.thumb,
	'range slider track': rangeSlider.track,
	rating,
	'sidebar item': sidebar.item.base,
	'sidebar item row': sidebar.item.row,
	'sidebar layout content': sidebarLayout.content,
	'sidebar layout header': sidebarLayout.header,
	'sidebar layout panel': sidebarLayout.panel,
	slider,
	sparkline,
	switch: switchRecipe,
	tab: tabs.tab,
	'table cell': table.cell,
	'table header': table.header,
	textarea,
	'tree item': tree.item.content,
}

const NATIVE_FILES = [
	'components/badge/badge.tsx',
	'components/button/button.tsx',
	'components/calendar/calendar-picker.tsx',
	'components/calendar/calendar.tsx',
	'components/card/card-footer.tsx',
	'components/card/card-header.tsx',
	'components/card/card-title.tsx',
	'components/card/card.tsx',
	'components/checkbox/checkbox.tsx',
	'components/color/color-panel.tsx',
	'components/color/color-picker.tsx',
	'components/combobox/combobox.tsx',
	'components/date-picker/date-picker-footer.tsx',
	'components/date-picker/date-picker.tsx',
	'components/drawer/drawer.tsx',
	'components/fieldset/description.tsx',
	'components/fieldset/label.tsx',
	'components/fieldset/message.tsx',
	'components/group/group.tsx',
	'components/heading/heading-skeleton.tsx',
	'components/heading/heading.tsx',
	'components/icon/icon.tsx',
	'components/list/list-item.tsx',
	'components/listbox/listbox.tsx',
	'components/loading/loading-spinner.tsx',
	'components/menu/menu-item.tsx',
	'components/menu/menu-sub.tsx',
	'components/menu/menu-viewport.tsx',
	'components/menu/use-menu-state.ts',
	'components/nav/nav-item.tsx',
	'components/nav/use-nav-item.ts',
	'components/popover/popover-content.tsx',
	'components/progress/progress-bar.tsx',
	'components/progress/progress-gauge.tsx',
	'components/radio/radio.tsx',
	'components/rating/rating.tsx',
	'components/sidebar/sidebar-item.tsx',
	'components/slider/range/range-slider.tsx',
	'components/slider/slider.tsx',
	'components/sparkline/sparkline.tsx',
	'components/switch/switch.tsx',
	'components/table/table.tsx',
	'components/tabs/tab-list.tsx',
	'components/tabs/tab.tsx',
	'components/tabs/tabs.tsx',
	'components/tooltip/tooltip-content.tsx',
	'components/tree/tree-item-children.tsx',
	'components/tree/tree-item-content.tsx',
	'components/tree/tree.tsx',
	'layouts/sidebar/sidebar.tsx',
	'modules/chat/chat-list-item.tsx',
	'modules/grid/grid-data-table.tsx',
	'modules/grid/grid-region.tsx',
	'primitives/option/option.tsx',
	'primitives/panel/panel-providers.tsx',
	'primitives/panel/slots.tsx',
]

const DENSITY_READS = /\b(?:useDensityStep|useDensityScope)\b/

const srcDir = join(import.meta.dirname, '..', '..')

describe('density-native boundary', () => {
	it.each(Object.entries(NATIVE_RECIPES))(
		'the %s recipe has no size or density axis',
		(_, recipe) => {
			const axes = Object.keys(recipe.config.variants ?? {})

			expect(axes.filter((axis) => axis === 'size' || axis === 'density')).toEqual([])
		},
	)

	it.each(NATIVE_FILES)('%s reads no density context', (file) => {
		expect(readFileSync(join(srcDir, file), 'utf8')).not.toMatch(DENSITY_READS)
	})
})

// A density scope has two channels: `data-density` for the stepped classes and
// the density context for a client reader. A context scope with no attribute
// gives the two channels different steps. So each file that opens the context
// with `<Density step>` also writes `data-density`, once for each scope. A
// control slot opens the context with `<DensitySlot>` and writes
// `data-density="slot"`.
//
// The grid is the one exception. Its cell scope is on the `<table>`, and its
// overlay scope wraps a surface that opens its own scope.

const CONTEXT_SCOPE = /<Density(?:\s+step=|Slot>)/g

const ATTRIBUTE = /data-density/g

const CONTEXT_ONLY = new Set(['modules/grid/grid-region.tsx'])

describe('density scope parity', () => {
	it('each context scope also writes data-density', () => {
		const violations: string[] = []

		walkSource(srcDir, (file, content) => {
			if (!file.endsWith('.tsx')) return

			const rel = srcRelative(file)

			if (CONTEXT_ONLY.has(rel)) return

			const text = stripSourceComments(content)

			const scopes = text.match(CONTEXT_SCOPE)?.length ?? 0

			const attributes = text.match(ATTRIBUTE)?.length ?? 0

			if (scopes > attributes) violations.push(`${rel}: ${scopes} scopes, ${attributes} attributes`)
		})

		expect(violations).toEqual([])
	})
})

// A class selects a density step through the `density-*` variants and the
// stepped utilities. Those rank each match by the depth of its scope. A
// `data-[density=…]` selector has no rank, so an outer scope can win over the
// nearest one. The source therefore writes no such selector.

const DENSITY_SELECTOR = /data-\[density=/

describe('density selectors', () => {
	it('no source file selects a step with a data-[density=…] class', () => {
		const violations: string[] = []

		walkSource(srcDir, (file, content) => {
			if (!/\.tsx?$/.test(file)) return

			const rel = srcRelative(file)

			if (rel.startsWith('__tests__')) return

			if (DENSITY_SELECTOR.test(stripSourceComments(content))) violations.push(rel)
		})

		expect(violations).toEqual([])
	})
})

// A pseudo-element ends a selector. A density class after a pseudo-element
// variant, such as `before:density-p-[2,3,4]`, therefore writes rules that no
// browser can match: the rung of the element itself puts an attribute after the
// pseudo-element. The density variant comes first, as in
// `density-md:before:p-3` or `density-[xs,sm]:before:p-2`.

const PSEUDO_THEN_DENSITY =
	/(?<![\w-])(?:before|after|placeholder|file|marker|selection|backdrop|first-line|first-letter|\[&::[^\]\s]+\]):[^\s'"`]*?density-/

describe('density after a pseudo-element', () => {
	it('no source file puts a density class after a pseudo-element variant', () => {
		const violations: string[] = []

		walkSource(srcDir, (file, content) => {
			if (!/\.tsx?$/.test(file)) return

			const rel = srcRelative(file)

			if (rel.startsWith('__tests__')) return

			if (PSEUDO_THEN_DENSITY.test(stripSourceComments(content))) violations.push(rel)
		})

		expect(violations).toEqual([])
	})
})

// A component that reads the step as a JS value paints the `md` step on the
// server and in the hydration render, so the markup is wrong at the first
// paint. Only the files below may read it. Each uses the value only for work
// after mount, or for a context that a client descendant reads after mount.
//
//   - Chart and scatter chart: the tick cap. With no `width`, the server
//     renders an empty frame, and the chart measures before the first paint.
//   - GridData: the virtualizer estimate, the autosizer refit key, and the
//     step of the overlays that the grid opens.
//   - The density primitive and `useDensityLevel`: the hooks themselves.

const STEP_READERS = [
	'modules/chart/engine/use-chart-cartesian.ts',
	'modules/chart/scatter-chart/scatter-chart.tsx',
	'modules/grid/grid-data.tsx',
	'primitives/density/density.tsx',
	'providers/density/use-density-level.ts',
]

const STEP_READ = /\buseDensity(?:Step|Level)\(/

describe('density step readers', () => {
	it('only the listed files read the density step in JS', () => {
		const readers: string[] = []

		walkSource(srcDir, (file, content) => {
			if (!/\.tsx?$/.test(file)) return

			const rel = srcRelative(file)

			if (rel.startsWith('__tests__')) return

			if (STEP_READ.test(stripSourceComments(content))) readers.push(rel)
		})

		expect(readers.sort()).toEqual(STEP_READERS)
	})
})
