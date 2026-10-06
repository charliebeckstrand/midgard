import { describe, expect, it } from 'vitest'
import { Switch } from '../../components/switch'
import { present, renderUI } from '../helpers'

/**
 * The thumb of a checked Switch keeps its ring and its tinted shadow.
 *
 * `--switch-shadow` holds a color. A bare `shadow-(--switch-shadow)` writes that color into
 * `--tw-shadow`, so the composed `box-shadow` is not valid at computed-value time and Chromium
 * draws `none`. The `color:` type hint writes the value into `--tw-shadow-color` instead. The file
 * runs in the real browser, because jsdom loads no stylesheet.
 */
describe('checked switch thumb box-shadow (real browser)', () => {
	function thumbShadow(checked: boolean) {
		const { container } = renderUI(
			<Switch aria-label="Notifications" checked={checked} onChange={() => {}} />,
		)
		const thumb = present(container.querySelector('[data-slot="switch-thumb"]'), 'switch thumb')
		return getComputedStyle(thumb).boxShadow
	}

	it('draws a box-shadow on the unchecked thumb (control)', () => {
		expect(thumbShadow(false)).not.toBe('none')
	})

	it('draws a box-shadow (ring + shadow) on the checked thumb', () => {
		expect(thumbShadow(true)).not.toBe('none')
	})
})
