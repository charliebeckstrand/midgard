import { describe, expect, it } from 'vitest'
import { Banner } from '../../components/banner'
import { bySlot, renderUI } from '../helpers'

describe('Banner', () => {
	// The `position` prop drives whether the banner sticks to the viewport; the
	// sticky utility is the observable for that layout behaviour.
	it('applies sticky positioning when position="sticky"', () => {
		const { container } = renderUI(<Banner position="sticky">content</Banner>)

		expect(bySlot(container, 'banner')?.className).toContain('sticky')
	})

	it('omits sticky positioning by default', () => {
		const { container } = renderUI(<Banner>content</Banner>)

		expect(bySlot(container, 'banner')?.className).not.toContain('sticky')
	})
})
