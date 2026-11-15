// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { k as commandPalette } from '../../recipes/kata/command-palette'
import { k as menu } from '../../recipes/kata/menu'
import { k as option } from '../../recipes/kata/option'

// Row description size invariant.
//
// Option, the Menu item, and the CommandPalette item extend the item group,
// which owns the description slot. A description takes the size of its row,
// so the label and the description of a row have one size in each unit. The
// muted ink tells them apart. A unit that sets a size of its own on the
// description gives its rows a look that the other units do not have.

const TEXT_SIZE = /(^|:)text-(xs|sm|base|lg|xl|\d?xl)$/

const rows = {
	Option: option().description,
	'Menu item': menu.item().description,
	'CommandPalette item': commandPalette.item().description,
}

describe('Row description size', () => {
	for (const [name, classes] of Object.entries(rows)) {
		it(`gives the ${name} description the size of its row`, () => {
			expect(classes.split(/\s+/).filter((c) => TEXT_SIZE.test(c))).toEqual([])
		})
	}
})
