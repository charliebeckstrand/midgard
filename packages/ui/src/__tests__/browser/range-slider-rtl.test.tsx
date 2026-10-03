import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { RangeSlider, Slider } from '../../components/slider'
import { allBySlot, getSlot, present, renderUI } from '../helpers'
import { PIXEL } from '../helpers/geometry/tolerance'

/**
 * A `RangeSlider` mirrors in a right-to-left layout, as the native input of `Slider` does.
 *
 * Before, the thumbs had a physical `left: %`, the pointer read the value from the left edge, and
 * `ArrowRight` always stepped up. A `Slider` next to it mirrored, so the two sliders disagreed. Now
 * the thumbs and the fill sit at `inset-inline-start`, the pointer reads the value from the right
 * edge, and the horizontal arrows go through `logicalArrowKey`.
 *
 * Rides the real browser because the slider reads the computed `direction`, which jsdom does not
 * resolve from a `dir` attribute.
 */
describe('RangeSlider in right-to-left (real browser)', () => {
	const renderIn = (dir: 'ltr' | 'rtl') => {
		const { container } = renderUI(
			<div dir={dir}>
				<RangeSlider defaultValue={[40, 60]} />
				<Slider aria-label="Single" defaultValue={50} />
			</div>,
		)

		const [lo, hi] = allBySlot(container, 'slider-range-thumb')

		return {
			root: getSlot(container, 'slider-range'),
			track: getSlot(container, 'slider-range-track'),
			lo: present(lo, 'the start thumb'),
			hi: present(hi, 'the end thumb'),
			single: present(container.querySelector('input[type="range"]'), 'the Slider input'),
		}
	}

	for (const dir of ['ltr', 'rtl'] as const) {
		/** The physical key that steps a value up. */
		const up = dir === 'ltr' ? '{ArrowRight}' : '{ArrowLeft}'

		const down = dir === 'ltr' ? '{ArrowLeft}' : '{ArrowRight}'

		describe(dir, () => {
			it('steps a thumb the same way as the Slider for each horizontal arrow', async () => {
				const { lo, single } = renderIn(dir)

				lo.focus()

				await userEvent.keyboard(up)

				expect(lo).toHaveAttribute('aria-valuenow', '41')

				await userEvent.keyboard(down)

				await userEvent.keyboard(down)

				expect(lo).toHaveAttribute('aria-valuenow', '39')

				single.focus()

				await userEvent.keyboard(up)

				expect(single).toHaveValue('51')

				await userEvent.keyboard(down)

				await userEvent.keyboard(down)

				expect(single).toHaveValue('49')
			})

			it('places the start thumb at the inline start of the track', () => {
				const { track, lo, hi } = renderIn(dir)

				const rect = track.getBoundingClientRect()

				const center = (thumb: HTMLElement) => {
					const box = thumb.getBoundingClientRect()

					return box.left + box.width / 2
				}

				/** The x of `ratio` along the track from its inline start. */
				const at = (ratio: number) =>
					dir === 'ltr' ? rect.left + ratio * rect.width : rect.right - ratio * rect.width

				expect(center(lo)).toBeNear(at(0.4), PIXEL)

				expect(center(hi)).toBeNear(at(0.6), PIXEL)
			})

			it('reads a pointer press from the inline start of the track', async () => {
				const { root, track, lo, hi } = renderIn(dir)

				const rootBox = root.getBoundingClientRect()

				const rect = track.getBoundingClientRect()

				// A press a tenth of the way along the track from its left edge. That is the
				// value 10 in a left-to-right layout, and the value 90 in a right-to-left one.
				await userEvent.click(root, {
					position: {
						x: rect.left + rect.width * 0.1 - rootBox.left,
						y: rect.top + rect.height / 2 - rootBox.top,
					},
				})

				if (dir === 'ltr') {
					expect(lo).toHaveAttribute('aria-valuenow', '10')

					expect(hi).toHaveAttribute('aria-valuenow', '60')
				} else {
					expect(lo).toHaveAttribute('aria-valuenow', '40')

					expect(hi).toHaveAttribute('aria-valuenow', '90')
				}
			})
		})
	}
})
