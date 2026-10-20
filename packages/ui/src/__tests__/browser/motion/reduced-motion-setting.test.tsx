import { afterEach, describe, expect, it } from 'vitest'
import { ROOT_REDUCED_MOTION_CLASS } from '../../../core/motion/root'
import { renderUI, screen } from '../../helpers'

/**
 * The `motion-reduce` and `motion-safe` variants of `ui/tailwind.css` follow the
 * Motion setting: the `reduced-motion` class on the root element. The browser
 * of the suite asks for no reduction, so only the class can reduce.
 */
describe('Motion variants and the Motion setting', () => {
	afterEach(() => {
		document.documentElement.classList.remove(ROOT_REDUCED_MOTION_CLASS)
	})

	function opacity() {
		renderUI(
			<div
				data-testid="box"
				className="opacity-100 motion-safe:opacity-25 motion-reduce:opacity-50"
			/>,
		)

		return getComputedStyle(screen.getByTestId('box')).opacity
	}

	it('applies motion-safe when the root has no class', () => {
		expect(opacity()).toBe('0.25')
	})

	it('applies motion-reduce and not motion-safe when the root has the class', () => {
		document.documentElement.classList.add(ROOT_REDUCED_MOTION_CLASS)

		expect(opacity()).toBe('0.5')
	})
})
