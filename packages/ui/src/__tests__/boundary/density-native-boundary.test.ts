// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { k as badge } from '../../recipes/kata/badge'
import { k as fieldset } from '../../recipes/kata/fieldset'
import { k as loading } from '../../recipes/kata/loading'
import { k as table } from '../../recipes/kata/table'
import { stripSourceComments, walkSource } from '../helpers/walk-source'

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
	description: fieldset.description,
	label: fieldset.label,
	'loading spinner': loading.spinner,
	message: fieldset.message,
	'table cell': table.cell,
	'table header': table.header,
}

const NATIVE_FILES = [
	'components/badge/badge.tsx',
	'components/card/card.tsx',
	'components/card/card-header.tsx',
	'components/card/card-footer.tsx',
	'components/fieldset/description.tsx',
	'components/fieldset/label.tsx',
	'components/fieldset/message.tsx',
	'components/icon/icon.tsx',
	'components/loading/loading-spinner.tsx',
	'components/table/table.tsx',
]

const DENSITY_READS = /\b(?:useDensityStep|useDensityNullable)\b/

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
// with `<Density step>` also writes `data-density`, once for each scope.
//
// The grid is the one exception. Its cell scope is on the `<table>`, and its
// overlay scope wraps a surface that opens its own scope.

const CONTEXT_SCOPE = /<Density\s+step=/g

const ATTRIBUTE = /data-density/g

const CONTEXT_ONLY = new Set(['modules/grid/grid-region.tsx'])

describe('density scope parity', () => {
	it('each context scope also writes data-density', () => {
		const violations: string[] = []

		walkSource(srcDir, (file, content) => {
			if (!file.endsWith('.tsx')) return

			const rel = relative(srcDir, file)

			if (CONTEXT_ONLY.has(rel)) return

			const text = stripSourceComments(content)

			const scopes = text.match(CONTEXT_SCOPE)?.length ?? 0

			const attributes = text.match(ATTRIBUTE)?.length ?? 0

			if (scopes > attributes) violations.push(`${rel}: ${scopes} scopes, ${attributes} attributes`)
		})

		expect(violations).toEqual([])
	})
})
