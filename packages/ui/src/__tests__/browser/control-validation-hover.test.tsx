import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Input } from '../../components/input'
import { present, renderUI } from '../helpers'

/**
 * A framed control keeps its validation ring under the pointer, in both modes.
 *
 * The neutral hover ring of `kasane.layers` has a dark twin. Tailwind emits a `dark:` class
 * after the `has-[[data-invalid]]:hover:` class, and the two have the same specificity. So in
 * dark mode the gray hover ring replaced the red ring of an invalid control. The neutral hover
 * now skips each validation state, like the focus ring.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
describe('the validation ring of a framed control under the pointer (real browser)', () => {
	afterEach(() => {
		document.documentElement.classList.remove('dark')
	})

	async function ringBeforeAndAfterHover(dark: boolean) {
		if (dark) document.documentElement.classList.add('dark')

		const { container } = renderUI(<Input aria-label="Email" invalid />)

		const frame = present(container.querySelector('[data-slot="control-frame"]'), 'control frame')

		const before = getComputedStyle(frame).boxShadow

		await userEvent.hover(frame)

		return { before, after: getComputedStyle(frame).boxShadow }
	}

	it('keeps the red ring on hover in light mode', async () => {
		const { before, after } = await ringBeforeAndAfterHover(false)

		expect(after).toBe(before)
	})

	it('keeps the red ring on hover in dark mode', async () => {
		const { before, after } = await ringBeforeAndAfterHover(true)

		expect(after).toBe(before)
	})

	/** The neutral hover still exists. A guard that suppressed it everywhere would pass the two above. */
	it('still darkens the ring of a control with no validation state', async () => {
		const { container } = renderUI(<Input aria-label="Email" />)

		const frame = present(container.querySelector('[data-slot="control-frame"]'), 'control frame')

		const before = getComputedStyle(frame).boxShadow

		await userEvent.hover(frame)

		expect(getComputedStyle(frame).boxShadow).not.toBe(before)
	})
})
