import { describe, expect, it } from 'vitest'
import { renderUI, screen } from '../../helpers'

/**
 * The `motion-reduce` and `motion-safe` variants of `ui/tailwind.css` follow
 * the platform setting: `(prefers-reduced-motion: reduce)`. The page of this
 * instance asks for reduced motion, and the root has no class of the Motion
 * setting, so only the media query can reduce.
 * `motion/reduced-motion-setting.test.tsx` holds the half of the class.
 */
describe('Motion variants and the platform setting', () => {
	it('applies motion-reduce and not motion-safe when the platform asks for reduced motion', () => {
		renderUI(
			<div
				data-testid="box"
				className="opacity-100 motion-safe:opacity-25 motion-reduce:opacity-50"
			/>,
		)

		expect(getComputedStyle(screen.getByTestId('box')).opacity).toBe('0.5')
	})
})
