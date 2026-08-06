import { describe, expect, it } from 'vitest'
import { chromeRegions, PersistentChrome, registerChrome } from '../../primitives/chrome'
import { renderUI, screen } from '../helpers'

/*
 * The registry and the region's own contract. What a registration *does* to the
 * focus order is the engine's, and this project mocks the engine away —
 * browser/floating-ui/persistent-chrome.test.tsx asserts the order and the page
 * marking against the real one.
 */
describe('PersistentChrome', () => {
	it('registers while mounted and unregisters on unmount', () => {
		const { unmount } = renderUI(
			<PersistentChrome>
				<span>chrome</span>
			</PersistentChrome>,
		)

		expect(chromeRegions()).toEqual([screen.getByText('chrome').closest('[data-slot]')])

		unmount()

		expect(chromeRegions()).toEqual([])
	})

	it('registers each region separately, so an app can name more than one', () => {
		renderUI(
			<>
				<PersistentChrome>
					<span>first</span>
				</PersistentChrome>
				<PersistentChrome>
					<span>second</span>
				</PersistentChrome>
			</>,
		)

		expect(chromeRegions()).toHaveLength(2)
	})

	// `z-index` binds only to a positioned box, so the rung would be inert without
	// one. A consumer that positions the region differently wins through `cn`.
	it('positions itself on the chrome rung, and yields position to a consumer class', () => {
		renderUI(
			<>
				<PersistentChrome>
					<span>default</span>
				</PersistentChrome>
				<PersistentChrome className="sticky top-0">
					<span>sticky</span>
				</PersistentChrome>
			</>,
		)

		const [plain, positioned] = chromeRegions()

		expect(plain?.className).toContain('relative')

		expect(plain?.className).toContain('z-100')

		expect(positioned?.className).toContain('sticky')

		expect(positioned?.className).not.toContain('relative')
	})

	it('hands back a copy, so a caller cannot mutate the registry', () => {
		const node = document.createElement('div')

		const unregister = registerChrome(node)

		try {
			chromeRegions().length = 0

			expect(chromeRegions()).toEqual([node])
		} finally {
			unregister()
		}
	})
})
