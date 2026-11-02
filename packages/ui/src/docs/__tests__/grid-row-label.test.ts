// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// A grid that selects or edits rows names each row in its labels: "Select
// Ada", "Edit Name, Ada". With no `rowLabel`, a screen reader hears "Select row
// 3" and "Edit Name, row 1", which name no person. Each grid demo that selects
// or edits rows therefore gives a `rowLabel`.

const GRID_PAGES = path.resolve(import.meta.dirname, '..', 'pages', 'modules', 'grid')

/** The path of each demo file under the grid pages, relative to them. */
function demoFiles(): string[] {
	return readdirSync(GRID_PAGES, { recursive: true, encoding: 'utf8' })
		.filter((file) => file.endsWith('.tsx') && !file.endsWith('index.tsx'))
		.toSorted()
}

/** Whether `code` renders a grid that selects or edits rows. */
const labelsRows = (code: string) =>
	/<Grid\b/.test(code) && /selectable: true|\bselection=\{|\beditable=\{/.test(code)

describe('the grid demos that select or edit rows', () => {
	const files = demoFiles().filter((file) =>
		labelsRows(readFileSync(path.join(GRID_PAGES, file), 'utf8')),
	)

	it('find demos to check', () => {
		expect(files.length).toBeGreaterThan(0)
	})

	it.each(files)('%s gives each row a label', (file) => {
		expect(readFileSync(path.join(GRID_PAGES, file), 'utf8')).toMatch(/\browLabel=\{/)
	})
})
