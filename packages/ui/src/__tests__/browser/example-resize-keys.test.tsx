import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { ExampleFrame } from '../../docs/kit/example.tsx'
import type { ExampleMeta } from '../../docs/plugin/examples.ts'
import { getSlot, present, renderUI, screen } from '../helpers'
import { nextPaint } from '../helpers/frames'
import { holdDir } from './helpers/root-state'

const META: ExampleMeta = { title: 'Basic', id: 'basic', code: () => new Promise(() => {}) }

/**
 * The frame of a docs example has a window splitter on its end border, so a
 * keyboard reader can resize the frame (WCAG 2.1.1). The frame stays at its
 * start edge, so the arrow that points to the start shrinks it: Left in a
 * left-to-right page, and Right in a right-to-left page.
 *
 * Rides the real browser because the direction comes from the computed
 * `direction`, and the size comes from the layout.
 */
describe('ExampleFrame resize keys (real browser)', () => {
	for (const dir of ['ltr', 'rtl'] as const) {
		const shrink = dir === 'ltr' ? '{ArrowLeft}' : '{ArrowRight}'

		const grow = dir === 'ltr' ? '{ArrowRight}' : '{ArrowLeft}'

		it(`shrinks the frame with the arrow to the start, and grows it with the other (${dir})`, async () => {
			holdDir(dir)

			const { container } = renderUI(
				<div style={{ width: 800 }}>
					<ExampleFrame meta={META}>
						<span>Instance</span>
					</ExampleFrame>
				</div>,
			)

			await nextPaint()

			const frame = present(getSlot(container, 'example-resize').parentElement, 'the example frame')

			const splitter = screen.getByRole('separator', { name: 'Resize example width' })

			const start = frame.getBoundingClientRect().width

			splitter.focus()

			await userEvent.keyboard(shrink)

			const shrunk = frame.getBoundingClientRect().width

			expect(shrunk).toBeLessThan(start)

			await userEvent.keyboard(grow)

			expect(frame.getBoundingClientRect().width).toBeGreaterThan(shrunk)
		})
	}
})
