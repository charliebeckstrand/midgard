// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { iconSize } from '../../core/density/geometry'
import { shaku } from '../../recipes/kiso/shaku'

/**
 * The fixed icon slot form repeats the icon size of the `md` step (`iconSize`). Tailwind needs
 * each class as a literal, so the form cannot be built from the scale. `density-geometry.test.ts`
 * pins the stepped ramps.
 */
describe('shaku icon ramps', () => {
	it('icon.slot.md holds the icon slot size of md', () => {
		expect(shaku.icon.slot.md).toBe(
			`*:data-[slot=icon]:size-${iconSize('md') / 4} *:data-[slot=icon]:shrink-0`,
		)
	})
})
