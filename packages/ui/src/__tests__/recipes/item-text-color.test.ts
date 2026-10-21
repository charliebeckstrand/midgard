// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { cn } from '../../core'
import { k as palette } from '../../recipes/kata/command-palette'
import { k as menu } from '../../recipes/kata/menu'
import { k as tabs } from '../../recipes/kata/tabs'

// Item text color invariant.
//
// A row of a CommandPalette, a Menu, or Tabs spreads `narabi.item` after its
// own text color. When `narabi.item` held `text-inherit`, the merge dropped
// the light color of the row, and the row took the color of its container. In
// the body of a dialog, that is the muted text, so the rows of a palette were
// muted. Each row here keeps both colors of its recipe after the merge.

const ROWS = [
	{ name: 'CommandPalette item', classes: cn(palette.item), light: 'text-zinc-950' },
	{ name: 'Menu item', classes: cn(menu.item), light: 'text-zinc-950' },
	{ name: 'Tab', classes: tabs({ orientation: 'horizontal' }).tab, light: 'text-zinc-500' },
]

describe('the text color of an item row', () => {
	it.each(ROWS)('$name keeps the light color of its recipe', ({ classes, light }) => {
		expect(classes.split(' ')).toContain(light)

		expect(classes.split(' ')).not.toContain('text-inherit')
	})
})
