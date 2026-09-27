// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { k as badge } from '../../recipes/kata/badge'
import { k as loading } from '../../recipes/kata/loading'
import { k as table } from '../../recipes/kata/table'

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
	'loading spinner': loading.spinner,
	'table cell': table.cell,
	'table header': table.header,
}

const NATIVE_FILES = [
	'components/badge/badge.tsx',
	'components/card/card.tsx',
	'components/card/card-header.tsx',
	'components/card/card-footer.tsx',
	'components/icon/icon.tsx',
	'components/loading/loading-spinner.tsx',
	'components/table/table.tsx',
]

const DENSITY_READS = /\b(?:useDensityStep|useDensityNullable|useResolvedSize|useAffix)\b/

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
