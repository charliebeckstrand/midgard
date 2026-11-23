import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { Kbd } from '../../../components/kbd'
import { ArrowUp } from '../../../primitives/icons/icons'
import { renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/** The rendered box of each key in `container`, in document order. */
const boxes = (container: HTMLElement) =>
	[...container.querySelectorAll('kbd')].map((key) => key.getBoundingClientRect())

/** A key with one glyph, a key with only an icon, and a key with a longer label. */
const keys = (
	<>
		<Kbd>K</Kbd>{' '}
		<Kbd>
			<Icon icon={<ArrowUp />} />
		</Kbd>{' '}
		<Kbd>Esc</Kbd>
	</>
)

/**
 * A key is never narrower than it is tall, at each density step, in a line of
 * text and in a button. A key with only an icon is a square as tall as a key
 * with text, and a key with a longer label grows.
 */
describe('the width of a Kbd (real browser)', () => {
	it.for(['xs', 'sm', 'md', 'lg', 'xl'])('is at least its height at %s', (step) => {
		const { container } = renderUI(
			<div data-density={step}>
				<p>{keys}</p>
				<Button>Go {keys}</Button>
			</div>,
		)

		const all = boxes(container)

		// In a line of text, a key with one glyph is a square. In a button, its
		// inline padding is wider than its 1 px block padding, so it can be wider.
		const [text, textIcon] = all

		expect(text?.width).toBeNear(text?.height ?? 0, HALF_PIXEL)

		// A key with only an icon sits on the baseline of the line, as a key with text does.
		expect(textIcon?.top).toBeNear(text?.top ?? 0, HALF_PIXEL)

		for (const [glyph, icon, label] of [all.slice(0, 3), all.slice(3, 6)]) {
			expect(glyph?.width).toBeGreaterThanOrEqual((glyph?.height ?? 0) - HALF_PIXEL)

			expect(icon?.width).toBeNear(icon?.height ?? 0, HALF_PIXEL)

			expect(icon?.height).toBeNear(glyph?.height ?? 0, HALF_PIXEL)

			expect(label?.height).toBeNear(glyph?.height ?? 0, HALF_PIXEL)

			expect(label?.width).toBeGreaterThan(label?.height ?? 0)
		}
	})
})
