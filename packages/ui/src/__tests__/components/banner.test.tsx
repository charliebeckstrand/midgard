import { describe, expect, it } from 'vitest'
import { Banner } from '../../components/banner'
import { bySlot, renderUI } from '../helpers'

describe('Banner', () => {
	// The `sticky` prop drives whether the banner sticks to the viewport; the
	// sticky utility is the observable for that layout behaviour.
	it('applies sticky positioning when sticky is set', () => {
		const { container } = renderUI(<Banner sticky>content</Banner>)

		expect(bySlot(container, 'banner')?.className).toContain('sticky')
	})

	it('omits sticky positioning by default', () => {
		const { container } = renderUI(<Banner>content</Banner>)

		expect(bySlot(container, 'banner')?.className).not.toContain('sticky')
	})
})
