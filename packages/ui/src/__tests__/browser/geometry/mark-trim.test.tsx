import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { Code } from '../../../components/code'
import { Kbd } from '../../../components/kbd'
import { renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'

/** Whether the browser trims a text box to the cap height and the baseline (`text-trim`). */
const TRIMS = CSS.supports('text-box', 'trim-both cap alphabetic')

/**
 * The space above the cap height and the space below the baseline of `mark`.
 * The rectangle of the text of the mark holds the ascent and the descent of its
 * font, so the baseline is the descent above its bottom edge. A block of `1cap`
 * in the mark gives the cap height of the font.
 */
function spaces(mark: HTMLElement) {
	const cap = document.createElement('i')

	cap.style.cssText = 'position:absolute;height:1cap'

	mark.append(cap)

	const capHeight = cap.getBoundingClientRect().height

	cap.remove()

	const style = getComputedStyle(mark)

	const context = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D

	context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`

	const descent = context.measureText(mark.textContent ?? '').fontBoundingBoxDescent

	const range = document.createRange()

	range.selectNodeContents(mark)

	const baseline = range.getBoundingClientRect().bottom - descent

	const box = mark.getBoundingClientRect()

	return { above: baseline - capHeight - box.top, below: box.bottom - baseline }
}

/**
 * The text of an inline code mark and of a key has the same space above its
 * cap height and below its baseline. With no trim, the box of the text is the
 * ascent and the descent of the font, so text with no descender, such as `v2`,
 * had more space below it than above it.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
describe.skipIf(!TRIMS)('the space around the text of an inline mark (real browser)', () => {
	it.for(['xs', 'sm', 'md', 'lg', 'xl'])('is the same above and below at %s', (step) => {
		const { container } = renderUI(
			<div data-density={step}>
				<p>
					Ship the <Code>v2</Code>
				</p>
				<p>
					Press <Kbd>⌘K</Kbd>
				</p>
				<Button>
					Open <Kbd>⌘O</Kbd>
				</Button>
			</div>,
		)

		const marks = [...container.querySelectorAll<HTMLElement>('code, kbd')]

		expect(marks).toHaveLength(3)

		for (const mark of marks) {
			const { above, below } = spaces(mark)

			expect(above).toBeGreaterThan(0)

			expect(above).toBeNear(below, HALF_PIXEL)
		}
	})
})
