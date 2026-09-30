// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { k } from '../../recipes/kata/grid-group'

/** The source of a module file of the grid. */
const gridSource = (file: string) =>
	readFileSync(fileURLToPath(new URL(`../../modules/grid/${file}`, import.meta.url)), 'utf8')

/**
 * The group editor and the manager grip that it shares with the row manager
 * are the readers of `k.manager`. A slot that they do not read styles nothing,
 * and it misleads the next reader of the kata.
 */
const managerSource = ['grid-group-manager.tsx', 'grid-manager-grip.tsx'].map(gridSource).join('\n')

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
