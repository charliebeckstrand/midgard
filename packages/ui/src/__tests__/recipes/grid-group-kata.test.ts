// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { k } from '../../recipes/kata/grid-group'

/**
 * The group editor is the one reader of `k.manager`. A slot that it does not
 * read styles nothing, and it misleads the next reader of the kata.
 */
const managerSource = readFileSync(
	fileURLToPath(new URL('../../modules/grid/grid-group-manager.tsx', import.meta.url)),
	'utf8',
)

/** The dotted path of each string or class-list leaf under `node`. */
function leafPaths(node: object, prefix: string): string[] {
	return Object.entries(node).flatMap(([key, value]) =>
		typeof value === 'string' || Array.isArray(value)
			? [`${prefix}.${key}`]
			: leafPaths(value as object, `${prefix}.${key}`),
	)
}

describe('the grid-group manager kata', () => {
	it.each(leafPaths(k.manager, 'k.manager'))('has a reader for %s', (path) => {
		expect(managerSource).toContain(path)
	})
})
