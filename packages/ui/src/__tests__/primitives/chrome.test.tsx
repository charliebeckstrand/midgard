import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Chrome, chromeRegions } from '../../primitives/chrome'
import { registerChrome } from '../../primitives/chrome/chrome-registry'
import { renderUI, screen } from '../helpers'

/*
 * The registry and the region's own contract. What a registration *does* to the
 * focus order is the engine's, and this project mocks the engine away —
 * browser/floating-ui/chrome.test.tsx asserts the order and the page
 * marking against the real one.
 */
describe('Chrome', () => {
	it('registers while mounted and unregisters on unmount', () => {
		const { unmount } = renderUI(
			<Chrome>
				<span>chrome</span>
			</Chrome>,
		)

		expect(chromeRegions()).toEqual([screen.getByText('chrome').closest('[data-slot]')])

		unmount()

		expect(chromeRegions()).toEqual([])
	})

	// A consumer ref must join the registration, not replace it, or the region
	// stays sealed behind every modal surface.
	it('registers the region when a consumer holds a ref to it', () => {
		const ref = createRef<HTMLDivElement>()

		renderUI(
			<Chrome ref={ref}>
				<span>chrome</span>
			</Chrome>,
		)

		expect(ref.current).not.toBeNull()

		expect(chromeRegions()).toEqual([ref.current])
	})

	it('registers each region separately, so an app can name more than one', () => {
		renderUI(
			<>
				<Chrome>
					<span>first</span>
				</Chrome>
				<Chrome>
					<span>second</span>
				</Chrome>
			</>,
		)

		expect(chromeRegions()).toHaveLength(2)
	})

	// `z-index` binds only to a positioned box, so the rung would be inert without
	// one. A consumer that positions the region differently wins through `cn`.
	it('positions itself on the chrome rung, and yields position to a consumer class', () => {
		renderUI(
			<>
				<Chrome>
					<span>default</span>
				</Chrome>
				<Chrome className="sticky top-0">
					<span>sticky</span>
				</Chrome>
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
