// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k as commandPalette } from '../../recipes/kata/command-palette'
import { k as menu } from '../../recipes/kata/menu'
import { k as option } from '../../recipes/kata/option'
import { dan, ji } from '../../recipes/kiso'

// Row description size invariant.
//
// Option, the Menu item, and the CommandPalette item extend the item group,
// which owns the description slot. The description of a row is one step below
// the text of its row, so it is smaller than the label in each unit. Option and
// the Menu item step their text with the density scope, so their description
// takes the small text of that scope. The CommandPalette row has fixed text at
// `md`, so its description is fixed at `sm`.

const toClasses = (value: string) => value.split(/\s+/)

const rows = {
	Option: { root: option().base, description: option().description, step: dan.text.small },
	'Menu item': {
		root: menu.item().base,
		description: menu.item().description,
		step: dan.text.small,
	},
	'CommandPalette item': {
		root: commandPalette.item().base,
		description: commandPalette.item().description,
		step: ji.size.sm,
	},
}

describe('Row description size', () => {
	for (const [name, { description, step }] of Object.entries(rows)) {
		it(`gives the ${name} description the text one step below its row`, () => {
			expect(toClasses(description)).toEqual(expect.arrayContaining(toClasses(step)))
		})
	}

	it('steps the row text of Option and the Menu item with the density scope', () => {
		expect(toClasses(rows.Option.root)).toContain(dan.text.body)

		expect(toClasses(rows['Menu item'].root)).toContain(dan.text.body)
	})

	it('fixes the row text of the CommandPalette item at md', () => {
		expect(toClasses(rows['CommandPalette item'].root)).toContain(ji.size.md)

		expect(toClasses(rows['CommandPalette item'].root)).not.toContain(dan.text.body)
	})
})
