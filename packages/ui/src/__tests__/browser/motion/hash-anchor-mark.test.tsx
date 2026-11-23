import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { HashAnchor } from '../../../docs/kit/hash-anchor.tsx'
import { ReducedMotionContext } from '../../../primitives/reduced-motion/context'
import { renderUI, screen } from '../../helpers'
import { frame, nextPaint } from '../../helpers/frames'

/** The `#` mark of the link: its width and its opacity. */
function readMark(link: HTMLElement) {
	const style = getComputedStyle(link.firstElementChild as HTMLElement)

	return { width: Number.parseFloat(style.width), opacity: Number(style.opacity) }
}

/** Whether the link draws its underline. */
function isUnderlined(link: HTMLElement) {
	return getComputedStyle(link).textDecorationLine === 'underline'
}

/**
 * A button, then a heading with a hash anchor. The id of the heading is not
 * the target of the link, so a click does not move the focus to the target.
 */
async function renderAnchor({ reveal = false, reduced = false } = {}) {
	renderUI(
		<ReducedMotionContext value={reduced}>
			<button type="button">Before</button>
			<h2>
				<HashAnchor to="playground" reveal={reveal}>
					Playground
				</HashAnchor>
			</h2>
		</ReducedMotionContext>,
	)

	await nextPaint()

	return screen.getByRole('link', { name: 'Playground' })
}

/**
 * The hash anchor of a docs heading. The `#` mark shows at rest. Keyboard focus
 * and hover draw the underline. A focus that does not match `:focus-visible`,
 * such as the focus of a click, does not draw it.
 */
describe('HashAnchor', () => {
	it('shows the mark at rest, and keeps it out of the name and the text', async () => {
		const link = await renderAnchor()

		expect(link.getAttribute('href')).toBe('#playground')
		expect(screen.getByRole('heading').textContent).toBe('Playground')
		expect(readMark(link).width).toBeGreaterThan(0)
		expect(readMark(link).opacity).toBe(1)
		expect(isUnderlined(link)).toBe(false)
	})

	it('draws the underline on keyboard focus and hides it on blur', async () => {
		const link = await renderAnchor()

		screen.getByRole('button').focus()

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(link)
		expect(isUnderlined(link)).toBe(true)

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		expect(isUnderlined(link)).toBe(false)
	})

	it('draws no underline for the focus of a click', async () => {
		const link = await renderAnchor()

		await userEvent.click(link)

		// The pointer leaves, so only the focus can draw the underline.
		await userEvent.hover(screen.getByRole('button'))

		expect(document.activeElement).toBe(link)
		expect(link.matches(':focus-visible')).toBe(false)
		expect(isUnderlined(link)).toBe(false)
	})

	it('draws the underline while a mouse hovers the link', async () => {
		const link = await renderAnchor()

		await userEvent.hover(link)

		expect(isUnderlined(link)).toBe(true)

		await userEvent.hover(screen.getByRole('button'))

		expect(isUnderlined(link)).toBe(false)
	})
})

/**
 * Real-Motion check of a hash anchor with `reveal`, as the name of a prop.
 * Keyboard focus and hover open the slot of the `#` mark and fade the mark in.
 * A blur and a leave hide the mark again. A focus that does not match
 * `:focus-visible`, such as the focus of a click, does not show the mark.
 */
describe('HashAnchor with reveal (real Motion)', () => {
	it('shows the mark on keyboard focus, and keeps it out of the name and the text', async () => {
		const link = await renderAnchor({ reveal: true })

		expect(link.getAttribute('href')).toBe('#playground')
		expect(screen.getByRole('heading').textContent).toBe('Playground')
		expect(readMark(link)).toEqual({ width: 0, opacity: 0 })

		screen.getByRole('button').focus()

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(link)

		await expect.poll(() => readMark(link).opacity).toBe(1)

		expect(readMark(link).width).toBeGreaterThan(0)

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		await expect.poll(() => readMark(link)).toEqual({ width: 0, opacity: 0 })
	})

	it('shows no mark for the focus of a click', async () => {
		const link = await renderAnchor({ reveal: true })

		await userEvent.click(link)

		// The pointer leaves, so only the focus can show the mark.
		await userEvent.hover(screen.getByRole('button'))

		expect(document.activeElement).toBe(link)
		expect(link.matches(':focus-visible')).toBe(false)

		await expect.poll(() => readMark(link)).toEqual({ width: 0, opacity: 0 })
	})

	it('shows the mark while a mouse hovers the link', async () => {
		const link = await renderAnchor({ reveal: true })

		await userEvent.hover(link)

		await expect.poll(() => readMark(link).opacity).toBe(1)

		expect(readMark(link).width).toBeGreaterThan(0)

		await userEvent.hover(screen.getByRole('button'))

		await expect.poll(() => readMark(link)).toEqual({ width: 0, opacity: 0 })
	})

	it('opens the slot at once under reduced motion, while the mark fades in', async () => {
		const link = await renderAnchor({ reveal: true, reduced: true })

		// The keys move the focus to the link and back to the button, and the mark
		// closes. A script focus after a keyboard focus matches `:focus-visible`,
		// so the frames start in the task of the focus.
		screen.getByRole('button').focus()

		await userEvent.keyboard('{Tab}{Shift>}{Tab}{/Shift}')

		await expect.poll(() => readMark(link)).toEqual({ width: 0, opacity: 0 })

		link.focus()

		expect(link.matches(':focus-visible')).toBe(true)

		// The width of each frame of the fade, after the slot starts to open. The
		// fade can start one frame before the width lands.
		const widths: number[] = []

		for (let mark = readMark(link); mark.opacity < 1; mark = readMark(link)) {
			if (mark.width > 0) widths.push(mark.width)

			await frame()
		}

		const { width } = readMark(link)

		// A tween of the width gives a frame with a part of the width.
		expect(width).toBeGreaterThan(0)
		expect(widths.length).toBeGreaterThan(0)
		expect(widths.every((value) => value === width)).toBe(true)
	})
})
