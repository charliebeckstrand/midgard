// @vitest-environment node
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
//   - No recipe of the component has a `size` or a `density` axis. The recipes
//     below hold this rule.
//   - The component reads no density context. An explicit `size` becomes a
//     scope (the `density` prop of PolymorphicStatic or Box), not a lookup. The
//     reader allowlists at the end of this file hold this rule for each file.
//
// To move a component onto the variants, add its recipes here. Then the gate
// stops a later change that selects the step in JS again.

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

const srcDir = join(import.meta.dirname, '..', '..')

describe('density-native boundary', () => {
	it.each(Object.entries(NATIVE_RECIPES))(
		'the %s recipe has no size or density axis',
		(_, recipe) => {
			const axes = Object.keys(recipe.config.variants ?? {})

			expect(axes.filter((axis) => axis === 'size' || axis === 'density')).toEqual([])
		},
	)
})

// A density scope has two channels: `data-density` for the stepped classes and
// the density context for a client reader. A context scope with no attribute
// gives the two channels different steps. So each file that opens the context
// with `<Density step>` also writes `data-density`, once for each scope. A
// control slot opens the context with `<DensitySlot>` and writes
// `data-density="slot"`.
//
// The grid is the one exception. Its overlay scope, `GridOverlayDensity`, wraps
// a surface that writes its own `data-density`.

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

/** The source files whose code, with the comments removed, matches `pattern`. */
function filesMatching(pattern: RegExp): string[] {
	const files: string[] = []

	walkSource(srcDir, (file, content) => {
		if (/\.tsx?$/.test(file) && pattern.test(stripSourceComments(content))) {
			files.push(srcRelative(file))
		}
	})

	return files.sort()
}

// A class selects a density step through the `density-*` variants and the
// stepped utilities. Those rank each match by the depth of its scope. A
// `data-[density=…]` selector has no rank, so an outer scope can win over the
// nearest one. The source therefore writes no such selector.

const DENSITY_SELECTOR = /data-\[density=/

describe('density selectors', () => {
	it('no source file selects a step with a data-[density=…] class', () => {
		expect(filesMatching(DENSITY_SELECTOR)).toEqual([])
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
		expect(filesMatching(PSEUDO_THEN_DENSITY)).toEqual([])
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
//   - The density primitive, `useDensityLevel`, and their barrels: the hooks
//     themselves.
//
// The check reads each name, not only each call, so an aliased import fails it.

const STEP_READERS = [
	'modules/chart/engine/use-chart-cartesian.ts',
	'modules/chart/scatter-chart/scatter-chart.tsx',
	'modules/grid/grid-data.tsx',
	'primitives/density/density.tsx',
	'primitives/density/index.ts',
	'providers/density/index.ts',
	'providers/density/use-density-level.ts',
]

const STEP_READ = /\buseDensity(?:Step|Level)\b/

// `useDensityScope` gives the nearest explicit scope, or `null` at the root. A
// portal root writes that scope on its element, so a portaled panel keeps the
// step of the tree that opened it. Only the portal roots and the primitive may
// read it.

const SCOPE_READERS = [
	'primitives/density/density.tsx',
	'primitives/density/index.ts',
	'primitives/floating-surface/floating-surface.tsx',
	'primitives/overlay/overlay.tsx',
]

const SCOPE_READ = /\buseDensityScope\b/

describe('density readers', () => {
	it('only the listed files read the density step in JS', () => {
		expect(filesMatching(STEP_READ)).toEqual(STEP_READERS)
	})

	it('only the portal roots read the nearest density scope', () => {
		expect(filesMatching(SCOPE_READ)).toEqual(SCOPE_READERS)
	})
})
