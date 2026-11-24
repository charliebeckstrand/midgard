import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ColorPanel } from '../../components/color'
import { RangeSlider } from '../../components/slider'
import { ExampleFrame } from '../../docs/kit/example.tsx'
import type { ExampleMeta } from '../../docs/plugin/examples.ts'
import { getSlot, renderUI, screen } from '../helpers'
import { nextPaint } from '../helpers/frames'

const META: ExampleMeta = { title: 'Basic', id: 'basic', code: () => new Promise(() => {}) }

/**
 * A press on a drag surface moves the focus by script to the control that the
 * keys operate. A script focus shows the focus ring when the last focus came
 * from a key, or when no focus came before it, as at the load of the page.
 * The focus of a press must show no ring in each case.
 *
 * Each case first moves the focus with Tab to a button before the surface, so
 * the press follows a key focus on another element. That gives the same ring
 * as the load of the page, and in each order of the cases.
 *
 * Rides the real browser because jsdom does not model `:focus-visible`, and
 * its stub reads the last input, which is the press.
 */
describe('the focus that a press on a drag surface moves (real browser)', () => {
	async function pressAfterKeyFocus(ui: ReactNode, surface: string): Promise<Element | null> {
		const { container } = renderUI(
			<div style={{ width: 800 }}>
				<button type="button">Start</button>
				<button type="button">Before</button>
				{ui}
			</div>,
		)

		await nextPaint()

		screen.getByRole('button', { name: 'Start' }).focus()

		await userEvent.tab()

		const before = screen.getByRole('button', { name: 'Before' })

		expect(document.activeElement).toBe(before)

		expect(before.matches(':focus-visible')).toBe(true)

		await userEvent.click(getSlot(container, surface))

		return document.activeElement
	}

	it('shows no ring on the width splitter of a docs example, and no size after the press', async () => {
		const focused = await pressAfterKeyFocus(
			<ExampleFrame meta={META}>
				<button type="button">Instance</button>
			</ExampleFrame>,
			'example-resize',
		)

		expect(focused).toHaveAccessibleName('Resize example width')

		expect(focused?.matches(':focus-visible')).toBe(false)

		await nextPaint()

		expect(document.querySelector('[data-slot="example-size"]')).toBeNull()
	})

	it('shows no ring on a ColorPanel area', async () => {
		const focused = await pressAfterKeyFocus(<ColorPanel />, 'color-area')

		expect(focused).toHaveAttribute('data-slot', 'color-area')

		expect(focused?.matches(':focus-visible')).toBe(false)
	})

	it('shows no ring on a RangeSlider thumb', async () => {
		const focused = await pressAfterKeyFocus(
			<RangeSlider defaultValue={[20, 80]} />,
			'slider-range-track',
		)

		expect(focused).toHaveAttribute('data-slot', 'slider-range-thumb')

		expect(focused?.matches(':focus-visible')).toBe(false)
	})
})
