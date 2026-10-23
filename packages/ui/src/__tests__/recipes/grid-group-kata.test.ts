// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { k } from '../../recipes/kata/grid-group'

/** The source of a module file of the grid. */
const gridSource = (file: string) =>
	readFileSync(fileURLToPath(new URL(`../../modules/grid/${file}`, import.meta.url)), 'utf8')

/**
 * The group band, the group editor, the row manager, and the manager grip that
 * the two editors share are the readers of the unit. A slot that they do not
 * read styles nothing, and it misleads the next reader of the kata.
 */
const source = [
	'grid-group-head.tsx',
	'grid-group-manager.tsx',
	'grid-row-manager.tsx',
	'grid-manager-grip.tsx',
]
	.map(gridSource)
	.join('\n')

/** The key path of each class string of the unit output, as `manager.row.grip`. */
const paths = (output: object, prefix = ''): string[] =>
	Object.entries(output).flatMap(([key, value]) =>
		typeof value === 'object' ? paths(value, `${prefix}${key}.`) : [`${prefix}${key}`],
	)

describe('the grid-group kata', () => {
	it.each(paths(k()))('has a reader for the %s slot', (slot) => {
		const read = slot.replace(/\.base$/, '').replaceAll('.', String.raw`\.`)

		expect(source).toMatch(new RegExp(String.raw`\b(k|groupK)\([^()]*\)\.${read}\b`))
	})
})
