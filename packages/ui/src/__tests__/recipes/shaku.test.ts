import { describe, expect, it } from 'vitest'
import { shaku } from '../../recipes'

describe('shaku.combobox', () => {
	it('positions the icon 1px inside the control border', () => {
		// Combobox borders are visible, so the icon insets by a pixel to avoid
		// touching the stroke; matches the listbox sibling that sits flush.
		expect(shaku.combobox.icon).toBe('absolute inset-y-px right-px')
	})

	it('absolutely positions the icon', () => {
		expect(shaku.combobox.icon).toMatch(/(^|\s)absolute(\s|$)/)
	})
})

describe('shaku.listbox', () => {
	it('places the icon flush to the button border', () => {
		// Listbox uses a borderless trigger so the icon can sit at inset-0;
		// pairs with the combobox sibling that insets a pixel.
		expect(shaku.listbox.icon).toBe('absolute inset-y-0 right-0')
	})

	it('absolutely positions the icon', () => {
		expect(shaku.listbox.icon).toMatch(/(^|\s)absolute(\s|$)/)
	})
})
